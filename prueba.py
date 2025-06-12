import base64
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# Pega aquí tu clave privada cifrada (base64-url) y la contraseña
CLAVE_CIFRADA = """l2MIid8teV0C-fcDq0jFHNYqyEllJGE1hKRzsRkNABuHO3tk_uCuYSFPlLj9jrVKdPGO6WJof8ou_Nbi_FbE6I5e68GOzi6rvB0iTnYVQfGt0pSyIPRz6QNpA7g1A2dWL7DhM2kCNZ9zRxhGgiGbEq9jCCThwPJmx7Ewq4gjtG2GU4jl7YTSHCvC8dmukG9xfy79jehcW6mKEpdoRtvnHdvZsA2swtxBUAH6TcQlEQyQWuANxV9DdT8ybI-eyI63Aw1axpZ-WwnOKTHaY2QSO_AgDNf5fVqO3jej695njn1CT7TSlfdBZLpuThKrVtPNN3UZ_P_AwlVz7vf3CFLGiWq9UWWFhaaqbDSN-Ws4LyHHZpNLUreXEBF08VGOIG8SZAxqxIhS5ekpUnmLtzi5-ezZcSGh6D7jJ9pSADDaY7QTxDPVdnk0KaGe0S_J4dV_FPOZwJnF9tD1oY_byFSMiLujfIjhE00OfobGF0LvhU_UtHrteQJZ6z9P0Z5o5i4NjU048k-zo2YC2jvJJuEpxSRZiCX9HZjRkyUdZcy66jKc8HYCbp6cTMO2uBcQ9GJKeokOmNJmTP5jY8UyXuyCdiELe7g72t1iKCqyW17hCYF7TFq0pa_c9ux4ldnYIcs9r2P69qt8TEpidx1oUSyc31kiUoYkJg5XTiRQULTEHI-TvymjsQEGbpzAxyH9ZgCLyJYYjU-O8CMop8DPsHeN1K6I5iC76dNDiMyLI7MYqLyiCbgzS1tpI9S8rYDpmDMLbjvC5MNwkefYM3ZcJNgOkilLqDqRAxS_AcZxA027XuD6P7chHsMAoemjMnlSZwR1ivPSsIQkg-1II0pZJjwox9TLtVePCyViq326EPPYv0mBB6bdWCoNr7iQTe40uF1iZ1MiYF4yy1ktt0PUgQum5c8_B8UxHieNYO0622dp1g2QxLDsPxAg5gK9ncrQ6-jHcVPOyNkKKBS2Z8mPhGzuYvjL_AAb72GckWMVOnMC3xQ08ZqnjD8pLwaeidSbh28GtSddWdkTk_N0CsQIfsF83Y-O74ntxA0lXPrXFm5Yscb7GtnLP30bV_Rx7J5mrxYR0ki-9MAMdDIiZoQGmWkDoDRH2dUaQ2KFAUfgw0aTZLeuMhzE6joTYCymXktHxMgp1VRwjXIv6Z5Q6P9b9iO1IZzBdIp5a0VgjdP1o3utFxjKNNrdAxs0v_Y1CtTUbWykKSZWldkNArBLdTH-QvZhDGOhvSl6e29eGqD4j1NYQG9WmtBBDxJLmHvCPZsjYKJuc-d_IsMFan8sRvEhgx_Co8_p7Pi5q1LKpWxBBHk1XSn-1pMFE89euza7oJ30dpfGVL0Iz5qY2ng7Q0kdNCB5mF9-Jn34eNf1qzkck_SHDXUuGa4IWclELwRa6YvGS85De-tFwLxA_VWUQZ5fYf-Yg4CfS4QpfG7e6Ph2CHQ3P9cnZ2-lAVGD7vCjPPmoAeuaGs-iyLBxuTl2rwkYkTgW8G3XMpOc6Dg8ei9QW6JOLFNWgkSaqLJE--QmzoKM1wAwC4vw6jl3qJTc2OGAQ_O4M17yndwrHd5_bL5XFQel-ZEJOMjxRIAjPtbF2CM4sZ94-kmq9LEIA-Iku4gl991Cm2w6sJDTJ03zZNfhcmFM3jgr6AQAw7tiZfcpcswU1Wve7g-UlmiuXqxFKgFtL-j7XTr9C0_saXWgDVDrxroQCTLvLtXaVS2_jbjz_Qx9MEOpaWChC0Hsk0tNRsw_EkUJthBs3wmNi-lpF7kP-V8XEx5bb-WG1y7suG6L3I3yx6vNg4IEo8YulmHnm0y5c-R07HtRbGlQPLhy1iAduwuTfjdv6SCodRgSbjRAIhaKwJVSt5bK1pEO89TuMmpo0TqeeY8ADuM10zF8NjJ6XBc98PT2o1NZ4XC_3ZU1exXM_snNJDPzdivXIaqNSnsrpDpZ1msi0ikaH0H029jxVVzcUG4jtFez4Inooh95DWsWQVkdHyRUK9ksyiB9mImI_P9aSOfTo94eTRSdebjo9U04Go6KeO5sqsVOdCtlmHpTk5IoPk9XlTilzvRS_njGiEIJ-hb4Li4lnwQz5PlST3W7dFOfU8aJ7rtOpZtk9mQCnC64eopAY7jCxbcvTZOJDAOMIafZ_QzpOcn_zQrO2eyKBr1HnNK73SNY99gbsbqMqdNcdjpHdjSO31an_qDYFNXiWLussKOm0WRiuLOhCkgm-uOE0SolzLqVYBCE5zBx8t3FLF8ESJPI9CCCKm_-304blOQ9rMWPM6yFxl9DthPxnJpCmRVGnnrDxWO4h3p3lDyNafa9RiZOAuicuRAyAkn8oEyQ3yz8XCYmRlcyiteWVogZ4V8ktYrbDrOf5zrUgPUk-e_-VuFU2voYby9lTBKSZ5FQtmF5e2UcfV8C_kS0aKbrb9jF_fr4-MzC_1PV3sefHDkXveV7vQjAzfF_xEM2M8vIHybDyry_VyI8DqdVLTEPhK-RClZVam3_hBTAH9LuA8NfnuDLeD1c6Z2JLpSpwPbjTM4F0urND16JxFqLZkHWFaRFnkIuFj6RHAScIdptL1CRIpZ9clPmFa5sq7lN-Gxt7eBi5--7rtmETkgUK2XIfIVLZhYqTNkTJH1GR5gkfciDxJF1I748NI3dd2TcoGEE_ESdtwRqDmOLVKzatbF9xd3ptSounqKt9uATT2xehGubRAII-Zu8dPSwf-iBhjpPhLX7iYFvEreLbdnZY59N4eDKaUH__iaD6hdc_lKXgX9WoylHU963jMwtkIrJ8-B9bceCdTrRI_yh9Nk-sJet0T3vSiBrhF-Wp8tLvL09Sl1dDQaHeV9O2xh_u6X2A4Km_EUnsJ1aedRyuCLQztmWIwngjhzF5omnRl6usHi3y-Vq6sKQy0j1JVUXISHeTVrBHrePXdU-AROx1qDZqVn_eMD9zCgN18EXYCaaOvTpkk_yjSBnKUfHGDDo9V7ezy1RDwIaMooM1BXaNEsz0ahwkgyi9UP-lwYI11__pU67fwrunT0kv7_gKDsCZrM_fe83-0NrbmrijWujInNEi1OJR039byatl1zHxpnKszZEJJRD3GHNTzm_mEuP6TH1JtbE8jKLj8r1TzczBJWMTnjKdRF-6o3e7V2yEQKZIzS54xt4FOjcyCvloHMm-wOYtOyO2s_A2FbUyHNqyV90UWyD3UUO5XIIqO7Uyt4B360YgkZSOKCpo2LZAOcuyTFGv2a2trBCnfTfCnp1Eat6gmrEPESln8SEO_dWUz9FXeGmiLrJHc6SCmP72ycc6R9147lIsxm5YIX2eMnS6o_ci_csnoDiwsLk_rnH5WokzShs3Mj_OgiEFAaiCOvmUJP_7XBJzEX0mLK2JhjEJl5vKFqgNc0n8Ou0zan_79WLZ5WwfmDq1SdvgS7XqxQUemSjZ5PLUZ2YibdFdcTVVaUPe6M8njkupvHAbhXwdtU5Ucf_sPKfdy9mAAgc6yR4pYs1eMqtnaNPMpGAFQK0liI7VgH-3kxBZOJ5IsSeI2u6rIoGWDXjMl29W2Ibo1slyladoHCq87V0JEpHTDxQouZd1cbYBGnLHq2iS9tiuIaRIdkfYLSFnH-3T5QEhG_kcdXCwjmQXXUU7DbNqefELxrJuvTp-BgPdmwzAs5a9mcu5RtI2WE4WPpsXIyoLoRFcWjLluVs2hguykX2UNOF4kB97hii12WuLNVEkxAsGkWSVmIhjR3grGkUQzp01JWcP9aNUDrhlAtYvEk6m4gO6WysszD08JEzbsyYi94JcNxPY4Pq_ATTBDHsC_jFEBrDaM-befTTRdl5PypdaMNY_EszfTmq6_rt07JEQE4zwTgwgxp00t2JVV0SS1JDesad5NuyXO4p76M9hin6vUZ55oFXeyq-dw-KZJ2w7gGvFPtLgPv35smQ4tfjU64UGuq8bmtLnVmV53Pnuzjt8bz8A7dgVBZpjxyFwPaT3ZuKOy-ZAudAby-qiFTzVxWMa3e0Qz6pE8qFdqAJicRjMrPRsMcblkrrjWRKmCop4OkjkpburlnGqNYwl-sCymdt2xcTBYt8ZvrOLqP9dctnD_4CDN1Nr3pTrt2jB1y3WP4i4SevTKvpwXjgPoOq2qM68K1SRQ2bMyrEZqX9FwX8hRNITdsJvfbeL-fRiq3TO90QsXx6honjLnXW2u_MmeTaa9RIKYIsJcw591s3n513PR-R9G97OWbZQjc7u7MZzhiAne5p0oobD9SfC0XoiO04Sh3nkhF50YZZJDpG2b9iI1ir3FaJQ5w28H6olYCB_8yDdVBD0oXPjzRIukcKzNyoZwZDJXzfNvX5dlDUzvSQtMNlidRnOprnfhm4yrl2CfM1Hgf7ZHAv_RxGutc7OcnxssGL3-rMNgSFHyrvslLQ2Z3pMYP2JbN6T7bp1TVTmr5XfFaGUNvc8EbVBAy03N0cQDxnSUAmA5xteYMTu1yQFnY3B2boHnSyAKteCsBLzlo6JUi5TG67_YxLoIiXuoLwD3gpXqm2xKhXybMOxpQkHpman8Y6L6HfPAF2NkHe8iKNTeUNBsj2x58wzxvl7G1VZop1TIQzd2BCdQHM2tzlkGIV9WK4gBX3UbT432jSVYCKkb3Ly_Hu-CMmL1IT"""
CONTRASENA = "qwe"

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
