import { useState } from 'react';
import { resetPassword } from '../services/passwordResetService';
import ThemeSwitch from '../components/ThemeSwitch';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
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
            Token de recuperación
            <input type="text" value={token} onChange={e => setToken(e.target.value)} required />
          </label>
          <label>
            Nueva contraseña
            <input type="password" value={nuevaContrasena} onChange={e => setNuevaContrasena(e.target.value)} required />
          </label>
          {error && <div style={{ color: '#e53935', fontWeight: 500 }}>{error}</div>}
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Procesando...' : 'Restablecer contraseña'}</button>
        </form>
        {success && (
          <div style={{ marginTop: 24, color: '#2563eb', fontWeight: 600, textAlign: 'center' }}>{success}</div>
        )}
      </div>
    </div>
  );
}
