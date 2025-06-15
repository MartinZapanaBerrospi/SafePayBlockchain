import React from 'react';
import ThemeSwitch from './ThemeSwitch';
import { useNavigate, useLocation } from 'react-router-dom';

const NAV_LINKS = [
  { label: 'Dashboard', path: '/dashboard', icon: '📊' },
  { label: 'Pagos', path: '/pagos-seguros', icon: '💳' },
  { label: 'Transferencias', path: '/transferencia-usuario', icon: '💸' },
  { label: 'Mi Cuenta', path: '/mi-tarjeta', icon: '🏦' },
];

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const userData = localStorage.getItem('userData');
  const nombre = userData ? JSON.parse(userData).nombre : '';

  // Mostrar siempre el ThemeSwitch, incluso en login, registro e inicio
  if (["/login", "/registro", "/inicio"].includes(location.pathname)) {
    return (
      <nav className="navbar navbar-pro" style={{ justifyContent: 'space-between', padding: '0.7em 1.2em' }}>
        <span
          className="navbar-logo"
          style={{ fontWeight: 900, fontSize: '1.5em', letterSpacing: 2, color: 'var(--color-primary)', background: 'rgba(255,255,255,0.22)', borderRadius: 8, padding: '0.1em 0.7em', boxShadow: '0 2px 8px #0002', cursor: 'pointer', textShadow: '0 2px 8px #0008, 0 1px 0 #fff8' }}
        >
          SafePay
        </span>
        <ThemeSwitch />
      </nav>
    );
  }

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  return (
    <nav className="navbar navbar-pro">
      <div className="navbar-left">
        <span
          className="navbar-logo"
          onClick={() => navigate('/inicio')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 900, fontSize: '1.25em', letterSpacing: 1.5 }}
          title="Ir a inicio"
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
            <defs>
              <linearGradient id="shield-gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="var(--color-primary)" />
                <stop offset="100%" stopColor="var(--color-secondary)" />
              </linearGradient>
            </defs>
            <path d="M16 3L28 7.5V15.5C28 23 16 29 16 29C16 29 4 23 4 15.5V7.5L16 3Z" fill="url(#shield-gradient)" stroke="var(--color-accent)" strokeWidth="1.5"/>
            <path d="M16 10V19" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="16" cy="22" r="1.5" fill="#fff"/>
          </svg>
          <span style={{ color: 'var(--color-primary)', fontWeight: 900, fontSize: '1.15em', textShadow: '0 2px 8px #0002' }}>SafePay</span>
        </span>
        <ul className="navbar-links">
          {NAV_LINKS.map(link => (
            <li key={link.path}>
              <button
                className={`navbar-link${location.pathname === link.path ? ' active' : ''}`}
                onClick={() => navigate(link.path)}
                aria-current={location.pathname === link.path ? 'page' : undefined}
              >
                <span className="navbar-link-icon">{link.icon}</span>
                <span>{link.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="navbar-right" style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0 }}>
        {nombre && <span className="navbar-user">👤 {nombre}</span>}
        {nombre && (
          <button className="navbar-link logout-btn" onClick={handleLogout} title="Cerrar sesión" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 18 }}>🔓</span> <span>Salir</span>
          </button>
        )}
        <ThemeSwitch />
      </div>
    </nav>
  );
};

export default Navbar;
