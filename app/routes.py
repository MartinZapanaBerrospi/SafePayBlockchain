from flask import Blueprint, request, jsonify
from .models import db, Usuario, Cuenta, Transaccion, SolicitudPago, Dispositivo
import jwt
import datetime
from flask import current_app
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization
import base64

bp = Blueprint('api', __name__)


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
        token = jwt.encode({
            'id_usuario': usuario.id_usuario,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=12)
        }, current_app.config.get('SECRET_KEY', 'clave-secreta'), algorithm='HS256')
        return jsonify({'token': token, 'id_usuario': usuario.id_usuario})
    return jsonify({'mensaje': 'Credenciales inválidas'}), 401


# --- PAGAR SOLICITUD ---
@bp.route('/solicitudes/<int:id_solicitud>/pagar', methods=['POST'])
def pagar_solicitud(id_solicitud):
    data = request.json
    id_cuenta_origen = data.get('id_cuenta_origen')
    if not id_cuenta_origen:
        return jsonify({'mensaje': 'Debe indicar la cuenta de origen'}), 400

    solicitud = SolicitudPago.query.get_or_404(id_solicitud)
    cuenta_origen = Cuenta.query.get(id_cuenta_origen)
    cuenta_destino = Cuenta.query.filter_by(id_usuario=solicitud.destinatario, activa=True).first()

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

    # Realizar el pago
    cuenta_origen.saldo -= solicitud.monto
    cuenta_destino.saldo += solicitud.monto
    solicitud.estado = 'aceptada'
    db.session.add(Transaccion(
        cuenta_origen=cuenta_origen.id_cuenta,
        cuenta_destino=cuenta_destino.id_cuenta,
        monto=solicitud.monto,
        descripcion=f'Pago de solicitud #{solicitud.id_solicitud}',
        estado='completada'
    ))
    db.session.commit()
    return jsonify({'mensaje': 'Pago realizado y transacción registrada'}), 200


# --- PAGAR SOLICITUD CON FIRMA DIGITAL ---
@bp.route('/solicitudes/<int:id_solicitud>/pagar_firma', methods=['POST'])
def pagar_solicitud_firma(id_solicitud):
    data = request.json
    id_cuenta_origen = data.get('id_cuenta_origen')
    firma = data.get('firma')  # Firma digital enviada por el cliente (base64)
    if not id_cuenta_origen or not firma:
        return jsonify({'mensaje': 'Debe indicar la cuenta de origen y la firma digital'}), 400

    solicitud = SolicitudPago.query.get_or_404(id_solicitud)
    cuenta_origen = Cuenta.query.get(id_cuenta_origen)
    cuenta_destino = Cuenta.query.filter_by(id_usuario=solicitud.destinatario, activa=True).first()
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

    # Cargar la clave pública
    public_key = serialization.load_pem_public_key(usuario.clave_publica)
    try:
        public_key.verify(
            firma_bytes,
            mensaje_bytes,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
    except Exception as e:
        return jsonify({'mensaje': 'Firma digital inválida', 'error': str(e)}), 400

    # Realizar el pago
    cuenta_origen.saldo -= solicitud.monto
    cuenta_destino.saldo += solicitud.monto
    solicitud.estado = 'aceptada'
    db.session.add(Transaccion(
        cuenta_origen=cuenta_origen.id_cuenta,
        cuenta_destino=cuenta_destino.id_cuenta,
        monto=solicitud.monto,
        descripcion=f'Pago de solicitud #{solicitud.id_solicitud} (firma digital)',
        estado='completada'
    ))
    db.session.commit()
    return jsonify({'mensaje': 'Pago realizado, firma digital verificada y transacción registrada'}), 200
