from flask import Blueprint, request, jsonify
from .models import db, Usuario, Cuenta, Transaccion, SolicitudPago, Dispositivo
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
import os, base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

bp = Blueprint('crud', __name__)

# --- USUARIOS ---
@bp.route('/usuarios', methods=['POST'])
def crear_usuario():
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
    # Cifrar la clave privada con la contraseña del usuario
    salt = os.urandom(16)
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100_000,
    )
    key = kdf.derive(contrasena.encode())
    iv = os.urandom(12)  # AES-GCM standard IV size
    aesgcm = AESGCM(key)
    priv_bytes = usuario.clave_privada.encode() if isinstance(usuario.clave_privada, str) else usuario.clave_privada
    priv_encrypted = aesgcm.encrypt(iv, priv_bytes, None)  # ciphertext + tag
    # Codificar salt+iv+clave cifrada (incluye tag) en base64 para entregar al usuario
    encrypted_package = base64.urlsafe_b64encode(salt + iv + priv_encrypted).decode()
    return jsonify({'mensaje': 'Usuario creado correctamente', 'clave_privada_cifrada': encrypted_package}), 201

@bp.route('/usuarios', methods=['GET'])
def listar_usuarios():
    usuarios = Usuario.query.all()
    return jsonify([{
        'id_usuario': u.id_usuario,
        'nombre': u.nombre,
        'correo': u.correo,
        'telefono': u.telefono,
        'fecha_creacion': u.fecha_creacion
    } for u in usuarios])

@bp.route('/usuarios/<int:id_usuario>', methods=['GET'])
def obtener_usuario(id_usuario):
    usuario = Usuario.query.get_or_404(id_usuario)
    return jsonify({
        'id_usuario': usuario.id_usuario,
        'nombre': usuario.nombre,
        'correo': usuario.correo,
        'telefono': usuario.telefono,
        'fecha_creacion': usuario.fecha_creacion
    })

@bp.route('/usuarios/<int:id_usuario>', methods=['PUT'])
def actualizar_usuario(id_usuario):
    usuario = Usuario.query.get_or_404(id_usuario)
    data = request.json
    usuario.nombre = data.get('nombre', usuario.nombre)
    usuario.correo = data.get('correo', usuario.correo)
    usuario.telefono = data.get('telefono', usuario.telefono)
    db.session.commit()
    return jsonify({'mensaje': 'Usuario actualizado'})

@bp.route('/usuarios/<int:id_usuario>', methods=['DELETE'])
def eliminar_usuario(id_usuario):
    usuario = Usuario.query.get_or_404(id_usuario)
    db.session.delete(usuario)
    db.session.commit()
    return jsonify({'mensaje': 'Usuario eliminado'})

@bp.route('/usuarios/nombres', methods=['POST'])
def obtener_nombres_usuarios():
    ids = request.json.get('ids', [])
    usuarios = Usuario.query.filter(Usuario.id_usuario.in_(ids)).all()
    return jsonify({str(u.id_usuario): u.nombre for u in usuarios})

@bp.route('/usuarios/buscar', methods=['GET'])
def buscar_usuario():
    nombre = request.args.get('nombre')
    if not nombre:
        return jsonify({'mensaje': 'Falta el nombre'}), 400
    usuario = Usuario.query.filter(Usuario.nombre.ilike(nombre.strip())).first()
    if not usuario:
        return jsonify({'mensaje': 'Usuario no encontrado'}), 404
    return jsonify({'id_usuario': usuario.id_usuario, 'nombre': usuario.nombre}), 200

# --- CUENTAS ---
@bp.route('/cuentas', methods=['POST'])
def crear_cuenta():
    data = request.json
    cuenta = Cuenta(
        id_usuario=data.get('id_usuario'),
        saldo=data.get('saldo', 0.00),
        moneda=data.get('moneda', 'USD'),
        activa=data.get('activa', True)
    )
    db.session.add(cuenta)
    db.session.commit()
    return jsonify({'id_cuenta': cuenta.id_cuenta}), 201

@bp.route('/cuentas', methods=['GET'])
def listar_cuentas():
    cuentas = Cuenta.query.all()
    return jsonify([{
        'id_cuenta': c.id_cuenta,
        'id_usuario': c.id_usuario,
        'saldo': float(c.saldo),
        'moneda': c.moneda,
        'activa': c.activa
    } for c in cuentas])

@bp.route('/cuentas/<int:id_cuenta>', methods=['GET'])
def obtener_cuenta(id_cuenta):
    cuenta = Cuenta.query.get_or_404(id_cuenta)
    return jsonify({
        'id_cuenta': cuenta.id_cuenta,
        'id_usuario': cuenta.id_usuario,
        'saldo': float(cuenta.saldo),
        'moneda': cuenta.moneda,
        'activa': cuenta.activa
    })

@bp.route('/cuentas/<int:id_cuenta>', methods=['PUT'])
def actualizar_cuenta(id_cuenta):
    cuenta = Cuenta.query.get_or_404(id_cuenta)
    data = request.json
    cuenta.saldo = data.get('saldo', cuenta.saldo)
    cuenta.moneda = data.get('moneda', cuenta.moneda)
    cuenta.activa = data.get('activa', cuenta.activa)
    db.session.commit()
    return jsonify({'mensaje': 'Cuenta actualizada'})

@bp.route('/cuentas/<int:id_cuenta>', methods=['DELETE'])
def eliminar_cuenta(id_cuenta):
    cuenta = Cuenta.query.get_or_404(id_cuenta)
    db.session.delete(cuenta)
    db.session.commit()
    return jsonify({'mensaje': 'Cuenta eliminada'})

# --- TRANSACCIONES ---
@bp.route('/transacciones', methods=['POST'])
def crear_transaccion():
    data = request.json
    transaccion = Transaccion(
        cuenta_origen=data.get('cuenta_origen'),
        cuenta_destino=data.get('cuenta_destino'),
        monto=data.get('monto'),
        descripcion=data.get('descripcion'),
        estado=data.get('estado', 'completada')
    )
    db.session.add(transaccion)
    db.session.commit()
    return jsonify({'id_transaccion': transaccion.id_transaccion}), 201

@bp.route('/transacciones', methods=['GET'])
def listar_transacciones():
    transacciones = Transaccion.query.all()
    return jsonify([{
        'id_transaccion': t.id_transaccion,
        'cuenta_origen': t.cuenta_origen,
        'cuenta_destino': t.cuenta_destino,
        'monto': float(t.monto),
        'descripcion': t.descripcion,
        'fecha': t.fecha,
        'estado': t.estado
    } for t in transacciones])

@bp.route('/transacciones/<int:id_transaccion>', methods=['GET'])
def obtener_transaccion(id_transaccion):
    t = Transaccion.query.get_or_404(id_transaccion)
    return jsonify({
        'id_transaccion': t.id_transaccion,
        'cuenta_origen': t.cuenta_origen,
        'cuenta_destino': t.cuenta_destino,
        'monto': float(t.monto),
        'descripcion': t.descripcion,
        'fecha': t.fecha,
        'estado': t.estado
    })

@bp.route('/transacciones/<int:id_transaccion>', methods=['DELETE'])
def eliminar_transaccion(id_transaccion):
    t = Transaccion.query.get_or_404(id_transaccion)
    db.session.delete(t)
    db.session.commit()
    return jsonify({'mensaje': 'Transacción eliminada'})

# --- SOLICITUDES DE PAGO ---
@bp.route('/solicitudes', methods=['POST'])
def crear_solicitud():
    data = request.json
    solicitud = SolicitudPago(
        solicitante=data.get('solicitante'),
        destinatario=data.get('destinatario'),
        monto=data.get('monto'),
        mensaje=data.get('mensaje'),
        estado=data.get('estado', 'pendiente')
    )
    db.session.add(solicitud)
    db.session.commit()
    return jsonify({'id_solicitud': solicitud.id_solicitud}), 201

@bp.route('/solicitudes', methods=['GET'])
def listar_solicitudes():
    solicitudes = SolicitudPago.query.all()
    return jsonify([{
        'id_solicitud': s.id_solicitud,
        'solicitante': s.solicitante,
        'destinatario': s.destinatario,
        'monto': float(s.monto),
        'mensaje': s.mensaje,
        'estado': s.estado,
        'fecha_solicitud': s.fecha_solicitud,
        'fecha_vencimiento': s.fecha_vencimiento
    } for s in solicitudes])

@bp.route('/solicitudes/<int:id_solicitud>', methods=['GET'])
def obtener_solicitud(id_solicitud):
    s = SolicitudPago.query.get_or_404(id_solicitud)
    return jsonify({
        'id_solicitud': s.id_solicitud,
        'solicitante': s.solicitante,
        'destinatario': s.destinatario,
        'monto': float(s.monto),
        'mensaje': s.mensaje,
        'estado': s.estado,
        'fecha_solicitud': s.fecha_solicitud
    })

@bp.route('/solicitudes/<int:id_solicitud>', methods=['PUT'])
def actualizar_solicitud(id_solicitud):
    s = SolicitudPago.query.get_or_404(id_solicitud)
    data = request.json
    s.estado = data.get('estado', s.estado)
    s.mensaje = data.get('mensaje', s.mensaje)
    db.session.commit()
    return jsonify({'mensaje': 'Solicitud actualizada'})

@bp.route('/solicitudes/<int:id_solicitud>', methods=['DELETE'])
def eliminar_solicitud(id_solicitud):
    s = SolicitudPago.query.get_or_404(id_solicitud)
    db.session.delete(s)
    db.session.commit()
    return jsonify({'mensaje': 'Solicitud eliminada'})

# --- DISPOSITIVOS ---
@bp.route('/dispositivos', methods=['POST'])
def crear_dispositivo():
    data = request.json
    dispositivo = Dispositivo(
        id_usuario=data.get('id_usuario'),
        nombre=data.get('nombre'),
        ip_registro=data.get('ip_registro')
    )
    db.session.add(dispositivo)
    db.session.commit()
    return jsonify({'id_dispositivo': dispositivo.id_dispositivo}), 201

@bp.route('/dispositivos', methods=['GET'])
def listar_dispositivos():
    dispositivos = Dispositivo.query.all()
    return jsonify([{
        'id_dispositivo': d.id_dispositivo,
        'id_usuario': d.id_usuario,
        'nombre': d.nombre,
        'ip_registro': d.ip_registro,
        'ultimo_acceso': d.ultimo_acceso
    } for d in dispositivos])

@bp.route('/dispositivos/<int:id_dispositivo>', methods=['GET'])
def obtener_dispositivo(id_dispositivo):
    d = Dispositivo.query.get_or_404(id_dispositivo)
    return jsonify({
        'id_dispositivo': d.id_dispositivo,
        'id_usuario': d.id_usuario,
        'nombre': d.nombre,
        'ip_registro': d.ip_registro,
        'ultimo_acceso': d.ultimo_acceso
    })

@bp.route('/dispositivos/<int:id_dispositivo>', methods=['PUT'])
def actualizar_dispositivo(id_dispositivo):
    d = Dispositivo.query.get_or_404(id_dispositivo)
    data = request.json
    d.nombre = data.get('nombre', d.nombre)
    d.ip_registro = data.get('ip_registro', d.ip_registro)
    db.session.commit()
    return jsonify({'mensaje': 'Dispositivo actualizado'})

@bp.route('/dispositivos/<int:id_dispositivo>', methods=['DELETE'])
def eliminar_dispositivo(id_dispositivo):
    d = Dispositivo.query.get_or_404(id_dispositivo)
    db.session.delete(d)
    db.session.commit()
    return jsonify({'mensaje': 'Dispositivo eliminado'})
