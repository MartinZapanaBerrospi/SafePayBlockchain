# chatbot_intent_model.py
"""
Módulo para clasificación de intenciones usando Hugging Face Transformers.
"""
from transformers import pipeline

# Puedes cambiar el modelo por uno más específico si lo deseas
def get_intent_classifier():
    # Modelo base para clasificación de sentencias (puedes afinarlo luego)
    return pipeline("text-classification", model="distilbert-base-uncased-finetuned-sst-2-english")

# Intenciones soportadas en el proyecto
INTENT_LABELS = [
    "consultar_saldo",
    "consultar_historial",
    "consultar_tarjetas",
    "consultar_solicitudes",
    "consultar_dispositivos",
    "ayuda",
    "info_general",
    "registro",
    "funciones",
    "que_es_safepay"
]

EXAMPLES = {
    "consultar_saldo": ["saldo", "cuánto tengo", "dinero disponible", "ver saldo"],
    "consultar_historial": ["historial", "pagos realizados", "transacciones", "movimientos"],
    "consultar_tarjetas": ["tarjetas", "mis tarjetas", "ver tarjetas", "número de tarjeta"],
    "consultar_solicitudes": ["solicitudes", "solicitud de pago", "pedidos de pago"],
    "consultar_dispositivos": ["dispositivos", "ubicación", "mis dispositivos"],
    "ayuda": ["ayuda", "información", "qué puedo hacer", "opciones", "soporte"],
    "info_general": ["qué es safepay", "información general", "presentación", "sobre safepay"],
    "registro": ["cómo me registro", "registrarme", "crear cuenta", "abrir cuenta"],
    "funciones": ["qué funciones tiene", "qué puedo hacer", "servicios disponibles", "funcionalidades"],
    "que_es_safepay": ["qué es safepay", "para qué sirve safepay", "explica safepay"]
}

def classify_intent(text):
    text = text.lower()
    for intent, keywords in EXAMPLES.items():
        if any(k in text for k in keywords):
            return intent
    return "ayuda"
