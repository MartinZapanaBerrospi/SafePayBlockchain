# Requiere: pip install spacy
# Requiere: python -m spacy download es_core_news_sm
from flask import Blueprint, request, jsonify, current_app
from .models import Usuario, Cuenta, Tarjeta, SolicitudPago, Transaccion, Dispositivo
from .chatbot_intent_model import classify_intent
from .chatbot_intent_llm import classify_intent_llm
import jwt as pyjwt

bp = Blueprint('chatbot', __name__)

# Respuestas dinámicas según intención y sesión
RESPUESTAS_DINAMICAS = {
    'consultar_saldo': lambda usuario: f"Tu saldo actual es S/ {usuario.cuenta.saldo:.2f}" if usuario and hasattr(usuario, 'cuenta') else "No se pudo obtener tu saldo.",
    'consultar_historial': lambda usuario: (
        f"Tus últimas transacciones: {', '.join([f'S/ {t.monto:.2f} a {t.destinatario}' for t in getattr(usuario, 'transacciones', [])])}"
        if usuario and hasattr(usuario, 'transacciones') and usuario.transacciones else "No se encontraron transacciones."
    ),
    'consultar_tarjetas': lambda usuario: (
        f"Tienes {len(getattr(usuario, 'tarjetas', []))} tarjeta(s) registrada(s)."
        if usuario and hasattr(usuario, 'tarjetas') else "No se encontraron tarjetas."
    ),
    'consultar_solicitudes': lambda usuario: (
        f"Tienes {len(getattr(usuario, 'solicitudes', []))} solicitud(es) de pago."
        if usuario and hasattr(usuario, 'solicitudes') else "No se encontraron solicitudes."
    ),
    'ayuda': lambda usuario: (
        "Puedes consultarme sobre tu saldo, tus transacciones recientes, tarjetas registradas, solicitudes de pago o cualquier otra gestión de tu cuenta. ¿En qué te gustaría que te ayude?"
        if usuario else
        "Para acceder a todas las funciones de SafePay, por favor inicia sesión o regístrate. Si necesitas información sobre el registro, recuperación de contraseña o cómo funciona la plataforma, pregúntame."
    ),
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
    # 1. Intentar primero con la lógica local
    intencion = classify_intent(mensaje)
    usuario = obtener_usuario_desde_token(token) if token else None
    if intencion in RESPUESTAS_DINAMICAS:
        if usuario:
            respuesta = RESPUESTAS_DINAMICAS[intencion](usuario)
        else:
            # Respuesta genérica para usuarios no autenticados
            if intencion == 'consultar_saldo':
                respuesta = 'Para consultar tu saldo, por favor inicia sesión.'
            elif intencion == 'consultar_historial':
                respuesta = 'Debes iniciar sesión para ver tu historial de transacciones.'
            elif intencion == 'consultar_tarjetas':
                respuesta = 'Inicia sesión para ver tus tarjetas registradas.'
            elif intencion == 'consultar_solicitudes':
                respuesta = 'Inicia sesión para ver tus solicitudes de pago.'
            else:
                respuesta = RESPUESTAS_DINAMICAS[intencion](usuario)
        return jsonify({'respuesta': respuesta})
    # 2. Si la intención es "ayuda" (o no reconocida), usar LLM para mayor cobertura
    intencion_llm = classify_intent_llm(mensaje)
    if intencion_llm in RESPUESTAS_DINAMICAS:
        if usuario:
            respuesta = RESPUESTAS_DINAMICAS[intencion_llm](usuario)
        else:
            if intencion_llm == 'consultar_saldo':
                respuesta = 'Para consultar tu saldo, por favor inicia sesión.'
            elif intencion_llm == 'consultar_historial':
                respuesta = 'Debes iniciar sesión para ver tu historial de transacciones.'
            elif intencion_llm == 'consultar_tarjetas':
                respuesta = 'Inicia sesión para ver tus tarjetas registradas.'
            elif intencion_llm == 'consultar_solicitudes':
                respuesta = 'Inicia sesión para ver tus solicitudes de pago.'
            else:
                respuesta = RESPUESTAS_DINAMICAS[intencion_llm](usuario)
        return jsonify({'respuesta': respuesta})
    if intencion_llm.lower() == 'saludo':
        return jsonify({'respuesta': '¡Hola! ¿En qué puedo ayudarte hoy?'} )
    if intencion_llm.lower() == 'despedida':
        return jsonify({'respuesta': '¡Hasta luego! Si tienes más preguntas, aquí estaré.'})
    if intencion_llm.lower() == 'ayuda':
        # Siempre usar la lambda actualizada para respuesta contextual
        return jsonify({'respuesta': RESPUESTAS_DINAMICAS['ayuda'](usuario)})
    if intencion_llm.lower() == 'información general':
        return jsonify({'respuesta': 'SafePay es una plataforma de pagos seguros y transferencias con tecnología blockchain. Puedes registrarte, consultar tu saldo, ver tu historial y más.'})
    if intencion_llm.lower() == 'registro de usuario':
        return jsonify({'respuesta': 'Para registrarte, haz clic en el botón de registro y sigue los pasos. ¡Es rápido y seguro!'})
    # Si no se reconoce la intención, pedir a LLM que genere una respuesta profesional
    respuesta_ia = classify_intent_llm(mensaje, modo='respuesta')
    return jsonify({'respuesta': respuesta_ia})
