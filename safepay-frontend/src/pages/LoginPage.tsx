import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/authService';

export default function LoginPage() {
  const [nombre, setNombre] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(nombre, contrasena);
      // Guarda el nombre de usuario en localStorage para mostrarlo en la página de inicio
      localStorage.setItem('userData', JSON.stringify({ nombre }));
      navigate('/inicio'); // Redirige a la página de bienvenida
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    }
  };

  return (
    <div className="login-container">
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
  );
}
