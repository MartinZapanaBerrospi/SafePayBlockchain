# comparar_pem_texto.py
"""
Script para comparar dos bloques PEM (clave privada descifrada) en formato texto plano (no hex),
y mostrar diferencias byte a byte y visualmente.
Pega aquí el bloque PEM del frontend ("Clave privada descifrada (PEM):" del navegador)
y el de la base de datos (como texto plano, no hex ni bytea).
"""

def limpiar_pem(pem: str) -> str:
    """Elimina headers, footers, saltos de línea y espacios."""
    lines = pem.strip().splitlines()
    base64_lines = [line for line in lines if not line.startswith('-----')]
    return ''.join(base64_lines)

# Pega aquí los bloques PEM (como texto plano, con headers y saltos de línea)
pem_frontend = '''
PEGA_AQUI_EL_PEM_DEL_FRONTEND
'''

pem_db = '''
PEGA_AQUI_EL_PEM_DE_LA_DB
'''

print('Longitud texto frontend:', len(pem_frontend))
print('Longitud texto db:', len(pem_db))

if pem_frontend == pem_db:
    print('\n¡Los bloques PEM (texto) son idénticos!')
else:
    print('\nLos bloques PEM (texto) son diferentes.')
    # Mostrar diferencias byte a byte
    minlen = min(len(pem_frontend), len(pem_db))
    for i in range(minlen):
        if pem_frontend[i] != pem_db[i]:
            print(f'Diferencia en posición {i}: frontend={pem_frontend[i]!r}, db={pem_db[i]!r}')
            print('Contexto frontend:', pem_frontend[max(0,i-10):i+10])
            print('Contexto db:', pem_db[max(0,i-10):i+10])
            break
    if len(pem_frontend) != len(pem_db):
        print(f'Longitudes distintas: frontend={len(pem_frontend)}, db={len(pem_db)}')

# También puedes comparar el base64 puro
b64_frontend = limpiar_pem(pem_frontend)
b64_db = limpiar_pem(pem_db)
if b64_frontend == b64_db:
    print('\n¡El contenido base64 puro es idéntico!')
else:
    print('\nEl contenido base64 puro es diferente.')
    minlen = min(len(b64_frontend), len(b64_db))
    for i in range(minlen):
        if b64_frontend[i] != b64_db[i]:
            print(f'Diferencia base64 en posición {i}: frontend={b64_frontend[i]!r}, db={b64_db[i]!r}')
            print('Contexto frontend:', b64_frontend[max(0,i-10):i+10])
            print('Contexto db:', b64_db[max(0,i-10):i+10])
            break
    if len(b64_frontend) != len(b64_db):
        print(f'Longitudes base64 distintas: frontend={len(b64_frontend)}, db={len(b64_db)}')
