import { useState, useEffect } from 'react';
import { resetPassword } from '../services/passwordResetService';
import ThemeSwitch from '../components/ThemeSwitch';
import { useLocation } from 'react-router-dom';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [contrasenaTouched, setContrasenaTouched] = useState(false);
  const [confirmarTouched, setConfirmarTouched] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(7); // segundos
  const location = useLocation();

  // Validación de fortaleza igual que en registro
  const isPasswordStrong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/.test(nuevaContrasena);
  const isPasswordMatch = nuevaContrasena === confirmarContrasena && nuevaContrasena.length > 0;

  useEffect(() => {
    // Extraer token del query string si existe
    const params = new URLSearchParams(location.search);
    const tokenFromUrl = params.get('token');
    if (tokenFromUrl) setToken(tokenFromUrl);
  }, [location.search]);

  useEffect(() => {
    if (success.includes('restablecida')) {
      if (redirectCountdown === 0) {
        window.location.href = '/login';
      } else {
        const timer = setTimeout(() => setRedirectCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [success, redirectCountdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!isPasswordStrong) {
      setError('La contraseña no cumple con los requisitos de seguridad.');
      return;
    }
    if (!isPasswordMatch) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      const res = await resetPassword(token, nuevaContrasena);
      setSuccess(res.mensaje || 'Contraseña restablecida correctamente.');
    } catch (err: any) {
      setError(err.message || 'Error al restablecer contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <div style={{ position: 'absolute', top: 18, right: 24, zIndex: 10 }}>
        <ThemeSwitch />
      </div>
      <div style={{ maxWidth: 400, margin: '2rem auto', background: 'var(--color-card)', borderRadius: 12, boxShadow: '0 2px 12px #2563eb22', padding: 32 }}>
        <h2 style={{ textAlign: 'center', color: 'var(--color-primary)' }}>Establecer nueva contraseña</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <label>
            Nueva contraseña
            <input
              type="password"
              value={nuevaContrasena}
              onChange={e => setNuevaContrasena(e.target.value)}
              onBlur={() => setContrasenaTouched(true)}
              required
            />
            {contrasenaTouched && nuevaContrasena && !isPasswordStrong && (
              <div style={{ color: '#e53935', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, marginTop: 4, fontWeight: 500 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e53935" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ minWidth: 18 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Debe tener al menos 8 caracteres, mayúscula, minúscula, número y símbolo.
              </div>
            )}
          </label>
          <label>
            Confirmar nueva contraseña
            <input
              type="password"
              value={confirmarContrasena}
              onChange={e => setConfirmarContrasena(e.target.value)}
              onBlur={() => setConfirmarTouched(true)}
              required
            />
            {confirmarTouched && confirmarContrasena && !isPasswordMatch && (
              <div style={{ color: '#e53935', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, marginTop: 4, fontWeight: 500 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e53935" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ minWidth: 18 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Las contraseñas no coinciden
              </div>
            )}
          </label>
          {error && <div style={{ color: '#e53935', fontWeight: 500 }}>{error}</div>}
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Procesando...' : 'Restablecer contraseña'}</button>
        </form>
        {success && (
          <div style={{
            marginTop: 28,
            background: '#e8f5e9',
            border: '1.5px solid #43a047',
            borderRadius: 10,
            padding: 18,
            color: '#2563eb',
            fontWeight: 700,
            textAlign: 'center',
            fontSize: 17,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
              <span style={{ fontSize: 28, color: '#43a047' }}>✔️</span>
              <span>
                {success.includes('restablecida')
                  ? '¡Tu contraseña ha sido restablecida exitosamente! Ya puedes iniciar sesión con tu nueva contraseña.'
                  : success}
              </span>
            </div>
            {success.includes('restablecida') && (
              <>
                <button
                  onClick={() => window.location.href = '/login'}
                  style={{
                    marginTop: 8,
                    background: 'var(--color-primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 16,
                    padding: '10px 28px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px #2563eb22',
                    transition: 'background 0.2s',
                  }}
                >
                  Ir a iniciar sesión
                </button>
                <div style={{ color: '#388e3c', fontWeight: 500, fontSize: 15, marginTop: 8 }}>
                  Redirigiendo automáticamente en {redirectCountdown} segundos...
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
