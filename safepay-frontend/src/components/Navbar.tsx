import React from 'react';
import ThemeSwitch from './ThemeSwitch';
import { useNavigate, useLocation } from 'react-router-dom';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const userData = localStorage.getItem('userData');
  const nombre = userData ? JSON.parse(userData).nombre : '';

  // Ocultar navbar en login, registro e inicio
  if (["/login", "/registro", "/inicio"].includes(location.pathname)) {
    return <nav className="navbar hide-navbar" />;
  }

  const handleLogout = () => {
    localStorage.clear(); // Borra todo el localStorage para asegurar cierre de sesión
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <span style={{ fontWeight: 700, fontSize: '1.2em', cursor: 'pointer' }} onClick={() => navigate('/inicio')}>
          SafePay <span style={{ color: 'var(--color-primary)' }}>Interbank</span>
        </span>
        <button className="link" onClick={() => navigate('/dashboard')}>Dashboard</button>
        <button className="link" onClick={() => navigate('/pagos-seguros')}>Pagos</button>
        <button className="link" onClick={() => navigate('/transferencia-usuario')}>Transferencias</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {nombre && <span style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>👤 {nombre}</span>}
        <ThemeSwitch />
        {nombre && (
          <button className="link logout-btn" onClick={handleLogout} title="Cerrar sesión" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 18 }}>🔓</span> <span>Salir</span>
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
