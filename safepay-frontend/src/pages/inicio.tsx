import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Inicio() {
  const [nombre, setNombre] = useState('');
  const [cuenta, setCuenta] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setNombre(parsed.nombre || '');
        setCuenta(parsed.cuenta || ''); // Asume que el número de cuenta está en userData.cuenta
      } catch {
        setNombre('');
        setCuenta('');
      }
    }
  }, []);

  return (
    <div className="welcome-panel fade-in">
      <h2>Bienvenido{nombre ? `, ${nombre}` : ''}!</h2>
      {cuenta && (
        <div className="cuenta-info" style={{ marginBottom: 16, fontWeight: 500, fontSize: 18 }}>
          <span role="img" aria-label="cuenta">🏦</span> Cuenta: <span style={{ fontFamily: 'monospace', color: '#1976d2' }}>{cuenta}</span>
        </div>
      )}
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
        <button onClick={() => navigate('/mi-cuenta')}>
          <span role="img" aria-label="cuenta">🏦</span> Mi cuenta
        </button>
      </div>
    </div>
  );
}
