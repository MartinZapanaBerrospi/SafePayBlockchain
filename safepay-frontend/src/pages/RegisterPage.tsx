import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../services/authService';

export default function RegisterPage() {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [clavePrivada, setClavePrivada] = useState<string | null>(null);
  const [clavePrivadaCifrada, setClavePrivadaCifrada] = useState<string | null>(null);
  const [showClaveModal, setShowClaveModal] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setClavePrivada(null);
    setClavePrivadaCifrada(null);
    setShowClaveModal(false);
    try {
      const res = await register(nombre, correo, telefono, contrasena);
      // Formato antiguo: concatenar salt + iv + ciphertext + tag en base64
      if (res.privateKeyEnc && res.privateKeyIv && res.privateKeySalt && res.privateKeyTag) {
        // Decodificar cada parte
        const salt = atob(res.privateKeySalt.replace(/-/g, '+').replace(/_/g, '/'));
        const iv = atob(res.privateKeyIv.replace(/-/g, '+').replace(/_/g, '/'));
        const ciphertext = atob(res.privateKeyEnc.replace(/-/g, '+').replace(/_/g, '/'));
        const tag = atob(res.privateKeyTag.replace(/-/g, '+').replace(/_/g, '/'));
        // Unir todo en un solo Uint8Array
        const allBytes = new Uint8Array(salt.length + iv.length + ciphertext.length + tag.length);
        let offset = 0;
        [salt, iv, ciphertext, tag].forEach((part) => {
          for (let i = 0; i < part.length; i++) {
            allBytes[offset++] = part.charCodeAt(i);
          }
        });
        // Codificar todo en base64 (formato antiguo)
        const claveCifrada = btoa(String.fromCharCode(...allBytes));
        setClavePrivadaCifrada(claveCifrada);
        setShowClaveModal(true);
        setSuccess('Usuario creado correctamente. Guarda tu clave privada cifrada.');
      } else if (res.clave_privada_cifrada) {
        setClavePrivadaCifrada(res.clave_privada_cifrada);
        setShowClaveModal(true);
        setSuccess('Usuario creado correctamente. Guarda tu clave privada cifrada.');
      } else {
        setSuccess('Usuario creado correctamente.');
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear usuario');
    }
  };

  return (
    <div className="register-container">
      <h2>Crear usuario</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Nombre"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Correo"
          value={correo}
          onChange={e => setCorreo(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Teléfono"
          value={telefono}
          onChange={e => setTelefono(e.target.value)}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={contrasena}
          onChange={e => setContrasena(e.target.value)}
          required
        />
        <button type="submit">Crear usuario</button>
      </form>
      {error && <p className="error">{error}</p>}
      {success && (
        <div style={{ marginTop: 20 }}>
          <p className="success">{success}</p>
          {clavePrivadaCifrada && (
            <div style={{ marginTop: 16, background: '#f5f5f5', borderRadius: 8, padding: 16, textAlign: 'left', position: 'relative' }}>
              <span style={{ fontWeight: 'bold', color: '#b71c1c' }}>Clave privada cifrada:</span>
              <div style={{ margin: '8px 0', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  value={clavePrivadaCifrada}
                  readOnly
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: 13, background: '#eee', border: '1px solid #ccc', borderRadius: 4, padding: 6 }}
                />
                <button
                  style={{ marginLeft: 8, fontSize: 13, padding: '6px 10px' }}
                  onClick={() => { if(clavePrivadaCifrada) navigator.clipboard.writeText(clavePrivadaCifrada); }}
                  type="button"
                >
                  Copiar
                </button>
                <button
                  style={{ marginLeft: 8, fontSize: 13, padding: '6px 10px' }}
                  onClick={() => {
                    if (clavePrivadaCifrada) {
                      const blob = new Blob([clavePrivadaCifrada], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'clave_privada_cifrada.txt';
                      document.body.appendChild(a);
                      a.click();
                      setTimeout(() => {
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }, 100);
                    }
                  }}
                  type="button"
                >
                  Descargar
                </button>
              </div>
              <div style={{ color:'#888', fontSize:12 }}>Guárdala en un lugar seguro. Solo se muestra aquí una vez. Necesitarás tu contraseña para descifrarla y firmar pagos.</div>
            </div>
          )}
        </div>
      )}
      <p>
        <button className="link" onClick={() => navigate('/login')}>
          Iniciar sesión
        </button>
      </p>
    </div>
  );
}
