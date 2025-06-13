# Script para migrar claves públicas en formato hex (con prefijo \x) a texto plano PEM en la base de datos PostgreSQL
# Uso: python migrar_claves_publicas_hex_a_pem.py

import psycopg
import binascii

DB_HOST = 'localhost'
DB_PORT = 5432
DB_NAME = 'safe_pay_db'
DB_USER = 'seteley'
DB_PASS = 'seteley'

TABLE = 'usuario'
COLUMN = 'clave_publica'
ID_COLUMN = 'id_usuario'

def hex_to_pem(hex_str):
    if hex_str.startswith('\\x'):
        hex_str = hex_str[2:]
    try:
        pem_bytes = binascii.unhexlify(hex_str)
        return pem_bytes.decode('utf-8')
    except Exception as e:
        print(f"[ERROR] No se pudo convertir: {hex_str[:40]}...", e)
        return None

def main():
    conn = psycopg.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASS
    )
    with conn:
        with conn.cursor() as cur:
            cur.execute(f"SELECT {ID_COLUMN}, {COLUMN} FROM {TABLE}")
            rows = cur.fetchall()
            for row in rows:
                user_id, clave = row
                if clave and isinstance(clave, str) and clave.startswith('\\x'):
                    pem = hex_to_pem(clave)
                    if pem and pem.startswith('-----BEGIN PUBLIC KEY-----'):
                        print(f"Actualizando usuario {user_id}...")
                        cur.execute(f"UPDATE {TABLE} SET {COLUMN} = %s WHERE {ID_COLUMN} = %s", (pem, user_id))
                    else:
                        print(f"[WARN] Usuario {user_id}: la conversión no produjo un PEM válido")
    print("Migración completada.")

if __name__ == '__main__':
    main()
