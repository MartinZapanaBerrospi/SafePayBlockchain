import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { register, checkUsuarioExiste, checkCorreoExiste } from '../services/authService';
import PhoneField from '../components/PhoneField';
import ThemeSwitch from '../components/ThemeSwitch';
import { phoneRules } from '../utils/phoneRules';

export default function RegisterPage() {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [confirmarTouched, setConfirmarTouched] = useState(false);
  const [contrasenaTouched, setContrasenaTouched] = useState(false);
  const [correoTouched, setCorreoTouched] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [clavePrivadaCifrada, setClavePrivadaCifrada] = useState<string | null>(null);
  const [showClaveModal, setShowClaveModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState('PE');
  const [usuarioExiste, setUsuarioExiste] = useState(false);
  const [correoExiste, setCorreoExiste] = useState(false);
  const [usuarioTouched, setUsuarioTouched] = useState(false);
  const [preguntaSecreta, setPreguntaSecreta] = useState('');
  const [respuestaSecreta, setRespuestaSecreta] = useState('');
  const [preguntaTouched, setPreguntaTouched] = useState(false);
  const [respuestaTouched, setRespuestaTouched] = useState(false);
  const navigate = useNavigate();

  // Validaciones en tiempo real
  const isEmailValid = correo.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
  const isPasswordStrong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/.test(contrasena);
  const getPhoneRule = (c: string) => phoneRules[c] || { min: 7, max: 15, example: '' };
  const phoneRule = getPhoneRule(country);
  const phoneDigits = telefono.replace(/\D/g, '');
  const isPhoneValid = phoneDigits.length >= phoneRule.min && phoneDigits.length <= phoneRule.max;
  const isPasswordMatch = contrasena === confirmarContrasena && contrasena.length > 0;
  const preguntasSecretas = [
    '¿Cuál es el nombre de tu primera mascota?',
    '¿En qué ciudad naciste?',
    '¿Cuál es tu comida favorita?',
    '¿Cuál es el nombre de tu mejor amigo de la infancia?',
    '¿Cuál fue tu primer colegio?',
    '¿Cuál es tu película favorita?'
  ];
  const isPreguntaSecretaValid = preguntaSecreta.length > 0;
  const isRespuestaSecretaValid = respuestaSecreta.trim().length > 2;
  const isFormValid = nombre && isEmailValid && isPasswordStrong && isPasswordMatch && isPhoneValid && !usuarioExiste && !correoExiste && isPreguntaSecretaValid && isRespuestaSecretaValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setClavePrivadaCifrada(null);
    setShowClaveModal(false);
    setLoading(true);
    if (!nombre || !telefono || !correo || !contrasena || !confirmarContrasena || !preguntaSecreta || !respuestaSecreta) {
      setError("Completa todos los campos obligatorios.");
      setLoading(false);
      return;
    }
    try {
      const res = await register(nombre, correo, telefono, contrasena, preguntaSecreta, respuestaSecreta);
      if (res.privateKeyEnc && res.privateKeyIv && res.privateKeySalt && res.privateKeyTag) {
        const salt = atob(res.privateKeySalt.replace(/-/g, '+').replace(/_/g, '/'));
        const iv = atob(res.privateKeyIv.replace(/-/g, '+').replace(/_/g, '/'));
        const ciphertext = atob(res.privateKeyEnc.replace(/-/g, '+').replace(/_/g, '/'));
        const tag = atob(res.privateKeyTag.replace(/-/g, '+').replace(/_/g, '/'));
        const allBytes = new Uint8Array(salt.length + iv.length + ciphertext.length + tag.length);
        let offset = 0;
        [salt, iv, ciphertext, tag].forEach((part) => {
          for (let i = 0; i < part.length; i++) {
            allBytes[offset++] = part.charCodeAt(i);
          }
        });
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

  // Icono SVG para error
  const ErrorIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  );

  // Validación usuario/ correo en tiempo real (onChange con debounce)
  const usuarioTimeout = useRef<NodeJS.Timeout | null>(null);
  const correoTimeout = useRef<NodeJS.Timeout | null>(null);

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Icono de tema fuera del cuadro, arriba a la derecha */}
      <div style={{ position: 'absolute', top: 18, right: 24, zIndex: 10 }}>
        <ThemeSwitch />
      </div>
      <div className="register-container" style={{ maxWidth: 400, margin: '2rem auto', background: 'var(--color-card)', borderRadius: 12, boxShadow: '0 2px 12px #2563eb22', padding: 32, position: 'relative' }}>
        <h2 style={{ textAlign: 'center', color: 'var(--color-primary)' }}>Crear cuenta SafePay</h2>
        <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <label style={{ textAlign: 'left', display: 'block', fontWeight: 500 }}>
            Usuario
            <input
              type="text"
              placeholder="Usuario"
              value={nombre}
              onChange={e => {
                setNombre(e.target.value);
                setUsuarioExiste(false);
                if (usuarioTimeout.current) clearTimeout(usuarioTimeout.current);
                const value = e.target.value;
                usuarioTimeout.current = setTimeout(async () => {
                  if (value) {
                    const existe = await checkUsuarioExiste(value);
                    setUsuarioExiste(existe);
                  }
                }, 400);
              }}
              onBlur={async () => {
                setUsuarioTouched(true);
                if (nombre) {
                  const existe = await checkUsuarioExiste(nombre);
                  setUsuarioExiste(existe);
                }
              }}
              required
              autoFocus
              style={{ width: '100%', textAlign: 'left' }}
            />
            {usuarioTouched && usuarioExiste && (
              <div style={{ color: '#e53935', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, marginTop: 4, fontWeight: 500 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e53935" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ minWidth: 18 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Usuario ya registrado.
              </div>
            )}
          </label>
          <label style={{ textAlign: 'left', display: 'block', fontWeight: 500 }}>
            Teléfono
            <PhoneField
              value={telefono}
              onChange={setTelefono}
              country={country}
              setCountry={setCountry}
            />
          </label>
          <label style={{ textAlign: 'left', display: 'block', fontWeight: 500 }}>
            Correo electrónico
            <input
              type="email"
              placeholder="Correo"
              value={correo}
              onChange={e => {
                setCorreo(e.target.value);
                setCorreoExiste(false);
                if (correoTimeout.current) clearTimeout(correoTimeout.current);
                const value = e.target.value;
                correoTimeout.current = setTimeout(async () => {
                  if (value) {
                    const existe = await checkCorreoExiste(value);
                    setCorreoExiste(existe);
                  }
                }, 400);
              }}
              onBlur={async () => {
                if (correo) {
                  const existe = await checkCorreoExiste(correo);
                  setCorreoExiste(existe);
                }
                setCorreoTouched(true);
              }}
              required
              style={{ width: '100%', textAlign: 'left' }}
            />
            {correoTouched && correo && !isEmailValid && (
              <div style={{ color: '#e53935', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, marginTop: 4, fontWeight: 500 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e53935" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ minWidth: 18 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Correo no válido
              </div>
            )}
            {correoTouched && correoExiste && isEmailValid && (
              <div style={{ color: '#e53935', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, marginTop: 4, fontWeight: 500 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e53935" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ minWidth: 18 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Correo ya registrado.
              </div>
            )}
          </label>
          <label style={{ textAlign: 'left', display: 'block', fontWeight: 500 }}>
            Contraseña
            <input
              type="password"
              placeholder="Contraseña (mínimo 8 caracteres, mayúscula, minúscula, número y símbolo)"
              value={contrasena}
              onChange={e => setContrasena(e.target.value)}
              onBlur={() => setContrasenaTouched(true)}
              required
              style={{ width: '100%', textAlign: 'left' }}
            />
            {contrasenaTouched && contrasena && !isPasswordStrong && (
              <div style={{ color: '#e53935', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, marginTop: 4, fontWeight: 500 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e53935" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ minWidth: 18 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Debe tener al menos 8 caracteres, mayúscula, minúscula, número y símbolo.
              </div>
            )}
          </label>
          <label style={{ textAlign: 'left', display: 'block', fontWeight: 500 }}>
            Confirmar contraseña
            <input
              type="password"
              placeholder="Repite la contraseña"
              value={confirmarContrasena}
              onChange={e => setConfirmarContrasena(e.target.value)}
              onBlur={() => setConfirmarTouched(true)}
              required
              style={{ width: '100%', textAlign: 'left' }}
            />
            {confirmarTouched && confirmarContrasena && !isPasswordMatch && (
              <div style={{ color: '#e53935', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, marginTop: 4, fontWeight: 500 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e53935" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ minWidth: 18 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Las contraseñas no coinciden
              </div>
            )}
          </label>
          <label style={{ textAlign: 'left', display: 'block', fontWeight: 500 }}>
            Pregunta secreta
            <select
              value={preguntaSecreta}
              onChange={e => { setPreguntaSecreta(e.target.value); setPreguntaTouched(true); }}
              onBlur={() => setPreguntaTouched(true)}
              required
              style={{ width: '100%', textAlign: 'left' }}
            >
              <option value="">Selecciona una pregunta...</option>
              {preguntasSecretas.map((q, i) => (
                <option key={i} value={q}>{q}</option>
              ))}
            </select>
            {preguntaTouched && !isPreguntaSecretaValid && (
              <div style={{ color: '#e53935', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, marginTop: 4, fontWeight: 500 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e53935" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ minWidth: 18 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Selecciona una pregunta secreta.
              </div>
            )}
          </label>
          <label style={{ textAlign: 'left', display: 'block', fontWeight: 500 }}>
            Respuesta secreta
            <input
              type="text"
              placeholder="Respuesta secreta"
              value={respuestaSecreta}
              onChange={e => { setRespuestaSecreta(e.target.value); setRespuestaTouched(true); }}
              onBlur={() => setRespuestaTouched(true)}
              required
              style={{ width: '100%', textAlign: 'left' }}
            />
            {respuestaTouched && !isRespuestaSecretaValid && (
              <div style={{ color: '#e53935', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, marginTop: 4, fontWeight: 500 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e53935" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ minWidth: 18 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Ingresa una respuesta secreta válida (mínimo 3 caracteres).
              </div>
            )}
          </label>
          {error && (
            <div className="input-error-banner" style={{ textAlign: 'center', marginTop: 0, marginBottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <ErrorIcon /> {error}
            </div>
          )}
          <button type="submit" className="btn-primary" style={{ fontWeight: 600, fontSize: 16, marginTop: 8 }} disabled={loading || !isFormValid}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>
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
    </div>
  );
}
