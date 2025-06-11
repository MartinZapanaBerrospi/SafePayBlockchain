import base64
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# Pega aquí tu clave privada cifrada (base64-url) y la contraseña
CLAVE_CIFRADA = """n6J4GILyIRUZ7cBLjtwBJHw7moMUXJ4womtj76wo5Jv8ERMawRTgKvpMo7pqhO6JXBp4CPi7VKtjUQ1Hip2TvmwhYih4rBjpoyL75-a1fTAnAdVHvlWcFOwVbP4Ma06DRFBNCCZGdbCB37Njh9LnhCa05jsYNnZzYmSuVLCngvbrtApaRG9yVU46P8DxYr8eaeeWKFEt7X6XGTTfDtdApRKouE8tA21EHux1dQhKKspffP62gA_3znofNAGyteeMTfbTafo-5J9-OBqNDuf34n1OJAURkl91SBH0wRYD1ychvYtI58QoJK5F-aknpdGwokpupJ-TBoyEoIaxVz9rZBHknKWebYad8_B7KH2TMDTp0RnSoDZBTPfv1LWKQ6Kmu_5bVkccjgflqGkG0X2zb7ocWcqOI4Z3Ri9lg_KegEv0Lpyp41Od9-SB7ppIkbo3kJ4-LEmV9F4GxiJwbaCT4jXhkeKcnhXLpJbjPhgAOTSv80RK2aJCZrOHE3mdihOuR3FvTgrr0ray88vTw3ovWmS7t2jSPGoa5B0pl5qiGtRvTHuXYukPeCl790ikQRtC6ohsN3lqPpip4iHO_38bsPL06nhW2GuixtmVIUZsm_XHEg5I5s_jSuKQTUnleLnRnRtr60Ix-NjJl8lEcR9_JapuTZCDdTnkGYT0vaJQOR75FNhnsn8LCAYAbU3FTU9mLXtIlcP3sz8-CXuscQlmwQG8TB47_5h_Ql2DNBkbF6ByO7EWLLX-pOw8WeE5_R-9lMGgWaMY9WD4O1xW9A265JM_AJ_qevTO49dpV_NvT9hVYiJ-oza6zeav8PRXD1JY4zeeOVOL0y_58xSrKUja5khRmv3fpHkZgNeIsGSUlAMDcQhmCcH8Zh9wiTzlCuIVYJS12K4IYhNgosyyr0_zm62az1Ncga18nYBOaNAR5YWnc3YQWsy53YK8XRE3i0ptnBPvIxhYPUBzE9hZ1XX62ICDUO27CKgyIVlSdxkjBguOpDoA_1gALtEetLVlQUkcZB1u3Vr1fRQ-HNxM3npF30YTF6CYQ8uFIdPf5M6Fs02GGOqP5gJSLHCtvtki6XCHvlnrPbmUMMDXvxurrYU32rbpDnZPE23HCrYInkXljNciN8WFLnRFGQ-4P5L9ZkQqn5Te7qtPUMj-Ondc3jhjTeWsEAvtvLbt3-MworyBojqdmurhDY-5jkGbYiYO9FRkmEAAjglLyIgFXp3Hwp3K3XGujVA_linUjDJ1H9efpyzUmik5hLhh0hOINT9o1L5xaF1UHlO8zg9cR_baVQG0zZGBj92zcoNCcJQcWCYrNTY4rl8G1epHzvFNqf9BSEVClkjHSoZXEEU91QXNBvagvJVBG3u7VBsI6EyjurjqfyEmNnbUR-n_hxKwbG1Fkgva5nE1NpN-A5bN9BoQLQQwrtfDkX8jO_I1hBl23AJv5cZIPh9vc5Mn9JwrWfceUWfzRdwCCFpDLmlYz8U8PfIb32e-cZkzUAML7F7Gqh8J9FIzkS9vaic8cnEmbh2dk7GvNIgwiEWJsQPlq-zY1WFVNdHO7m8oPgxVK9CdrgYTvqGl8KlJIWr3dqxARo1WOILAkdj1qF-QSGTr6ulnXKa1kQ1YWukX0BUjDgfcL0NSXgxmxpbSTazHM3bZm1TNcAjOEKR3WSPXnUVa8UyEerzdoE7inwMydONmKT4t6kNxYZFzQ1eC1XLP_Fv6I7HRyoVB_V-zMI_gdBaFlAFVppbQqvVevyie-22HCJFKWvO-A40p22wk_RMF2znplprzYwqC3xsiZ21pUj4MKK4S45a_c2r8TK8Qyh1EHR1Tivnlyy9vaq767ee4dVIfqoECgpRMxJ_u7rqfkO77mAyRTyrFjNKgRdAVese9Seavm6uPimrBkEhk1VqT5eg5eQMQg1t5hcs6xOki7aYfsVdn5TkXxa4XUbU6fHpjRqf6vn_uLYD4VTWwtl7ppTJ1oyajDNS67YwmhPkilFFFkmgzeWT1Oqhs8p7g_J5PqSIMxcPUvzBtRH3VEJCbI25vV7rQOMvW1dpSpgN3OavN_4RfUAcV0OliWJv52CyV76qPMM24cPfBk4wzXs5VKc4y1I-UTgMIggRzWdV8aSi2xcVsw65HhyJyY4nwSh5SjpqkSNuRC-MVBt8Sw3ch4ap5KJleem7s5dGGp2v7Yy6siRB-sqYxeGOVEsEHKmxsq7qns_lDejcu_ntApfFD4DV-b1vXt0Oo-mlYXmFnXglvRKWT-or_IvBCy0IA-XhsgpWWdAEyJnP07hGT2bh5u1z8otCjYJpVFPVkbn9BHic2Yvfod-XX7RqW9iQ="""
CONTRASENA = "c"

def descifrar_clave_privada(clave_cifrada_b64, contrasena):
    # Normalizar base64-url: reemplazar -/_ y agregar padding
    b64 = clave_cifrada_b64.replace('-', '+').replace('_', '/')
    while len(b64) % 4 != 0:
        b64 += '='
    data = base64.b64decode(b64)
    salt = data[:16]
    iv = data[16:28]
    ciphertext_and_tag = data[28:]
    # Derivar clave
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100_000,
    )
    key = kdf.derive(contrasena.encode())
    aesgcm = AESGCM(key)
    priv_bytes = aesgcm.decrypt(iv, ciphertext_and_tag, None)
    return priv_bytes

def limpiar_pem(pem: str) -> str:
    '''Extrae el contenido base64 puro de un bloque PEM, sin saltos de línea ni espacios'''
    lines = pem.strip().splitlines()
    base64_lines = [line for line in lines if not line.startswith('-----')]
    return ''.join(base64_lines)

def imprimir_bytea(data: bytes):
    print("\nBYTEA (hex):")
    print(data.hex())
    print("\nBYTEA (Python bytes):")
    print(data)

if __name__ == "__main__":
    try:
        priv = descifrar_clave_privada(CLAVE_CIFRADA.strip(), CONTRASENA.strip())
        pem = priv.decode()
        print("\nClave privada descifrada (PEM):\n")
        print(pem)
        print("\nContenido base64 puro (sin headers ni saltos de línea):\n")
        print(limpiar_pem(pem))
        imprimir_bytea(priv)
    except Exception as e:
        print("Error al descifrar:", e)
