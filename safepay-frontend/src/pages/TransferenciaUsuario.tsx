import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// @ts-ignore
import { KJUR, KEYUTIL, hextob64 } from 'jsrsasign';

export default function TransferenciaUsuario() {
  const [cuentas, setCuentas] = useState([]);
  const [cuentaOrigen, setCuentaOrigen] = useState('');
  const [usuarioDestino, setUsuarioDestino] = useState('');
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [claveCifrada, setClaveCifrada] = useState('');
  const [clavePago, setClavePago] = useState('');
  const [latitud, setLatitud] = useState<number|null>(null);
  const [longitud, setLongitud] = useState<number|null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Obtener cuentas del usuario actual (asume que tienes el id_usuario en localStorage)
    const userData = localStorage.getItem('userData');
    let id_usuario = null;
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        id_usuario = parsed.id_usuario;
      } catch {}
    }
    if (!id_usuario) return;
    fetch('/api/cuentas')
      .then(res => res.json())
      .then(data => {
        // Filtrar solo las cuentas activas del usuario actual
        const cuentasUsuario = data.filter((c: any) => c.id_usuario === id_usuario && c.activa);
        setCuentas(cuentasUsuario);
      });
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setLatitud(pos.coords.latitude);
          setLongitud(pos.coords.longitude);
        },
        () => {
          setLatitud(null);
          setLongitud(null);
        }
      );
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje('');
    setError('');
    setLoading(true);
    try {
      // 1. Validar usuario destino existe y obtener su id
      const resUsuario = await fetch(`/api/usuarios/buscar?nombre=${encodeURIComponent(usuarioDestino)}`);
      const dataUsuario = await resUsuario.json();
      if (!dataUsuario.id_usuario) {
        setError('Usuario destino no encontrado');
        setLoading(false);
        return;
      }
      const id_usuario_destino = dataUsuario.id_usuario;
      // 2. Construir mensaje a firmar (cuidando decimales)
      const montoFmt = parseFloat(monto).toFixed(2);
      const mensajeFirma = `${id_usuario_destino}:${cuentaOrigen}:${montoFmt}:${descripcion}`;
      // 3. Obtener clave privada desencriptada (como en PagosSeguros)
      // DEBUG: Mostrar qué hay en localStorage
      console.log('DEBUG localStorage', {
        privateKeyEnc: localStorage.getItem('privateKeyEnc'),
        privateKeyPass: localStorage.getItem('privateKeyPass'),
        privateKeyIv: localStorage.getItem('privateKeyIv'),
        privateKeySalt: localStorage.getItem('privateKeySalt'),
        privateKeyTag: localStorage.getItem('privateKeyTag'),
      });
      console.log('DEBUG campos pegados', { claveCifrada, clavePago });
      // --- Utilidad para descifrar clave privada igual que en PagosSeguros ---
      async function descifrarClavePrivadaPagosSeguros(claveCifrada: string, password: string) {
        // Normalizar base64-url
        let b64 = claveCifrada.replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4 !== 0) b64 += '=';
        const data = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const salt = data.slice(0, 16);
        const iv = data.slice(16, 28);
        const ciphertextAndTag = data.slice(28);
        // Derivar clave
        const keyMaterial = await window.crypto.subtle.importKey(
          'raw',
          new TextEncoder().encode(password),
          { name: 'PBKDF2' },
          false,
          ['deriveKey']
        );
        const key = await window.crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt,
            iterations: 100000,
            hash: 'SHA-256',
          },
          keyMaterial,
          { name: 'AES-GCM', length: 256 },
          false,
          ['decrypt']
        );
        // Descifrar (WebCrypto espera tag al final del ciphertext)
        const decrypted = await window.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          key,
          ciphertextAndTag
        );
        return new TextDecoder().decode(decrypted);
      }
      // --- USAR FLUJO PAGOSSEGUROS: si hay clave cifrada y contraseña, usar ese flujo ---
      let privKeyPem: string;
      if (claveCifrada && clavePago) {
        privKeyPem = await descifrarClavePrivadaPagosSeguros(claveCifrada, clavePago);
      } else {
        // ...flujo localStorage clásico (por compatibilidad, pero se recomienda usar el de arriba)...
        let privKeyEnc = localStorage.getItem('privateKeyEnc');
        let pass = localStorage.getItem('privateKeyPass');
        let privKeyIv = localStorage.getItem('privateKeyIv');
        let privKeySalt = localStorage.getItem('privateKeySalt');
        let privKeyTag = localStorage.getItem('privateKeyTag');
        if (!privKeyEnc || !privKeyIv || !privKeySalt || !privKeyTag || !pass) {
          setError('No se encontró la clave privada. Vuelve a iniciar sesión o pega tu clave cifrada y contraseña.');
          setLoading(false);
          return;
        }
        // ...aquí puedes dejar el flujo anterior si quieres compatibilidad...
        // ...pero lo recomendado es usar el flujo PagosSeguros para todos los casos...
        setError('Por favor pega tu clave privada cifrada y contraseña (flujo PagosSeguros).');
        setLoading(false);
        return;
      }
      // 4. Firmar mensaje (RSA-PSS, saltLength=32, SHA256)
      const sig = new KJUR.crypto.Signature({ alg: 'SHA256withRSAandMGF1', saltlen: 32 });
      const rsaKey = KEYUTIL.getKey(privKeyPem);
      sig.init(rsaKey);
      sig.updateString(mensajeFirma);
      const sigHex = sig.sign();
      const sigB64 = hextob64(sigHex);
      // 5. Enviar transferencia
      let id_dispositivo = null;
      const userData = localStorage.getItem('userData');
      if (userData) {
        try {
          const parsed = JSON.parse(userData);
          id_dispositivo = parsed.id_dispositivo || localStorage.getItem('id_dispositivo');
        } catch {}
      }
      const res = await fetch('/api/transferencia_firma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_usuario_destino,
          id_cuenta_origen: cuentaOrigen,
          monto: montoFmt,
          descripcion,
          firma: sigB64,
          id_dispositivo,
          latitud,
          longitud
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMensaje(data.mensaje + (data.nuevo_saldo ? ` Nuevo saldo: ${data.nuevo_saldo}` : ''));
        setCuentaOrigen('');
        setUsuarioDestino('');
        setMonto('');
        setDescripcion('');
        setClaveCifrada('');
        setClavePago('');
      } else {
        setError(data.mensaje || 'Error en la transferencia');
      }
    } catch (err: any) {
      // Mostrar el error completo en consola y en pantalla
      console.error('Error en la transferencia:', err);
      setError('Error en la transferencia: ' + (err && err.message ? err.message : JSON.stringify(err)));
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto' }}>
      <h2>Transferencia a usuario</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Cuenta de origen:</label>
          <select value={cuentaOrigen} onChange={e => setCuentaOrigen(e.target.value)} required>
            <option value="">Selecciona una cuenta</option>
            {cuentas.map((c: any) => (
              <option key={c.id_cuenta} value={c.id_cuenta}>
                {c.id_cuenta} - Saldo: {c.saldo}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Usuario destino:</label>
          <input value={usuarioDestino} onChange={e => setUsuarioDestino(e.target.value)} required />
        </div>
        <div>
          <label>Monto:</label>
          <input type="number" step="0.01" value={monto} onChange={e => setMonto(e.target.value)} required />
        </div>
        <div>
          <label>Descripción:</label>
          <input value={descripcion} onChange={e => setDescripcion(e.target.value)} required />
        </div>
        <div>
          <label>Clave privada cifrada:<br/>
            <textarea value={claveCifrada} onChange={e => setClaveCifrada(e.target.value)} style={{ width:'100%' }} rows={2} placeholder="Pega aquí tu clave privada cifrada (opcional)" />
          </label>
        </div>
        <div>
          <label>Contraseña para descifrar:<br/>
            <input type="password" value={clavePago} onChange={e => setClavePago(e.target.value)} style={{ width:'100%' }} maxLength={100} placeholder="Solo si pegaste la clave cifrada" />
          </label>
        </div>
        <button type="submit" disabled={loading}>Transferir</button>
      </form>
      {mensaje && <div style={{ color: 'green', marginTop: 16 }}>{mensaje}</div>}
      {error && <div style={{ color: 'red', marginTop: 16 }}>{error}</div>}
      <div style={{ fontSize: '0.95em', color: '#555', marginBottom: 12 }}>
        Si usas el mismo navegador donde te registraste o iniciaste sesión, no necesitas pegar nada. Solo si migras a otro navegador/dispositivo, pega tu clave cifrada y contraseña.
      </div>
      <button style={{ marginTop: 24 }} onClick={() => navigate('/')}>Volver</button>
    </div>
  );
}
