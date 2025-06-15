import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeSwitch from '../components/ThemeSwitch';

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
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div style={{ position: 'absolute', top: 18, right: 24, zIndex: 10 }}>
        <ThemeSwitch />
      </div>
      <div className="welcome-panel fade-in" style={{
        boxShadow: '0 4px 32px #2196f340',
        border: '1.5px solid var(--color-border)',
        maxWidth: 480,
        margin: '7vh auto 0 auto',
        borderRadius: 20,
        background: 'var(--color-card)',
        padding: '2.5em 2em 2em 2em',
        position: 'relative'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5em',
          marginBottom: '1.5em',
          width: '100%'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.7em',
            background: 'linear-gradient(90deg, var(--color-primary) 60%, var(--color-secondary) 100%)',
            color: 'var(--color-button-text)',
            borderRadius: '14px',
            padding: '0.9em 2em',
            fontWeight: 800,
            fontSize: '1.45em',
            boxShadow: '0 2px 16px #2563eb22',
            letterSpacing: '1px',
            border: 'none',
            position: 'relative',
            overflow: 'hidden',
            minWidth: 0,
            width: '100%',
            justifyContent: 'center',
            animation: 'fadeInDown 0.7s'
          }}>
            <span role="img" aria-label="blockchain" style={{ fontSize: '1.5em', filter: 'drop-shadow(0 2px 6px #0003)' }}>🔗</span>
            <span>¡Bienvenido a <span style={{ color: 'var(--color-accent)', fontWeight: 900 }}>SafePay Blockchain</span>{nombre ? `, ${nombre}` : ''}!</span>
          </div>
          <span style={{ color: 'var(--color-primary)', fontWeight: 500, fontSize: '1.05em', marginTop: 6, textAlign: 'center', maxWidth: 340 }}>
            Tu plataforma de pagos seguros y transferencias instantáneas con tecnología blockchain.<br />
            <span style={{ color: 'var(--color-secondary)', fontWeight: 700 }}>Transparencia, confianza y control en cada operación.</span>
          </span>
        </div>
        {cuenta && (
          <div className="cuenta-info" style={{ marginBottom: 18, fontWeight: 500, fontSize: 18, background: 'var(--color-bg)', borderRadius: 10, padding: '0.7em 1.2em', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--color-border)' }}>
            <span role="img" aria-label="cuenta">🏦</span> <span style={{ fontWeight: 600 }}>Cuenta:</span> <span style={{ fontFamily: 'monospace', color: 'var(--color-secondary)', fontWeight: 700 }}>{cuenta}</span>
          </div>
        )}
        <div className="welcome-btns" style={{ marginTop: 10 }}>
          <button onClick={() => navigate('/transferencia-usuario')} style={{ fontWeight: 600 }}>
            <span role="img" aria-label="transfer">💸</span> Transferencia a usuario
          </button>
          <button onClick={() => navigate('/pagos-seguros')} style={{ fontWeight: 600 }}>
            <span role="img" aria-label="pagos">💳</span> Pagos seguros
          </button>
          <button onClick={() => navigate('/dashboard')} style={{ fontWeight: 600 }}>
            <span role="img" aria-label="dashboard">📊</span> Dashboard
          </button>
          <button onClick={() => navigate('/mi-cuenta')} style={{ fontWeight: 600 }}>
            <span role="img" aria-label="cuenta">🏦</span> Mi cuenta
          </button>
        </div>
        <style>{`
          @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-24px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
}
