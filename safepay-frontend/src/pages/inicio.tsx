import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Inicio() {
  const [nombre, setNombre] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Intentar obtener el nombre de usuario del localStorage si lo guardaste en el login
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
    <div style={{ textAlign: 'center', marginTop: '3rem' }}>
      <h2>Bienvenido{nombre ? `, ${nombre}` : ''}!</h2>
      <div style={{ marginTop: '2rem' }}>
        <button style={{ marginRight: 16 }} onClick={() => navigate('/transferencia-usuario')}>Transferencia a usuario</button>
        <button onClick={() => navigate('/pagos-seguros')}>Pagos seguros</button>
      </div>
    </div>
  );
}
