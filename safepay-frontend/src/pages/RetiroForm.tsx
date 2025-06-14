import { useState } from 'react';
import { retirarDinero } from '../services/tarjetaService';

export default function RetiroForm({ id_usuario, tarjetas }: { id_usuario: number, tarjetas: any[] }) {
  const [monto, setMonto] = useState('');
  const [tarjeta, setTarjeta] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  async function handleRetiro(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setError(null);
    try {
      await retirarDinero(id_usuario, parseFloat(monto));
      setShowModal(true);
      setMonto('');
    } catch (e: any) {
      setError(e?.response?.data?.mensaje || 'Error al retirar dinero');
    }
    setLoading(false);
  }

  return (
    <>
      <form onSubmit={handleRetiro} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Monto a retirar"
          value={monto}
          onChange={e => setMonto(e.target.value)}
          required
          style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
        />
        <select
          value={tarjeta}
          onChange={e => setTarjeta(e.target.value)}
          required
          style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
        >
          <option value="">Selecciona tarjeta</option>
          {tarjetas.map((t: any) => (
            <option key={t.id_tarjeta} value={t.id_tarjeta}>
              **** {t.numero_cuenta} (Vence: {t.fecha_vencimiento})
            </option>
          ))}
        </select>
        <button type="submit" disabled={loading || !monto || !tarjeta} style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 16, cursor: 'pointer' }}>
          {loading ? 'Procesando...' : 'Retirar'}
        </button>
        {error && <span style={{ color: 'red', marginLeft: 8 }}>{error}</span>}
      </form>
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 12, boxShadow: '0 2px 16px #0003', textAlign: 'center' }}>
            <h2 style={{ color: '#43a047', marginBottom: 16 }}>Retiro exitoso</h2>
            <p>El retiro se ha realizado correctamente.</p>
            <button onClick={() => setShowModal(false)} style={{ marginTop: 16, background: '#1976d2', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 24px', fontSize: 16, cursor: 'pointer' }}>Cerrar</button>
          </div>
        </div>
      )}
    </>
  );
}
