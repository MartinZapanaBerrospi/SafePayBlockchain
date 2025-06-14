import requests
import re

API_BASE_URL = "http://localhost:11434/v1/chat/completions"
headers = {"Content-Type": "application/json"}

def classify_intent_llm(mensaje_usuario, modo='clasificacion'):
    model = "qwen3:1.7b"
    ejemplos = (
        "Ejemplo:\n"
        "- 'bro, cuánto money tengo?' → Consultar saldo\n"
        "- 'cómo me registro?' → Registro de usuario\n"
        "- 'qué es safepay?' → Información general\n"
        "- 'quiero ver mis tarjetas' → Consultar tarjetas\n"
        "- 'hazme una transferencia' → Realizar transferencia\n"
        "- 'muéstrame mi historial' → Consultar historial\n"
        "- 'registra mi dispositivo' → Registrar dispositivo\n"
        "- 'quiero pagar una factura' → Realizar pago\n"
        "- 'ayuda por favor' → Ayuda\n"
        "- 'me despido, gracias' → Despedida\n"
        "- 'hola bot' → Saludo\n"
        "- 'no entiendo nada' → Otro\n"
    )
    if modo == 'clasificacion':
        prompt = (
            "Eres SafePayBot, un asistente virtual profesional para la plataforma SafePay. "
            "Debes clasificar la intención del usuario aunque use palabras informales, modismos, errores ortográficos, abreviaturas, sinónimos, parafraseos o expresiones coloquiales. "
            "Reconoce preguntas directas e indirectas, y frases comunes en español de Latinoamérica y España. "
            "No dependas de palabras exactas, sino del significado general. "
            "Si el usuario pregunta por su saldo usando cualquier sinónimo, jerga, palabra informal o parafraseo (por ejemplo: 'cuánta lana tengo', 'cuánto money tengo', 'cuánta plata tengo', 'cuánto dinero tengo', 'cuánto cash tengo', 'cuánto billete tengo', etc.), SIEMPRE responde con la categoría exacta: Consultar saldo. "
            "Clasifica la intención del usuario en una de las siguientes categorías (distingue claramente entre informativas y transaccionales):\n"
            "- Saludo (informativa)\n"
            "- Consultar saldo (transaccional)\n"
            "- Realizar transferencia (transaccional)\n"
            "- Consultar historial (transaccional)\n"
            "- Registrar tarjeta (transaccional)\n"
            "- Solicitar pago (transaccional)\n"
            "- Registrar dispositivo (transaccional)\n"
            "- Registro de usuario (informativa)\n"
            "- Información general (informativa)\n"
            "- Ayuda (informativa)\n"
            "- Despedida (informativa)\n"
            "- Otro\n\n"
            f"{ejemplos}"
            "Responde únicamente con el nombre de la categoría, sin explicación adicional.\n\n"
            f"Mensaje: '{mensaje_usuario}'"
        )
    else:
        prompt = (
            "Eres SafePayBot, un asistente virtual profesional para la plataforma SafePay. "
            "Responde de manera clara, útil y profesional a la siguiente consulta del usuario, aunque sea una pregunta poco común o no esté en las categorías habituales. "
            "Responde en español y de forma breve y precisa.\n\n"
            f"Mensaje: '{mensaje_usuario}'"
        )
    inputs = [
        {
            "role": "system",
            "content": prompt
        }
    ]
    try:
        response = requests.post(
            API_BASE_URL,
            headers=headers,
            json={"model": model, "messages": inputs}
        )
        if response.status_code == 200:
            data = response.json()
            return limpiar_respuesta(data["choices"][0]["message"]["content"].strip())
        else:
            print("Error:", response.status_code, response.text)
            return "Otro"
    except requests.exceptions.RequestException as e:
        print("Error de conexión:", e)
        return "Otro"

def limpiar_respuesta(texto):
    texto_limpio = re.sub(r'<think>.*?</think>\n?', '', texto, flags=re.DOTALL)
    return texto_limpio.strip()
