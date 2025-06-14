import requests
import re

API_BASE_URL = "http://localhost:11434/v1/chat/completions"
headers = {"Content-Type": "application/json"}

def clasificar_intencion(mensaje_usuario):
    model = "qwen3:1.7b"

    inputs = [
        {
            "role": "system",
            "content": (
                "Tu nombre es BotRedes7, un asistente virtual amigable que informa en tiempo real sobre "
                "la actividad en redes sociales, especialmente Twitter. Ayudas a los usuarios a conocer cuántos "
                "seguidores tienen, si aumentaron o disminuyeron, cuánto les falta para alcanzar una meta, "
                "y presentas gráficos con las tendencias recientes. También puedes mostrar dashboards con datos generales. "
                "Responde de forma clara, útil y cercana. Tu tarea ahora es clasificar intenciones del usuario."
            )
        },
        {
            "role": "user",
            "content": (
                "Clasifica la intención del siguiente mensaje del usuario en una de las siguientes categorías:\n"
                "- Saludo\n"
                "- Actualizar meta de seguidores\n"
                "- Consultar número de Seguidores\n"
                "- Consultar cambio de Seguidores\n"
                "- Consultar Meta de seguidores\n"
                "- Ver Dashboard o gráfico\n"
                "- Despedida\n"
                "- Cambiar de cuenta\n"
                "- Otro\n\n"
                "Responde únicamente con el nombre de la categoría, sin ninguna explicación adicional.\n\n"
                f"Mensaje: '{mensaje_usuario}'"
            )
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
            return obtener_respuesta(data["choices"][0]["message"]["content"].strip())
        else:
            print("Error:", response.status_code, response.text)
            return "Error"
    except requests.exceptions.RequestException as e:
        print("Error de conexión:", e)
        return "Error de conexión"

def obtener_respuesta(texto):
    # Eliminar contenido entre <think></think> y el salto de línea posterior
    texto_limpio = re.sub(r'<think>.*?</think>\n?', '', texto, flags=re.DOTALL)
    return texto_limpio.strip()

# Prueba de la función
if __name__ == "__main__":
    mensaje = "Buenas, nos vemos más "
    intencion = clasificar_intencion(mensaje)
    print(intencion)

"""
entidades
nombre_usuario
"""

# si la intención es distinta del saludo o despedida o información pida el nombre de usuario la primera vez
# si la intención cambiar usuario se cambia el nombre_usuario