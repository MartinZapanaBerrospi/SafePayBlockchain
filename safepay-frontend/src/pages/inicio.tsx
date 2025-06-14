import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Inicio() {
  const [nombre, setNombre] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setNombre(parsed.nombre || '');
      } catch {
        setNombre('');
      }
    }
  }, []);

  return (
    <div className="welcome-panel fade-in">
      <h2>Bienvenido{nombre ? `, ${nombre}` : ''}!</h2>
      <div className="welcome-btns">
        <button onClick={() => navigate('/transferencia-usuario')}>
          <span role="img" aria-label="transfer">💸</span> Transferencia a usuario
        </button>
        <button onClick={() => navigate('/pagos-seguros')}>
          <span role="img" aria-label="pagos">💳</span> Pagos seguros
        </button>
        <button onClick={() => navigate('/dashboard')}>
          <span role="img" aria-label="dashboard">📊</span> Dashboard
        </button>
      </div>
    </div>
  );
}
