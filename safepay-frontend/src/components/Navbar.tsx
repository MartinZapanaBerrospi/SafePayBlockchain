import React from 'react';
import ThemeSwitch from './ThemeSwitch';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../theme/ThemeProvider';

const NAV_LINKS = [
  { label: 'Dashboard', path: '/dashboard', icon: '📊' },
  { label: 'Pagos', path: '/pagos-seguros', icon: '💳' },
  { label: 'Transferencias', path: '/transferencia-usuario', icon: '💸' },
  { label: 'Mi Cuenta', path: '/mi-tarjeta', icon: '🏦' },
];

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode } = useTheme();
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
    <nav className="navbar navbar-pro" style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 100, boxShadow: '0 2px 16px #00336618' }}>
      <div className="navbar-left">
        <span
          className="navbar-logo"
          onClick={() => navigate('/inicio')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 900, fontSize: '1.05em', letterSpacing: 1.2, padding: 0 }}
          title="Ir a inicio"
        >
          <svg width="26" height="26" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
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
      <div className="navbar-right" style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <button
          className="navbar-link"
          onClick={() => navigate('/generar-clave-privada')}
          style={{
            color: mode === 'dark' ? 'var(--color-accent)' : 'var(--color-primary)',
            background: mode === 'dark' ? 'rgba(96,165,250,0.08)' : 'rgba(37,99,235,0.08)',
            border: `1.5px solid ${mode === 'dark' ? 'var(--color-accent)' : 'var(--color-primary)'}`,
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 15,
            padding: '7px 12px',
            boxShadow: mode === 'dark' ? '0 2px 8px #0004' : '0 2px 8px #2563eb22',
            cursor: 'pointer',
            textDecoration: 'none',
            transition: 'background 0.2s, color 0.2s',
            outline: 'none',
            whiteSpace: 'nowrap',
            // Contraste extra para fondo oscuro o claro
            textShadow: mode === 'dark' ? '0 1px 2px #000, 0 0 2px #000' : '0 1px 2px #fff, 0 0 2px #fff',
            filter: 'drop-shadow(0 1px 2px #0001)',
          }}
        >
          <span style={{ marginRight: 5, fontSize: 17, color: 'inherit' }}>🔑</span> <span style={{ color: 'inherit' }}>Generar clave</span>
        </button>
        {nombre && <span className="navbar-user" style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 15 }}>👤 {nombre}</span>}
        {nombre && (
          <button className="navbar-link logout-btn" onClick={handleLogout} title="Cerrar sesión" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15 }}>
            <span style={{ fontSize: 17 }}>🔓</span> <span>Salir</span>
          </button>
        )}
        <ThemeSwitch />
      </div>
    </nav>
  );
};

export default Navbar;
