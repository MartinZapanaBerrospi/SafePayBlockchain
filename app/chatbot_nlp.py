# Requiere: pip install spacy
# Requiere: python -m spacy download es_core_news_sm
from flask import Blueprint, request, jsonify, current_app
from .models import Usuario, Cuenta, Tarjeta, SolicitudPago, Transaccion, Dispositivo
from .chatbot_intent_model import classify_intent
import jwt as pyjwt

bp = Blueprint('chatbot', __name__)

# Respuestas dinámicas según intención y sesión
RESPUESTAS_DINAMICAS = {
    'consultar_saldo': lambda usuario: f"Tu saldo actual es S/ {usuario.cuenta.saldo:.2f}" if usuario and hasattr(usuario, 'cuenta') else "No se pudo obtener tu saldo.",
    'consultar_historial': lambda usuario: f"Tus últimas transacciones: {', '.join([f'S/ {t.monto:.2f} a {t.destinatario}' for t in getattr(usuario, 'transacciones', [])])}" if usuario and hasattr(usuario, 'transacciones') and usuario.transacciones else "No se encontraron transacciones.",
    'consultar_tarjetas': lambda usuario: f"Tienes {len(getattr(usuario, 'tarjetas', []))} tarjeta(s) registrada(s)." if usuario and hasattr(usuario, 'tarjetas') else "No se encontraron tarjetas.",
    'consultar_solicitudes': lambda usuario: f"Tienes {len(getattr(usuario, 'solicitudes', []))} solicitud(es) de pago." if usuario and hasattr(usuario, 'solicitudes') else "No se encontraron solicitudes.",
    'consultar_dispositivos': lambda usuario: f"Tienes {len(getattr(usuario, 'dispositivos', []))} dispositivo(s) registrados." if usuario and hasattr(usuario, 'dispositivos') else "No se encontraron dispositivos.",
    'ayuda': lambda usuario: 'Puedo ayudarte a: consultar saldo, historial, tarjetas, solicitudes, dispositivos, o darte información general.',
    'info_general': lambda usuario: 'SafePay es una plataforma de pagos segura basada en blockchain, diseñada para facilitar transferencias, gestión de tarjetas y solicitudes de pago de manera confiable.',
    'registro': lambda usuario: 'Para registrarte, haz clic en “Crear usuario” en la pantalla de inicio de sesión y completa tus datos.',
    'funciones': lambda usuario: 'SafePay permite: transferencias seguras, gestión de tarjetas, solicitudes de pago, registro de dispositivos y consulta de historial.',
    'que_es_safepay': lambda usuario: 'SafePay es una solución digital de pagos y transferencias con tecnología blockchain, pensada para seguridad y transparencia.'
}

def obtener_usuario_desde_token(token):
    if not token:
        return None
    try:
        secret = str(current_app.config.get('SECRET_KEY', 'clave-secreta'))
        data = pyjwt.decode(token, secret, algorithms=['HS256'])
        id_usuario = data.get('id_usuario')
        usuario = Usuario.query.filter_by(id_usuario=id_usuario).first()
        # Cargar relaciones
        if usuario:
            usuario.cuenta = Cuenta.query.filter_by(id_usuario=id_usuario).first()
            usuario.transacciones = Transaccion.query.filter_by(id_usuario=id_usuario).all()
            usuario.tarjetas = Tarjeta.query.filter_by(id_usuario=id_usuario).all()
            usuario.solicitudes = SolicitudPago.query.filter_by(id_usuario=id_usuario).all()
            usuario.dispositivos = Dispositivo.query.filter_by(id_usuario=id_usuario).all()
        return usuario
    except Exception:
        return None

@bp.route('/chatbot', methods=['POST'])
def chatbot():
    data = request.json
    mensaje = data.get('mensaje', '')
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    intencion = classify_intent(mensaje)
    usuario = obtener_usuario_desde_token(token) if token else None
    if intencion in RESPUESTAS_DINAMICAS:
        respuesta = RESPUESTAS_DINAMICAS[intencion](usuario)
        return jsonify({'respuesta': respuesta})
    return jsonify({'respuesta': 'No entendí tu mensaje. Puedes preguntarme sobre saldo, historial, tarjetas, solicitudes, dispositivos o escribir “ayuda”.'})
