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
    db.session.add(solicitud)
    db.session.add(Transaccion(
        cuenta_origen=cuenta_origen.id_cuenta,
        cuenta_destino=cuenta_destino.id_cuenta,
        monto=solicitud.monto,
        descripcion=f'Pago de solicitud #{solicitud.id_solicitud} (firma digital)',
        estado='completada'
    ))
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
    db.session.add(Transaccion(
        cuenta_origen=cuenta_origen.id_cuenta,
        cuenta_destino=cuenta_destino.id_cuenta,
        monto=monto,
        descripcion=f'Transferencia a usuario {id_usuario_destino}: {descripcion}',
        estado='completada'
    ))
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
    usuario = Usuario(
        nombre=nombre,
        correo=correo,
        telefono=telefono
    )
    usuario.set_contrasena(contrasena)
    usuario.generar_claves()
    db.session.add(usuario)
    db.session.commit()
    db.session.refresh(usuario)  # Asegura que id_usuario esté actualizado
    print(f"[DEBUG] Usuario creado con id: {usuario.id_usuario}")
    # Crear cuenta asociada
    try:
        cuenta = crear_cuenta_usuario(usuario.id_usuario)
        print(f"[DEBUG] Cuenta creada con id: {cuenta.id_cuenta} para usuario: {usuario.id_usuario}")
    except Exception as e:
        print(f"[ERROR] No se pudo crear la cuenta: {e}")
        return jsonify({'mensaje': 'Usuario creado pero error al crear la cuenta', 'error': str(e)}), 500
    # Cifrar la clave privada con la contraseña del usuario (igual que en login)
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
    priv_encrypted = aesgcm.encrypt(iv, priv_bytes, None)
    ciphertext = priv_encrypted[:-16]
    tag = priv_encrypted[-16:]
    return jsonify({
        'mensaje': 'Usuario creado correctamente',
        'id_usuario': usuario.id_usuario,
        'privateKeyEnc': base64.urlsafe_b64encode(ciphertext).decode(),
        'privateKeyIv': base64.urlsafe_b64encode(iv).decode(),
        'privateKeySalt': base64.urlsafe_b64encode(salt).decode(),
        'privateKeyTag': base64.urlsafe_b64encode(tag).decode(),
    }), 201


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
