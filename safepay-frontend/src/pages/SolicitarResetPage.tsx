import { useState } from 'react';
import { solicitarReset } from '../services/passwordResetService';
import ThemeSwitch from '../components/ThemeSwitch';

export default function SolicitarResetPage() {
  const [correo, setCorreo] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await solicitarReset(correo);
      setSuccess(res.mensaje || 'Si el correo está registrado, recibirás un email con instrucciones.');
    } catch (err: any) {
      setError(err.message || 'Error al solicitar recuperación');
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
        <h2 style={{ textAlign: 'center', color: 'var(--color-primary)' }}>Recuperar contraseña</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <label>
            Correo electrónico
            <input type="email" value={correo} onChange={e => setCorreo(e.target.value)} required />
          </label>
          {error && <div style={{ color: '#e53935', fontWeight: 500, marginTop: 8 }}>{error}</div>}
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Enviando...' : 'Enviar correo de recuperación'}</button>
        </form>
        {success && (
          <div style={{
            marginTop: 24,
            background: '#e3f2fd',
            border: '1.5px solid #2563eb',
            borderRadius: 10,
            padding: 16,
            color: '#2563eb',
            fontWeight: 700,
            textAlign: 'center',
            fontSize: 16
          }}>{success}</div>
        )}
      </div>
    </div>
  );
}
