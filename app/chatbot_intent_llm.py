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
        "- 'qué es safepay?' → Información general\n\n"
    )
    if modo == 'clasificacion':
        prompt = (
            "Eres SafePayBot, un asistente virtual profesional para la plataforma SafePay. "
            "Debes clasificar la intención del usuario aunque use palabras informales, modismos, errores ortográficos, abreviaturas, sinónimos, parafraseos o expresiones coloquiales. "
            "Reconoce preguntas directas e indirectas, y frases comunes en español de Latinoamérica y España. "
            "No dependas de palabras exactas, sino del significado general. "
            "Clasifica la intención del usuario en una de las siguientes categorías:\n"
            "- Saludo\n"
            "- Consultar saldo\n"
            "- Realizar transferencia\n"
            "- Consultar historial\n"
            "- Registrar tarjeta\n"
            "- Solicitar pago\n"
            "- Registrar dispositivo\n"
            "- Registro de usuario\n"
            "- Información general\n"
            "- Ayuda\n"
            "- Despedida\n"
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
            return "Error"
    except requests.exceptions.RequestException as e:
        print("Error de conexión:", e)
        return "Error de conexión"

def limpiar_respuesta(texto):
    texto_limpio = re.sub(r'<think>.*?</think>\n?', '', texto, flags=re.DOTALL)
    return texto_limpio.strip()
