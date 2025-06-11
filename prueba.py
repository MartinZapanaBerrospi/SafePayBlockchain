import base64
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# Pega aquí tu clave privada cifrada (base64-url) y la contraseña
CLAVE_CIFRADA = """dugbHws5hOItZAwm54mn3dzagwJGH_rK8rT1CmWyzaL8tSplo1YsyhqdSGC_IeCQ-dfFStYNFQ8JvfGxco-YlEXt9x0ZHwi_AG3Diuo6XYlU3R5oSf-9Hi3M7w5dQd4j7Zn-ZcndTGBgXg9Nza8XZp2Lxf1NLyzgOd3kn00yxgi0ZpbikUxsr6fRaMv5bydSgNDcRBZvsbA8g_3AA6xYPJ7Y_XpWuGyfT6ry27OFekzMf6Yr0dZ9RQUIVjkFUmhJEVTIIoUnmb43cx1KgzRQRYeeJTEiD389KM2i0MU7Fq-rcT31K9ifmKqgRZH5YmGzSnB28vEQitVD3Hkbc7TzHxZvchthbf71JnuY-1xk22Ax1jQ48eCX2X_aN7dUuTQYjHfh-PD8i9_UFWOjlsbT4APNNy47gunIasluJzLJ_NJM1zjBwBxtR6vz-1sHOENI3JvXzgswSo6LFeM-X-cnlW-BPVPbfrAzahSvO-dS2rMs8SH7gOoD6P13Pkhlzc2lxnEKW9X8R0zLllRQkpw4a39Nxo8mpQLRWWu0V09wtVT8Ps9n4TCMRYXh4-wIy5nTVYyfu9wkiMQYITWLZVIcsE8471XE1W9CDyHdHf_u2miSRpr_visDPbHR71dbPYhMu7dmVugYaKgx1fyaYOr73CquEKaw10_PHUXa753fVYlOaw4mdOJehceVDVk1V4tZwF7SfP8o2WluuT08BKMcvZf69A4fyxqbfYJY-vKFrh2ezhNgPsjrF0ozK0rBOhC5AIw2cxyLneBok23FjfTecg2ShT5uBWubqxAOauiPvj381a1tHRhFnS52h2W735uSuzKKdynpRVnMrAl30_HnFXS-29L_KS6RD67i0coey1YozhFd7TvN7_4cxoZlY0_NBWzxGXa_mY-OXJ23PXZtcuI_SD_Z3vYCA_OSBpDnwr0ilL1rx_8ol3Qps95kMS2DLyklX4GPv-7h9-lJrjhVkTBtW7r_OarTTsZMXzrrEd8iqjg5roVHtRLtMM3o597cZkTedWkL7BNjQOPZ1tk7XibIoo94lIxuM_H4_sOTaXXoPJJ06wtd1rnhJ7SLv_Ikbs9sOoENrPSeEtdKexvB-YI37RO8M7PHUjIOz_h1SYR2lqKFfxNW2jNNhuEF9kq7iJ8SQP-__MiQ2Rb-h7EbyKEp5nfPb2IsV9tgj-EFZjx-T-GOEPetXVe28X3r8rHdSUZysYK85uFz6BaGHV128G5eAK5I1z3ZbRp8Nr4lQBZB7bJ4H-KxKxE0dNIYlEii6CC1VM69vzCW1wLprqVFU9KwjQhjwhBpAweHSd2LQRwlUHGLaF0B8XZru3fswu4O_lDilUp7XHyPL82fVXTd92pKwrkAVZTXNAFxc6n3Sys11wr0nfEvWDISiYbgy9HNGC_46ZxDXU1OU7fsSte4P4aJzIAd6uXjpB8ctoL3fxy8yvbu78COiIGTuLxfbb3uXZclVXCkuEWe9xzlPeHf0MeAAYsMJObummhObDtLCtGRro0hADChkOD6hgzTqPUFRh-BcbiFqMlaKtrezKLoHEK_9bMxzyX8TiptG3SgtxIwCFDVMDnVAJpmGbR4_RXyLvSFrtkG-gBOBtR7AftvQTx34ITA-N87-8u3pyUg5gCvGnp3PthPyUUeDi85livORa8wR-fVLcD4UtBSLFPRiNvb6276g0H7AlTTuLBPZ8i7DgfhVXVrsgiKuRF1YfKHRPhA3cem8sm3Hx6kB0r4GxvBJPWPgr8L_ZV3qguFG2BMoq90WEoRVbmJNYwloEMZ0gpzVYdcI1QqBfqXl4FzYhVy1sHYZggYeST3fEB-j-YMUxrpeXwPb90LTGaDFgdVq-4M_RuhJa4yQYjViF5DJMCeXFul-oiAJNQIz-_-zRlIpQitv6iTO_MsorcNo09GWFIui8woe3dW9uvcT4gNhmXjcP3TmPHKDfIM-pxK3oJPQ79Qce0SKSu7XoPAMZ9XnsRJI-P0cv1ARIgJfJZpXakmw2YOjTOK_jb2StIQxboDr0rhAgIA0dgPzzXEqa4WQMDKiY4-Jn710ww4oDwUiyWXFH_CBnxbsIyKo2v4twFBYHZVQpcf4G31I01NWvR03Qkwrk1RIFv6wUSRbMN9Ue1pAdf49btdqIUyJeY13weza2i8OycvV1P2yxy7HxL2SdJqIsOMMG3z0AsltIcGfBz3cFcAtZ4GEdpDXNMp66iOTixjkkZc9b7vDbXsojzci6hyp3bGVhoeG5PmIdZ7zWZOnOlHHEjHJGw5FbXOMXoKlWgUUNXzJNOndilOsWJYxqBez-ql4gd2EDlFee_DRy1RLUQ7o1jk4n2RdEmUGdttyYtDAV7Ust6drJsqa5PqedB1IjOjuYp_GRywN_HTtHbeyQlxiF0jAcWON-XlkeSyn1z0XJ7-Y3jAI5JeIPXpYKRe9rr_Rh_12nzM-zbVQ2viJ16_0vJr-OyBLcuEhyw8LHCpjRuuKQwhfLWp7Z8qsuLNs3s5J0CTdWmDK444JTOOCH0qohfhM5te400S0bPu_-cYZTJ3M6JmAdrUVZupN5vYm9LlPGnWc6uGcc9Bzq0GisdcgU73RliWf3s-mlTDa7GA9FXOX-RrreQQMGhEA-DtOanyhtuI9Bse_Y05LyQ5RL-kV6AxCBkveN_p_hLPRm0AUkivgyVtsYAwMVOM4kiDDykISBl5xOymv3DP9z1d8Zf7hDaKmw1nn-Yad33j8xJ55w28-kprdDFU_U1XMdAE9_BJSe9FnYFYZ43DryszapiIN5EaL3mpQr5ZKmI0ozjvCpJxBSXdrYXF4Gx3W87u0dt_9QxBL2mP--rFVG0DWvpZBFHQo5ul1zpJIJjpFAvg7rXP9aU2k2q_ppEZwIOzhS3_2c5deQl6XYqqOf8rD4oZ5SL7Kntjg7bcGTYYYSGy9_81ClgrP0C5280NFXTJCiOHWPeb8l8oyrkNoRQA7TU_Wioj6o9Ebt_W70myR3nMZCq2Yk5YNamOA6pOkodcChgqpWGthlIOh-TqqjHkRh_8rG7FbGaXhJZ1YZpG63A4gL0GsQcuSXBD9KzJhHOPB8J0l9tLvp4ZxOcx10qKObyFvfgB2gRe-nW1Q2M76M7HfQiKKA9SEBQInW6XzXi5DIxMc6PB9_LiVHiXksXOOlymK2arRHXw9zEgW9bUkopWf9g3Y4rqvpudcQfEjlrR4aGbaMq6I3NMxsag3PYl-yjAzY2fYU7fhyGBGUa4zrK2nqzSXjjTFl8lvOEW3HedFZ-05LGXhHQZANJTEw87Ljxlkt4yqPdRRLE_cMw4J4sDEcVIk2SSzIfXOQX8mj4YYfOETd6FUsvc0TbKL_uZgmOBAaGa5P3DudVmXNE-Y4pORACfnzVVqPdHtH0f9sSz_NW9Pv7RogxqV_b78AZ4rgmKpQiLBU56vBMpml1sR4130wbdlkOg-GDd2cDyHBGfMXokVlLMIK_HkYReJ3B6AKhzxQbnmKwPglKdw7yyuGlqHtyaDCloXwmW805xAC08RWS-NpXys6s5nVVvDvJ5S64fXnge1mo81AmB3UCwj1xQNJ7YuVeYWyvIZL-U3GAqKdFspASoho0o73jYdSzzMolhi63uT5-WFveMnb7PvfX1mP7d84GDxemFbkPuoPF59MuVy_XvmwadjWWRTWlE1ayzFoTGwJ8VYL_Glk9SBV-xL1gj6slU1_amkBilir6_ENutbuYA7Zv4_nAc-iSL0HjZ9uOD-07Q-HvJlppLtY4XALSg1tKgZfBPPZoQJdN2J_DCIL9LOPIy66vVp8s99lldGE8u0OXxLLw-T8ZN1WqmCbyyi-Wde_fKBnXlKs3es8v3ouNpbQ1yVabRRgTnFYfVEYjNiCQUZb4fGlOWYSJ3zPCAm1djOAPPbxBtieIKKBEWrExyRy16exro-K9ChboVoY7JzqoW1pcUajsKbvbo_1VnveeoIFCAw8ZGEfQbYrFiM7oI5EJi-q8h8qUUY1Ng5ayj-XOlDcgILvtqfmK2fQ4CN4b2Vc1Pcg7cA19hvdJSxSi-4IcVudQdOWbmPvDFELOEOqugdroQDgg6XldNYSxnB9ln5Qpa45tmrH1UGQCsNHXn1_udovx-md-uvB7cK8-Nyj0tJ793E5NWq4T4FEuTui8JjkLoqGQeLWcI86ia64_cKqCHM38vkuwR6m1RSd0MFyR4OQ5vcHpwV_5b-jGGFBl2HfFPLvQu434o7nkX9nGgxQzawGj4WYU9muiGmd7Pp00Y2ZBkjreQ025_a4NOyY0UR9ImlhyGCiU9HNCoytExVpwQOw70h0AC3I0ZJY9lsUSa-NPBmJ_trBqt4KyQS81GzULWm4B9hoeYkbJG_Gim8g4AvDW6CpO3sEsHghoheBHP8QQu9-F-vRCyCVdaAr5xqiuj0wXad0wN4KzEF32zu6tC5fT6nVZtYjDX7laG0s7uXNwYs-z5dJjnIoZSJ18gTmtXVyVKPB_Le8XfT5j4SJHRvnIlmw9VuwIw3roKcFyliTSAiv2pZr0qucDVvRm5l_ig67a0MoDmeeyeF045Lysitai9bGsPiUotqXGdv9S4tsYMyajefGSO3r7Wb7309iJ6eg=="""
CONTRASENA = "seteley"

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
