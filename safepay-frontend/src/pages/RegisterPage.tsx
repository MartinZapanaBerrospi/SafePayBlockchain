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
  const [clavePrivadaCifrada, setClavePrivadaCifrada] = useState<string | null>(null);
  const [showClaveModal, setShowClaveModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Validaciones en tiempo real
  const isEmailValid = correo.match(/^\S+@\S+\.\S+$/);
  const isPasswordStrong = contrasena.length >= 8;
  const isFormValid = nombre && isEmailValid && isPasswordStrong;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setClavePrivadaCifrada(null);
    setShowClaveModal(false);
    setLoading(true);
    try {
      const res = await register(nombre, correo, telefono, contrasena);
      // Adaptar para backend que devuelve privateKeyEnc, privateKeyIv, privateKeySalt, privateKeyTag
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
        // Codificar todo en base64
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container" style={{ maxWidth: 400, margin: '2rem auto', background: 'var(--color-card)', borderRadius: 12, boxShadow: '0 2px 12px #2563eb22', padding: 32 }}>
      <h2 style={{ textAlign: 'center', color: 'var(--color-primary)' }}>Crear cuenta SafePay</h2>
      <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <label>
          Nombre completo
          <input
            type="text"
            placeholder="Nombre"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            required
            autoFocus
            style={{ width: '100%' }}
          />
        </label>
        <label>
          Correo electrónico
          <input
            type="email"
            placeholder="Correo"
            value={correo}
            onChange={e => setCorreo(e.target.value)}
            required
            style={{ width: '100%' }}
          />
          {!isEmailValid && correo && <span style={{ color: '#b71c1c', fontSize: 12 }}>Correo no válido</span>}
        </label>
        <label>
          Teléfono (opcional)
          <input
            type="text"
            placeholder="Teléfono"
            value={telefono}
            onChange={e => setTelefono(e.target.value)}
            style={{ width: '100%' }}
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            placeholder="Contraseña (mínimo 8 caracteres)"
            value={contrasena}
            onChange={e => setContrasena(e.target.value)}
            required
            style={{ width: '100%' }}
          />
          {!isPasswordStrong && contrasena && <span style={{ color: '#b71c1c', fontSize: 12 }}>Mínimo 8 caracteres</span>}
        </label>
        <button type="submit" className="btn-primary" style={{ fontWeight: 600, fontSize: 16, marginTop: 8 }} disabled={!isFormValid || loading}>
          {loading ? 'Creando usuario...' : 'Crear usuario'}
        </button>
      </form>
      {error && <div className="error" style={{ color: '#b71c1c', marginTop: 12, textAlign: 'center' }}>{error}</div>}
      {success && (
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <p className="success" style={{ color: '#2563eb', fontWeight: 600 }}>{success}</p>
        </div>
      )}
      {showClaveModal && clavePrivadaCifrada && (
        <div style={{
          marginTop: 48,
          marginBottom: 48,
          background: 'linear-gradient(120deg, #fffbe6 0%, #e3f0ff 100%)',
          borderRadius: 18,
          padding: '36px 28px 32px 28px',
          textAlign: 'center',
          border: '2.5px solid #2563eb',
          boxShadow: '0 6px 32px #2563eb33',
          position: 'relative',
          fontSize: 18,
          maxWidth: 520,
          marginLeft: 'auto',
          marginRight: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18, justifyContent: 'center' }}>
            <span style={{ fontSize: 36, color: '#fbc02d', marginRight: 14 }}>🔒</span>
            <span style={{ fontWeight: 700, color: '#1a237e', fontSize: 22, letterSpacing: 0.5 }}>
              ¡Guarda tu clave privada cifrada!
            </span>
          </div>
          <div style={{ margin: '18px 0 0 0', display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
            <input
              type="text"
              value={clavePrivadaCifrada}
              readOnly
              style={{ width: '100%', fontFamily: 'monospace', fontSize: 16, background: '#fffde7', border: '1.5px solid #2563eb', borderRadius: 8, padding: 12, color: '#1a237e', fontWeight: 600, letterSpacing: 0.5 }}
            />
            <button
              style={{ marginLeft: 12, fontSize: 15, padding: '10px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px #2563eb22' }}
              onClick={() => { if(clavePrivadaCifrada) navigator.clipboard.writeText(clavePrivadaCifrada); }}
              type="button"
            >
              Copiar
            </button>
            <button
              style={{ marginLeft: 10, fontSize: 15, padding: '10px 16px', background: '#43a047', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px #43a04722' }}
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
          <div style={{ color:'#b71c1c', fontSize:16, marginTop: 18, fontWeight: 500, textAlign: 'center', lineHeight: 1.5 }}>
            Esta clave es única y solo se muestra una vez.<br/>
            Guárdala en un lugar seguro. La necesitarás junto con tu contraseña para firmar pagos y acceder a funciones avanzadas.
          </div>
        </div>
      )}
      <p style={{ textAlign: 'center', marginTop: 36, marginBottom: 0 }}>
        <button className="link" onClick={() => navigate('/login')} style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600, fontSize: 16, padding: '10px 24px', borderRadius: 8, margin: '0 auto', display: 'inline-block' }}>
          ¿Ya tienes cuenta? Iniciar sesión
        </button>
      </p>
    </div>
  );
}
