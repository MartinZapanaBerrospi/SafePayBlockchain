from flask import Blueprint, request, jsonify
from .models import db, Usuario, Cuenta, Transaccion, SolicitudPago, Dispositivo, Tarjeta
import jwt as pyjwt
import datetime
from flask import current_app
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization
import base64
from blockchain import Blockchain
from .chatbot_intent_llm import classify_intent_llm
from mnemonic import Mnemonic

blockchain = Blockchain()

def sync_blockchain_balances():
    """Sincroniza los saldos de la blockchain con los de la base de datos."""
    from .models import Cuenta
    cuentas = Cuenta.query.all()
    blockchain.balances = {str(c.id_cuenta): float(c.saldo) for c in cuentas}

bp = Blueprint('routes', __name__)


# --- LOGIN ---
@bp.route('/login', methods=['POST'])
def login():
    data = request.json
    nombre = data.get('nombre')
    contrasena = data.get('contrasena')
    if not nombre or not contrasena:
        return jsonify({'mensaje': 'Nombre y contraseña requeridos'}), 400
    usuario = Usuario.query.filter_by(nombre=nombre).first()
    if usuario and usuario.check_contrasena(contrasena):
        # Generar token JWT
        secret = str(current_app.config.get('SECRET_KEY', 'clave-secreta'))
        exp = int((datetime.datetime.utcnow() + datetime.timedelta(hours=12)).timestamp())
        token = pyjwt.encode({
            'id_usuario': usuario.id_usuario,
            'exp': exp
        }, secret, algorithm='HS256')
        if isinstance(token, bytes):
            token = token.decode('utf-8')
        # --- NUEVO: entregar clave privada cifrada y parámetros ---
        from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        import os, base64
        salt = os.urandom(16)
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100_000,
        )
        key = kdf.derive(contrasena.encode())
        iv = os.urandom(12)
        aesgcm = AESGCM(key)
        priv_bytes = usuario.clave_privada.encode() if isinstance(usuario.clave_privada, str) else usuario.clave_privada
        priv_encrypted = aesgcm.encrypt(iv, priv_bytes, None)  # ciphertext + tag
        # Separar ciphertext y tag
        ciphertext = priv_encrypted[:-16]
        tag = priv_encrypted[-16:]
        return jsonify({
            'token': token,
            'id_usuario': usuario.id_usuario,
            'privateKeyEnc': base64.urlsafe_b64encode(ciphertext).decode(),
            'privateKeyIv': base64.urlsafe_b64encode(iv).decode(),
            'privateKeySalt': base64.urlsafe_b64encode(salt).decode(),
            'privateKeyTag': base64.urlsafe_b64encode(tag).decode(),
        })
    return jsonify({'mensaje': 'Credenciales inválidas'}), 401


# --- PAGAR SOLICITUD ---
@bp.route('/solicitudes/<int:id_solicitud>/pagar', methods=['POST'])
def pagar_solicitud(id_solicitud):
    data = request.json
    id_cuenta_origen = data.get('id_cuenta_origen')
    descripcion = data.get('descripcion')
    latitud = data.get('latitud')
    longitud = data.get('longitud')
    nombre_dispositivo = data.get('nombre_dispositivo', 'Dispositivo desconocido')
    ip_registro = request.remote_addr
    if not id_cuenta_origen:
        return jsonify({'mensaje': 'Debe indicar la cuenta de origen'}), 400

    solicitud = SolicitudPago.query.get_or_404(id_solicitud)
    cuenta_origen = Cuenta.query.get(id_cuenta_origen)
    cuenta_destino = Cuenta.query.filter_by(id_usuario=solicitud.solicitante, activa=True).first()

    if not cuenta_origen:
        return jsonify({'mensaje': 'Cuenta de origen no encontrada'}), 404
    if not cuenta_destino:
        return jsonify({'mensaje': 'Cuenta de destino no encontrada para el solicitante'}), 404
    if not cuenta_origen.activa:
        return jsonify({'mensaje': 'La cuenta de origen no está activa'}), 400
    if not cuenta_destino.activa:
        return jsonify({'mensaje': 'La cuenta de destino no está activa'}), 400
    if float(cuenta_origen.saldo) < float(solicitud.monto):
        return jsonify({'mensaje': 'Saldo insuficiente en la cuenta de origen'}), 400
    if solicitud.estado != 'pendiente':
        return jsonify({'mensaje': 'La solicitud ya fue procesada'}), 400

    # Crear registro de dispositivo del que realiza el pago
    dispositivo = Dispositivo(
        id_usuario=cuenta_origen.id_usuario,
        nombre=nombre_dispositivo,
        ip_registro=ip_registro,
        latitud=latitud,
        longitud=longitud
    )
    db.session.add(dispositivo)
    db.session.flush()  # Para obtener id_dispositivo

    # Realizar el pago y actualizar saldos
    nuevo_saldo = float(cuenta_origen.saldo) - float(solicitud.monto)
    cuenta_origen.saldo = nuevo_saldo
    cuenta_destino.saldo = float(cuenta_destino.saldo) + float(solicitud.monto)
    solicitud.estado = 'aceptada'
    # Crear la transacción antes de agregarla
    transaccion = Transaccion(
        cuenta_origen=cuenta_origen.id_cuenta,
        cuenta_destino=cuenta_destino.id_cuenta,
        monto=solicitud.monto,
        descripcion=descripcion or f'Pago de solicitud #{solicitud.id_solicitud}',
        estado='completada'
    )
    db.session.add(transaccion)
    db.session.flush()  # Para obtener id_transaccion
    # Asociar dispositivo a transacción
    dispositivo.id_transaccion = transaccion.id_transaccion
    db.session.commit()
    return jsonify({
        'mensaje': 'Pago realizado y transacción registrada',
        'nuevo_saldo': str(nuevo_saldo),
        'id_cuenta': cuenta_origen.id_cuenta
    }), 200


# --- PAGAR SOLICITUD CON FIRMA DIGITAL ---
def actualizar_saldo_cuenta(cuenta, nuevo_saldo):
    """Actualiza y persiste el saldo de una cuenta."""
    cuenta.saldo = float(nuevo_saldo)
    db.session.add(cuenta)
    db.session.flush()  # Asegura que el cambio se refleje en la sesión


@bp.route('/solicitudes/<int:id_solicitud>/pagar_firma', methods=['POST'])
def pagar_solicitud_firma(id_solicitud):
    print("[DEBUG] Entrando a pagar_solicitud_firma")
    data = request.json
    id_cuenta_origen = data.get('id_cuenta_origen')
    firma = data.get('firma')  # Firma digital enviada por el cliente (base64)
    if not id_cuenta_origen or not firma:
        return jsonify({'mensaje': 'Debe indicar la cuenta de origen y la firma digital'}), 400

    solicitud = SolicitudPago.query.get_or_404(id_solicitud)
    cuenta_origen = Cuenta.query.get(id_cuenta_origen)
    cuenta_destino = Cuenta.query.filter_by(id_usuario=solicitud.solicitante, activa=True).first()
    usuario = Usuario.query.get(cuenta_origen.id_usuario) if cuenta_origen else None

    if not cuenta_origen:
        return jsonify({'mensaje': 'Cuenta de origen no encontrada'}), 404
    if not cuenta_destino:
        return jsonify({'mensaje': 'Cuenta de destino no encontrada para el destinatario'}), 404
    if not cuenta_origen.activa:
        return jsonify({'mensaje': 'La cuenta de origen no está activa'}), 400
    if not cuenta_destino.activa:
        return jsonify({'mensaje': 'La cuenta de destino no está activa'}), 400
    if cuenta_origen.saldo < solicitud.monto:
        return jsonify({'mensaje': 'Saldo insuficiente en la cuenta de origen'}), 400
    if solicitud.estado != 'pendiente':
        return jsonify({'mensaje': 'La solicitud ya fue procesada'}), 400
    if not usuario or not usuario.clave_publica:
        return jsonify({'mensaje': 'El usuario no tiene clave pública registrada'}), 400

    # Construir el mensaje a firmar (debe ser igual al firmado por el cliente)
    mensaje = f"{id_solicitud}:{id_cuenta_origen}:{solicitud.monto}"
    mensaje_bytes = mensaje.encode('utf-8')
    firma_bytes = base64.b64decode(firma)

    # LOGS DE DEPURACIÓN
    print("\n--- DEPURACIÓN FIRMA DIGITAL ---")
    print("Mensaje a firmar:", mensaje)
    print("Mensaje bytes:", mensaje_bytes)
    print("Firma recibida (base64):", firma)
    print("Firma recibida (hex):", firma_bytes.hex())
    print("Clave pública utilizada (PEM):\n", usuario.clave_publica)
    print("--- FIN DEPURACIÓN ---\n")

    # Cargar la clave pública
    pubkey_data = usuario.clave_publica
    if isinstance(pubkey_data, str):
        pubkey_data = pubkey_data.encode('utf-8')
    public_key = serialization.load_pem_public_key(pubkey_data)
    try:
        public_key.verify(
            firma_bytes,
            mensaje_bytes,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=32  # Debe coincidir con el saltLength del frontend
            ),
            hashes.SHA256()
        )
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({'mensaje': 'Firma digital inválida', 'error': f'{type(e).__name__}: {str(e)}'}), 400

    # Sincroniza los saldos antes de registrar en blockchain
    sync_blockchain_balances()
    try:
        blockchain.add_payment(
            sender=str(cuenta_origen.id_cuenta),
            receiver=str(cuenta_destino.id_cuenta),
            amount=float(solicitud.monto)
        )
    except Exception as e:
        return jsonify({'mensaje': 'Error en blockchain', 'error': str(e)}), 500

    # LOGS DE DEPURACIÓN DE SALDOS
    print(f"[DEBUG] Saldo cuenta origen antes: {cuenta_origen.saldo}")
    print(f"[DEBUG] Saldo cuenta destino antes: {cuenta_destino.saldo}")

    # Realizar el pago y actualizar saldos usando la función exclusiva
    nuevo_saldo_origen = float(cuenta_origen.saldo) - float(solicitud.monto)
    nuevo_saldo_destino = float(cuenta_destino.saldo) + float(solicitud.monto)
    actualizar_saldo_cuenta(cuenta_origen, nuevo_saldo_origen)
    actualizar_saldo_cuenta(cuenta_destino, nuevo_saldo_destino)
    print(f"[DEBUG] Saldo cuenta origen después: {cuenta_origen.saldo}")
    print(f"[DEBUG] Saldo cuenta destino después: {cuenta_destino.saldo}")
    solicitud.estado = 'aceptada'
    # Guardar transacción y asociar dispositivo si se envía
    transaccion = Transaccion(
        cuenta_origen=cuenta_origen.id_cuenta,
        cuenta_destino=cuenta_destino.id_cuenta,
        monto=solicitud.monto,
        descripcion=f'Pago de solicitud #{solicitud.id_solicitud} (firma digital)',
        estado='completada'
    )
    db.session.add(transaccion)
    db.session.commit()
    # Asociar dispositivo si viene en el request
    id_dispositivo = data.get('id_dispositivo')
    latitud = data.get('latitud')
    longitud = data.get('longitud')
    nombre_dispositivo = data.get('nombre_dispositivo')
    dispositivo = None
    if id_dispositivo:
        dispositivo = Dispositivo.query.get(id_dispositivo)
    if not dispositivo:
        # Buscar si ya existe un dispositivo para este usuario y nombre
        dispositivo = Dispositivo.query.filter_by(id_usuario=cuenta_origen.id_usuario, nombre=nombre_dispositivo).first()
    if not dispositivo:
        # Crear nuevo dispositivo automáticamente
        dispositivo = Dispositivo(
            id_usuario=cuenta_origen.id_usuario,
            nombre=nombre_dispositivo or 'Desconocido',
            latitud=latitud,
            longitud=longitud
        )
        db.session.add(dispositivo)
        db.session.flush()
    # Asociar transacción
    dispositivo.id_transaccion = transaccion.id_transaccion
    if latitud is not None:
        dispositivo.latitud = latitud
    if longitud is not None:
        dispositivo.longitud = longitud
    db.session.commit()
    return jsonify({
        'mensaje': 'Pago realizado, firma digital verificada y transacción registrada',
        'nuevo_saldo': str(cuenta_origen.saldo),
        'id_cuenta': cuenta_origen.id_cuenta
    }), 200


# --- TRANSFERENCIA CON FIRMA DIGITAL ---
@bp.route('/transferencia_firma', methods=['POST'])
def transferencia_firma():
    data = request.json
    id_usuario_destino = data.get('id_usuario_destino')
    id_cuenta_origen = data.get('id_cuenta_origen')
    monto = data.get('monto')
    descripcion = data.get('descripcion')
    firma = data.get('firma')
    if not id_usuario_destino or not id_cuenta_origen or not monto or not descripcion or not firma:
        return jsonify({'mensaje': 'Faltan datos para la transferencia'}), 400

    cuenta_origen = Cuenta.query.get(id_cuenta_origen)
    cuenta_destino = Cuenta.query.filter_by(id_usuario=id_usuario_destino, activa=True).first()
    usuario = Usuario.query.get(cuenta_origen.id_usuario) if cuenta_origen else None
    if not cuenta_origen:
        return jsonify({'mensaje': 'Cuenta de origen no encontrada'}), 404
    if not cuenta_destino:
        return jsonify({'mensaje': 'Cuenta de destino no encontrada para el usuario destino'}), 404
    if not cuenta_origen.activa:
        return jsonify({'mensaje': 'La cuenta de origen no está activa'}), 400
    if not cuenta_destino.activa:
        return jsonify({'mensaje': 'La cuenta de destino no está activa'}), 400
    if float(cuenta_origen.saldo) < float(monto):
        return jsonify({'mensaje': 'Saldo insuficiente en la cuenta de origen'}), 400
    if not usuario or not usuario.clave_publica:
        return jsonify({'mensaje': 'El usuario no tiene clave pública registrada'}), 400

    # Construir el mensaje a firmar (igual que en el frontend)
    monto_fmt = f"{float(monto):.2f}"
    mensaje = f"{id_usuario_destino}:{id_cuenta_origen}:{monto_fmt}:{descripcion}"
    mensaje_bytes = mensaje.encode('utf-8')
    firma_bytes = base64.b64decode(firma)

    # LOGS DE DEPURACIÓN
    print("\n--- DEPURACIÓN FIRMA DIGITAL TRANSFERENCIA ---")
    print("Mensaje a firmar:", mensaje)
    print("Mensaje bytes:", mensaje_bytes)
    print("Firma recibida (base64):", firma)
    print("Firma recibida (hex):", firma_bytes.hex())
    print("Clave pública utilizada (PEM):\n", usuario.clave_publica)
    print("--- FIN DEPURACIÓN ---\n")

    # Cargar la clave pública
    pubkey_data = usuario.clave_publica
    if isinstance(pubkey_data, str):
        pubkey_data = pubkey_data.encode('utf-8')
    public_key = serialization.load_pem_public_key(pubkey_data)
    try:
        public_key.verify(
            firma_bytes,
            mensaje_bytes,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=32
            ),
            hashes.SHA256()
        )
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({'mensaje': 'Firma digital inválida', 'error': f'{type(e).__name__}: {str(e)}'}), 400

    # Sincroniza los saldos antes de registrar en blockchain
    sync_blockchain_balances()
    try:
        blockchain.add_payment(
            sender=str(cuenta_origen.id_cuenta),
            receiver=str(cuenta_destino.id_cuenta),
            amount=float(monto)
        )
    except Exception as e:
        return jsonify({'mensaje': 'Error en blockchain', 'error': str(e)}), 500

    # Actualizar saldos
    nuevo_saldo_origen = float(cuenta_origen.saldo) - float(monto)
    nuevo_saldo_destino = float(cuenta_destino.saldo) + float(monto)
    actualizar_saldo_cuenta(cuenta_origen, nuevo_saldo_origen)
    actualizar_saldo_cuenta(cuenta_destino, nuevo_saldo_destino)
    # Guardar transacción y asociar dispositivo si se envía
    transaccion = Transaccion(
        cuenta_origen=cuenta_origen.id_cuenta,
        cuenta_destino=cuenta_destino.id_cuenta,
        monto=monto,
        descripcion=f'Transferencia a usuario {id_usuario_destino}: {descripcion}',
        estado='completada'
    )
    db.session.add(transaccion)
    db.session.commit()
    id_dispositivo = data.get('id_dispositivo')
    latitud = data.get('latitud')
    longitud = data.get('longitud')
    nombre_dispositivo = data.get('nombre_dispositivo')
    dispositivo = None
    if id_dispositivo:
        dispositivo = Dispositivo.query.get(id_dispositivo)
    if not dispositivo:
        # Buscar si ya existe un dispositivo para este usuario y nombre
        dispositivo = Dispositivo.query.filter_by(id_usuario=cuenta_origen.id_usuario, nombre=nombre_dispositivo).first()
    if not dispositivo:
        # Crear nuevo dispositivo automáticamente
        dispositivo = Dispositivo(
            id_usuario=cuenta_origen.id_usuario,
            nombre=nombre_dispositivo or 'Desconocido',
            latitud=latitud,
            longitud=longitud
        )
        db.session.add(dispositivo)
        db.session.flush()
    # Asociar transacción
    dispositivo.id_transaccion = transaccion.id_transaccion
    if latitud is not None:
        dispositivo.latitud = latitud
    if longitud is not None:
        dispositivo.longitud = longitud
    db.session.commit()
    return jsonify({
        'mensaje': 'Transferencia realizada, firma digital verificada y transacción registrada',
        'nuevo_saldo': str(cuenta_origen.saldo),
        'id_cuenta': cuenta_origen.id_cuenta
    }), 200


# --- BUSCAR USUARIO ---
@bp.route('/usuarios/buscar', methods=['GET'])
def buscar_usuario():
    nombre = request.args.get('nombre')
    if not nombre:
        return jsonify({'mensaje': 'Falta el nombre'}), 400
    # Buscar ignorando mayúsculas/minúsculas y espacios
    usuario = Usuario.query.filter(Usuario.nombre.ilike(nombre.strip())).first()
    if not usuario:
        return jsonify({'mensaje': 'Usuario no encontrado'}), 404
    return jsonify({'id_usuario': usuario.id_usuario, 'nombre': usuario.nombre}), 200


# --- AUXILIAR: Crear cuenta para usuario ---
def crear_cuenta_usuario(id_usuario):
    cuenta = Cuenta(
        id_usuario=id_usuario,
        saldo=0.00,
        moneda='USD',
        activa=True
    )
    db.session.add(cuenta)
    db.session.commit()
    return cuenta


# --- REGISTRAR USUARIO ---
@bp.route('/usuarios/registrar', methods=['POST'])
def registrar_usuario():
    data = request.json
    nombre = data.get('nombre')
    correo = data.get('correo')
    telefono = data.get('telefono')
    contrasena = data.get('contrasena')
    if not nombre or not correo or not contrasena:
        return jsonify({'mensaje': 'Faltan datos obligatorios'}), 400
    if Usuario.query.filter_by(nombre=nombre).first() or Usuario.query.filter_by(correo=correo).first():
        return jsonify({'mensaje': 'El usuario o correo ya existe'}), 400
    # Generar frase de recuperación (mnemonic)
    mnemo = Mnemonic('english')
    frase_recuperacion = mnemo.generate(strength=128)  # 12 palabras
    # Derivar clave privada desde la frase
    seed = mnemo.to_seed(frase_recuperacion)
    from hashlib import sha256
    clave_privada = sha256(seed).digest()
    usuario = Usuario(
        nombre=nombre,
        correo=correo,
        telefono=telefono,
        clave_privada=clave_privada
    )
    usuario.set_contrasena(contrasena)
    db.session.add(usuario)
    db.session.commit()
    db.session.refresh(usuario)
    # Crear cuenta asociada
    try:
        cuenta = crear_cuenta_usuario(usuario.id_usuario)
    except Exception as e:
        return jsonify({'mensaje': 'Usuario creado pero error al crear la cuenta', 'error': str(e)}), 500
    # Cifrar la clave privada con la contraseña del usuario
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    import os, base64
    salt = os.urandom(16)
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100_000,
    )
    key = kdf.derive(contrasena.encode())
    iv = os.urandom(12)
    aesgcm = AESGCM(key)
    priv_encrypted = aesgcm.encrypt(iv, clave_privada, None)
    ciphertext = priv_encrypted[:-16]
    tag = priv_encrypted[-16:]
    return jsonify({
        'mensaje': 'Usuario creado correctamente',
        'id_usuario': usuario.id_usuario,
        'frase_recuperacion': frase_recuperacion,
        'privateKeyEnc': base64.urlsafe_b64encode(ciphertext).decode(),
        'privateKeyIv': base64.urlsafe_b64encode(iv).decode(),
        'privateKeySalt': base64.urlsafe_b64encode(salt).decode(),
        'privateKeyTag': base64.urlsafe_b64encode(tag).decode(),
    }), 201


@bp.route('/usuarios/recuperar_clave', methods=['POST'])
def recuperar_clave():
    data = request.json
    frase_recuperacion = data.get('frase_recuperacion')
    nueva_contrasena = data.get('nueva_contrasena')
    if not frase_recuperacion or not nueva_contrasena:
        return jsonify({'mensaje': 'Faltan datos'}), 400
    mnemo = Mnemonic('english')
    if not mnemo.check(frase_recuperacion):
        return jsonify({'mensaje': 'Frase de recuperación inválida'}), 400
    seed = mnemo.to_seed(frase_recuperacion)
    from hashlib import sha256
    clave_privada = sha256(seed).digest()
    # Cifrar la clave privada con la nueva contraseña
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    import os, base64
    salt = os.urandom(16)
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100_000,
    )
    key = kdf.derive(nueva_contrasena.encode())
    iv = os.urandom(12)
    aesgcm = AESGCM(key)
    priv_encrypted = aesgcm.encrypt(iv, clave_privada, None)
    ciphertext = priv_encrypted[:-16]
    tag = priv_encrypted[-16:]
    return jsonify({
        'privateKeyEnc': base64.urlsafe_b64encode(ciphertext).decode(),
        'privateKeyIv': base64.urlsafe_b64encode(iv).decode(),
        'privateKeySalt': base64.urlsafe_b64encode(salt).decode(),
        'privateKeyTag': base64.urlsafe_b64encode(tag).decode(),
        'mensaje': 'Clave privada recuperada y cifrada con la nueva contraseña.'
    }), 200


# --- TARJETAS ---
@bp.route('/usuarios/<int:id_usuario>/tarjetas', methods=['POST'])
def agregar_tarjeta(id_usuario):
    data = request.json
    numero_cuenta = data.get('numero_cuenta')
    fecha_vencimiento = data.get('fecha_vencimiento')
    cvv = data.get('cvv')
    if not numero_cuenta or not fecha_vencimiento or not cvv:
        return jsonify({'mensaje': 'Faltan datos de la tarjeta'}), 400
    tarjeta = Tarjeta(
        id_usuario=id_usuario,
        numero_cuenta=numero_cuenta,
        fecha_vencimiento=fecha_vencimiento,
        cvv=cvv
    )
    db.session.add(tarjeta)
    db.session.commit()
    return jsonify({'mensaje': 'Tarjeta agregada correctamente'}), 201

@bp.route('/usuarios/<int:id_usuario>/tarjetas', methods=['GET'])
def listar_tarjetas(id_usuario):
    tarjetas = Tarjeta.query.filter_by(id_usuario=id_usuario).all()
    return jsonify([
        {
            'id_tarjeta': t.id_tarjeta,
            'numero_cuenta': t.numero_cuenta[-4:],  # Solo últimos 4 dígitos
            'fecha_vencimiento': t.fecha_vencimiento
        } for t in tarjetas
    ])

@bp.route('/usuarios/<int:id_usuario>/tarjetas/<int:id_tarjeta>', methods=['DELETE'])
def eliminar_tarjeta(id_usuario, id_tarjeta):
    tarjeta = Tarjeta.query.filter_by(id_usuario=id_usuario, id_tarjeta=id_tarjeta).first()
    if not tarjeta:
        return jsonify({'mensaje': 'Tarjeta no encontrada'}), 404
    db.session.delete(tarjeta)
    db.session.commit()
    return jsonify({'mensaje': 'Tarjeta eliminada correctamente'}), 200


# --- DISPOSITIVOS ---
@bp.route('/dispositivos/<int:id_dispositivo>/ubicacion', methods=['PUT'])
def actualizar_ubicacion_dispositivo(id_dispositivo):
    data = request.json
    latitud = data.get('latitud')
    longitud = data.get('longitud')
    dispositivo = Dispositivo.query.get_or_404(id_dispositivo)
    if latitud is not None:
        dispositivo.latitud = latitud
    if longitud is not None:
        dispositivo.longitud = longitud
    db.session.commit()
    return jsonify({'mensaje': 'Ubicación actualizada'})

# --- ASOCIAR DISPOSITIVO A TRANSACCIÓN ---
@bp.route('/dispositivos/<int:id_dispositivo>/asociar_transaccion', methods=['PUT'])
def asociar_dispositivo_transaccion(id_dispositivo):
    data = request.json
    id_transaccion = data.get('id_transaccion')
    dispositivo = Dispositivo.query.get_or_404(id_dispositivo)
    dispositivo.id_transaccion = id_transaccion
    db.session.commit()
    return jsonify({'mensaje': 'Dispositivo asociado a transacción'})

# --- SOLICITUDES DE PAGO: FECHA DE VENCIMIENTO ---
@bp.route('/solicitudes/<int:id_solicitud>/vencimiento', methods=['PUT'])
def actualizar_vencimiento_solicitud(id_solicitud):
    data = request.json
    fecha_vencimiento = data.get('fecha_vencimiento')
    solicitud = SolicitudPago.query.get_or_404(id_solicitud)
    solicitud.fecha_vencimiento = fecha_vencimiento
    db.session.commit()
    return jsonify({'mensaje': 'Fecha de vencimiento actualizada'})

# --- CHATBOT ---
@bp.route('/chatbot', methods=['POST'])
def chatbot():
    from .chatbot_intent_model import classify_intent
    from .chatbot_intent_llm import classify_intent_llm
    data = request.json
    mensaje = data.get('mensaje', '')
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    print(f"[DEBUG] Token recibido: {token}")
    usuario = None
    if token:
        try:
            secret = str(current_app.config.get('SECRET_KEY', 'clave-secreta'))
            import jwt as pyjwt
            data_token = pyjwt.decode(token, secret, algorithms=['HS256'])
            print(f"[DEBUG] Decodificación JWT: {data_token}")
            id_usuario = data_token.get('id_usuario')
            usuario = Usuario.query.filter_by(id_usuario=id_usuario).first()
            print(f"[DEBUG] Usuario encontrado: {usuario}")
            # Obtener la cuenta principal del usuario
            usuario.cuenta = Cuenta.query.filter_by(id_usuario=id_usuario).first()
            print(f"[DEBUG] Cuenta encontrada: {usuario.cuenta}")
            # Obtener todas las transacciones donde la cuenta es origen o destino
            if usuario.cuenta:
                from sqlalchemy import or_
                usuario.transacciones = Transaccion.query.filter(
                    or_(Transaccion.cuenta_origen == usuario.cuenta.id_cuenta,
                        Transaccion.cuenta_destino == usuario.cuenta.id_cuenta)
                ).all()
            else:
                usuario.transacciones = []
            usuario.tarjetas = Tarjeta.query.filter_by(id_usuario=id_usuario).all()
            # Corregir obtención de solicitudes: solicitante o destinatario
            from sqlalchemy import or_
            usuario.solicitudes = SolicitudPago.query.filter(
                or_(SolicitudPago.solicitante == id_usuario, SolicitudPago.destinatario == id_usuario)
            ).all()
            usuario.dispositivos = Dispositivo.query.filter_by(id_usuario=id_usuario).all()
        except Exception as e:
            print(f"[DEBUG] Error decodificando token o buscando usuario: {e}")
            usuario = None

    RESPUESTAS_DINAMICAS = {
        'consultar_saldo': lambda usuario: f"Tu saldo actual es S/ {usuario.cuenta.saldo:.2f}" if usuario and hasattr(usuario, 'cuenta') else "No se pudo obtener tu saldo.",
        'consultar_historial': lambda usuario: (
            "Tus últimas transacciones: " +
            ", ".join([
                f"S/ {t.monto:.2f} retirados" if es_retiro(t, usuario) else f"S/ {t.monto:.2f} a {t.destinatario if getattr(t, 'destinatario', None) else obtener_nombre_destinatario(t, usuario)}"
                for t in getattr(usuario, 'transacciones', [])
            ])
            if usuario and hasattr(usuario, 'transacciones') and usuario.transacciones else "No se encontraron transacciones."
        ),
        'consultar_tarjetas': lambda usuario: (
            f"Tienes {len(getattr(usuario, 'tarjetas', []))} tarjeta(s) registrada(s)."
            if usuario and hasattr(usuario, 'tarjetas') else "No se encontraron tarjetas."
        ),
        'consultar_solicitudes': lambda usuario: (
            f"Tienes {len([s for s in getattr(usuario, 'solicitudes', []) if getattr(s, 'estado', '') == 'pendiente'])} solicitud(es) de pago pendientes."
            if usuario and hasattr(usuario, 'solicitudes') else "No se encontraron solicitudes."
        ),
        'ayuda': lambda usuario: (
            'Puedo ayudarte a: consultar saldo, ver tus últimas transacciones, ver tus tarjetas registradas, ver tus solicitudes de pago o pedir ayuda.'
        ),
        'info_general': lambda usuario: (
            'SafePay es una plataforma de pagos y transferencias seguras basada en tecnología blockchain. Permite enviar, recibir y gestionar dinero de forma transparente, rápida y confiable.'
        ),
        'que_es_safepay': lambda usuario: (
            'SafePay es una solución fintech que utiliza blockchain para garantizar la seguridad y transparencia en todas tus operaciones financieras.'
        ),
        'funciones': lambda usuario: (
            'SafePay te permite: consultar tu saldo, ver tu historial de transacciones, registrar tarjetas, realizar transferencias, solicitar pagos y gestionar tus dispositivos de acceso.'
        ),
        'registro': lambda usuario: (
            'Para registrarte en SafePay, haz clic en el botón de registro y completa tus datos. Es rápido, seguro y gratuito.'
        ),
        'es_seguro': lambda usuario: (
            'Sí, SafePay es seguro. Utiliza tecnología blockchain y cifrado avanzado para proteger todas tus transacciones y datos personales.'
        ),
        'quien_puede_usar': lambda usuario: (
            'Cualquier persona mayor de edad puede registrarse y usar SafePay para enviar, recibir y gestionar pagos de forma segura.'
        ),
    }
    INTENCIONES_TRANSACCIONALES = [
        'consultar_saldo', 'consultar_historial', 'consultar_tarjetas',
        'consultar_solicitudes', 'consultar_dispositivos', 'transferencia', 'pago'
    ]

    # 1. Intentar primero con la lógica local (NLP)
    intencion = classify_intent(mensaje)
    if intencion == 'no_encontrado':
        # Si NLP no reconoce, pasar a Qwen
        intencion_llm = classify_intent_llm(mensaje)
        # Si la intención es transaccional y no hay usuario, pide iniciar sesión
        if intencion_llm.lower().replace(' ', '_') in INTENCIONES_TRANSACCIONALES and not usuario:
            return jsonify({'respuesta': 'Debes iniciar sesión para consultar tu saldo, hacer transferencias o acceder a funciones personalizadas.'})
        # Si hay usuario o la intención es informativa, responde normalmente
        if intencion_llm in RESPUESTAS_DINAMICAS:
            respuesta = RESPUESTAS_DINAMICAS[intencion_llm](usuario)
            return jsonify({'respuesta': respuesta})
        if intencion_llm.lower() == 'saludo':
            return jsonify({'respuesta': '¡Hola! ¿En qué puedo ayudarte hoy?'})
        if intencion_llm.lower() == 'despedida':
            return jsonify({'respuesta': '¡Hasta luego! Si tienes más preguntas, aquí estaré.'})
        if intencion_llm.lower() == 'ayuda':
            return jsonify({'respuesta': RESPUESTAS_DINAMICAS['ayuda'](usuario)})
        if intencion_llm.lower() in ['información_general', 'info_general', 'que_es_safepay', 'funciones', 'registro', 'es_seguro', 'quien_puede_usar']:
            respuesta = RESPUESTAS_DINAMICAS.get(intencion_llm.lower().replace(' ', '_'), lambda u: 'SafePay es una plataforma de pagos y transferencias seguras basada en blockchain.').__call__(usuario)
            return jsonify({'respuesta': respuesta})
        # Si no se reconoce la intención, pedir a Qwen que genere una respuesta profesional
        respuesta_ia = classify_intent_llm(mensaje, modo='respuesta')
        return jsonify({'respuesta': respuesta_ia})
    # Si NLP sí reconoce
    if intencion in INTENCIONES_TRANSACCIONALES and not usuario:
        return jsonify({'respuesta': 'Debes iniciar sesión para consultar tu saldo, hacer transferencias o acceder a funciones personalizadas.'})
    if intencion in RESPUESTAS_DINAMICAS:
        respuesta = RESPUESTAS_DINAMICAS[intencion](usuario)
        return jsonify({'respuesta': respuesta})
    # Fallback por si acaso
    return jsonify({'respuesta': 'No se pudo procesar tu mensaje. Intenta de nuevo.'})


@bp.route('/usuarios/<int:id_usuario>/retirar', methods=['POST'])
def retirar_dinero(id_usuario):
    data = request.json
    monto = data.get('monto')
    if not monto or float(monto) <= 0:
        return jsonify({'mensaje': 'Monto inválido'}), 400
    cuenta = Cuenta.query.filter_by(id_usuario=id_usuario, activa=True).first()
    if not cuenta:
        return jsonify({'mensaje': 'Cuenta no encontrada'}), 404
    if float(cuenta.saldo) < float(monto):
        return jsonify({'mensaje': 'Saldo insuficiente'}), 400
    # Restar saldo
    cuenta.saldo = float(cuenta.saldo) - float(monto)
    # Registrar transacción (emisor y receptor el mismo)
    transaccion = Transaccion(
        cuenta_origen=cuenta.id_cuenta,
        cuenta_destino=cuenta.id_cuenta,
        monto=monto,
        descripcion='Retiro',
        estado='completada'
    )
    db.session.add(transaccion)
    db.session.commit()
    return jsonify({'mensaje': 'Retiro realizado', 'nuevo_saldo': str(cuenta.saldo)}), 200

def obtener_nombre_destinatario(transaccion, usuario):
    # Busca el nombre del destinatario a partir del id de cuenta_destino
    from app.models import Cuenta, Usuario
    if hasattr(transaccion, 'cuenta_destino'):
        cuenta = Cuenta.query.filter_by(id_cuenta=transaccion.cuenta_destino).first()
        if cuenta and cuenta.id_usuario != usuario.id_usuario:
            usuario_dest = Usuario.query.filter_by(id_usuario=cuenta.id_usuario).first()
            if usuario_dest:
                return usuario_dest.nombre
    return 'otro usuario'

def es_retiro(transaccion, usuario):
    # Un retiro es cuando la cuenta origen y destino son la misma y es del usuario
    return hasattr(transaccion, 'cuenta_origen') and hasattr(transaccion, 'cuenta_destino') and transaccion.cuenta_origen == transaccion.cuenta_destino and hasattr(usuario, 'cuenta') and transaccion.cuenta_origen == usuario.cuenta.id_cuenta

@bp.route('/solicitudes/crear', methods=['POST'])
def crear_solicitud_pago():
    data = request.get_json()
    user_data = request.headers.get('Authorization')
    # Aquí podrías usar JWT o session para obtener el usuario actual
    # Por simplicidad, asumimos que el id_usuario viene en el body o en el token
    id_usuario = None
    if user_data and user_data.startswith('Bearer '):
        # Extraer id_usuario del JWT si lo usas
        pass
    if not id_usuario:
        # Fallback: intentar obtener de sesión o body
        id_usuario = data.get('solicitante')
    if not id_usuario:
        # Fallback: intentar obtener de userData en frontend
        userData = request.cookies.get('userData')
        if userData:
            import json
            try:
                id_usuario = json.loads(userData).get('id_usuario')
            except:
                pass
    destinatario = data.get('destinatario')
    monto = data.get('monto')
    mensaje = data.get('mensaje', '')
    fecha_vencimiento = data.get('fecha_vencimiento')
    if not id_usuario or not destinatario or not monto or not fecha_vencimiento:
        return jsonify({'mensaje': 'Faltan datos para crear la solicitud.'}), 400
    # Buscar destinatario por nombre o correo
    usuario_dest = Usuario.query.filter((Usuario.nombre == destinatario) | (Usuario.correo == destinatario)).first()
    if not usuario_dest:
        return jsonify({'mensaje': 'No se encontró el destinatario.'}), 404
    solicitud = SolicitudPago(
        solicitante=id_usuario,
        destinatario=usuario_dest.id_usuario,
        monto=monto,
        mensaje=mensaje,
        estado='pendiente',
        fecha_vencimiento=fecha_vencimiento
    )
    db.session.add(solicitud)
    db.session.commit()
    return jsonify({'mensaje': 'Solicitud de pago creada correctamente.', 'id_solicitud': solicitud.id_solicitud}), 200

@bp.route('/usuarios/nombres', methods=['POST'])
def obtener_nombres_usuarios():
    data = request.get_json()
    ids = data.get('ids', [])
    if not ids or not isinstance(ids, list):
        return jsonify({})
    usuarios = Usuario.query.filter(Usuario.id_usuario.in_(ids)).all()
    return jsonify({str(u.id_usuario): u.nombre for u in usuarios})

@bp.route('/cuentas/nombres', methods=['POST'])
def obtener_nombres_por_cuentas():
    data = request.get_json()
    cuenta_ids = data.get('cuenta_ids', [])
    if not cuenta_ids or not isinstance(cuenta_ids, list):
        return jsonify({})
    cuentas = Cuenta.query.filter(Cuenta.id_cuenta.in_(cuenta_ids)).all()
    # Mapear id_cuenta a nombre de usuario
    result = {}
    for c in cuentas:
        usuario = Usuario.query.get(c.id_usuario)
        if usuario:
            result[str(c.id_cuenta)] = usuario.nombre
    return jsonify(result)
