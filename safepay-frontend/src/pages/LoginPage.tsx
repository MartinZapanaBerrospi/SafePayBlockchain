import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';
import { useTheme } from '../theme/ThemeProvider';
import ThemeSwitch from '../components/ThemeSwitch';

export default function LoginPage() {
  const [nombre, setNombre] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setMode } = useTheme();

  // Redirigir automáticamente si ya hay sesión activa
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      navigate('/inicio');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await login(nombre, contrasena);
      // Guarda el nombre de usuario, id_usuario y el token en localStorage para mostrarlo en la página de inicio y filtrar solicitudes
      localStorage.setItem('userData', JSON.stringify({ nombre, id_usuario: res.id_usuario, token: res.token }));
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

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <div style={{ position: 'absolute', top: 18, right: 24, zIndex: 10 }}>
        <ThemeSwitch />
      </div>
      <div className="login-container card fade-in">
        <h2>Iniciar sesión</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Usuario"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={contrasena}
            onChange={e => setContrasena(e.target.value)}
            required
          />
          <button type="submit">Iniciar sesión</button>
        </form>
        {error && <p className="error">{error}</p>}
        <p>
          ¿Sin cuenta?{' '}
          <button className="link" onClick={() => navigate('/registro')}>
            Crear usuario
          </button>
        </p>
      </div>
    </div>
  );
}
