import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';
import { useTheme } from '../theme/ThemeProvider';
import ThemeSwitch from '../components/ThemeSwitch';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [contrasenaTouched, setContrasenaTouched] = useState(false);
  const navigate = useNavigate();
  const { setMode } = useTheme();

  // Redirigir automáticamente si ya hay sesión activa
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      navigate('/inicio');
    }
  }, [navigate]);

  // Validación simple de usuario
  const validateUsuario = (usuario: string) => usuario.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailTouched(true);
    setContrasenaTouched(true);
    if (!validateUsuario(email)) {
      setError('Ingrese su usuario.');
      return;
    }
    if (!contrasena) {
      setError('Ingrese su contraseña.');
      return;
    }
    try {
      const res = await login(email, contrasena);
      // Guarda el nombre de usuario, id_usuario y el token en localStorage para mostrarlo en la página de inicio y filtrar solicitudes
      localStorage.setItem('userData', JSON.stringify({ nombre: email, id_usuario: res.id_usuario, token: res.token }));
      // NUEVO: Guardar claves cifradas y parámetros si vienen en la respuesta
      if (res.privateKeyEnc && res.privateKeyIv && res.privateKeySalt && res.privateKeyTag) {
        localStorage.setItem('privateKeyEnc', res.privateKeyEnc);
        localStorage.setItem('privateKeyIv', res.privateKeyIv);
        localStorage.setItem('privateKeySalt', res.privateKeySalt);
        localStorage.setItem('privateKeyTag', res.privateKeyTag);
        if (contrasena) localStorage.setItem('privateKeyPass', contrasena);
      }
      setMode('dark'); // Activa modo oscuro al iniciar sesión
      navigate('/inicio'); // Redirige a la página de bienvenida
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    }
  };

  // Icono SVG para error
  const ErrorIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  );

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <div style={{ position: 'absolute', top: 18, right: 24, zIndex: 10 }}>
        <ThemeSwitch />
      </div>
      <div className="login-container card fade-in">
        <h2>Iniciar sesión</h2>
        <form onSubmit={handleSubmit} autoComplete="on">
          <label htmlFor="email" style={{ textAlign: 'left', display: 'block', fontWeight: 500 }}>Usuario</label>
          <input
            id="email"
            type="text"
            placeholder="Usuario"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className={emailTouched && !email ? 'input-error' : ''}
            autoFocus
            style={{ textAlign: 'left' }}
          />
          <label htmlFor="contrasena" style={{ textAlign: 'left', display: 'block', fontWeight: 500 }}>Contraseña</label>
          <input
            id="contrasena"
            type="password"
            placeholder="Contraseña"
            value={contrasena}
            onChange={e => setContrasena(e.target.value)}
            required
            className={contrasenaTouched && !contrasena ? 'input-error' : ''}
            style={{ textAlign: 'left' }}
          />
          {error && <div className="input-error-banner" style={{ marginTop: 12, marginBottom: 0, textAlign: 'center' }}><ErrorIcon /> {error}</div>}
          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 16 }}>
            Iniciar sesión
          </button>
        </form>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
          <button className="link" onClick={() => navigate('/registro')} style={{ fontWeight: 600 }}>
            Crear cuenta nueva
          </button>
          <button
            className="link"
            onClick={() => navigate('/solicitar-reset')}
            style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 600 }}
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      </div>
    </div>
  );
}
