from flask import Blueprint, request, jsonify
from .models import db, Usuario, Cuenta, Transaccion, SolicitudPago, Dispositivo
import jwt
import datetime
from flask import current_app

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
