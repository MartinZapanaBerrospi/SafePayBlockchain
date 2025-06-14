import React, { useEffect, useState } from 'react';
import { getTarjetas, agregarTarjeta, eliminarTarjeta, retirarDinero } from '../services/tarjetaService';
import { getCuenta, getTransacciones } from '../services/cuentaService';

export default function MiTarjeta() {
  const [tarjetas, setTarjetas] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ numero_cuenta: '', fecha_vencimiento: '', cvv: '' });
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cuenta, setCuenta] = useState<any>(null);
  const [transacciones, setTransacciones] = useState<any[]>([]);
  const [retiro, setRetiro] = useState({ monto: '', tarjeta: '' });
  const [showModal, setShowModal] = useState(false);

  const userData = localStorage.getItem('userData');
  const id_usuario = userData ? JSON.parse(userData).id_usuario : null;

  useEffect(() => {
    if (id_usuario) {
      cargarTarjetas();
      cargarCuentaYTransacciones();
    }
  }, [id_usuario]);

  async function cargarTarjetas() {
    setLoading(true);
    try {
      const data = await getTarjetas(id_usuario);
      setTarjetas(data);
    } catch (e) {
      setError('Error al cargar tarjetas');
    }
    setLoading(false);
  }

  async function cargarCuentaYTransacciones() {
    setLoading(true);
    try {
      const cta = await getCuenta(id_usuario);
      setCuenta(cta);
      if (cta) {
        const txs = await getTransacciones(cta.id_cuenta);
        setTransacciones(txs);
      }
    } catch {
      setError('Error al cargar cuenta o transacciones');
    }
    setLoading(false);
  }

  async function handleAgregar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await agregarTarjeta(id_usuario, form);
      setShowForm(false);
      setForm({ numero_cuenta: '', fecha_vencimiento: '', cvv: '' });
      cargarTarjetas();
    } catch {
      setError('Error al agregar tarjeta');
    }
    setLoading(false);
  }

  async function handleEliminar() {
    if (selected == null) return;
    setLoading(true);
    try {
      await eliminarTarjeta(id_usuario, selected);
      setSelected(null);
      cargarTarjetas();
    } catch {
      setError('Error al eliminar tarjeta');
    }
    setLoading(false);
  }

  async function handleRetiro(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await retirarDinero(id_usuario, parseFloat(retiro.monto));
      setShowModal(true);
      setRetiro({ monto: '', tarjeta: '' });
      cargarCuentaYTransacciones();
    } catch (e: any) {
      setError(e?.response?.data?.mensaje || 'Error al retirar dinero');
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 540, margin: '3rem auto', padding: 24, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #0001' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 24 }}>Mi Tarjeta</h2>
      <div style={{ marginBottom: 24, textAlign: 'center', fontSize: 22, fontWeight: 600 }}>
        Saldo actual: <span style={{ color: '#1976d2' }}>{cuenta ? `S/ ${parseFloat(cuenta.saldo).toFixed(2)}` : '...'}</span>
      </div>
      {loading && <div style={{ textAlign: 'center' }}>Cargando...</div>}
      {error && <div style={{ color: 'red', textAlign: 'center' }}>{error}</div>}
      <ul style={{ listStyle: 'none', padding: 0, marginBottom: 24 }}>
        {tarjetas.length === 0 && <li style={{ textAlign: 'center', color: '#888' }}>No tienes tarjetas registradas.</li>}
        {tarjetas.map((t: any) => (
          <li key={t.id_tarjeta} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: '1px solid #eee', background: selected === t.id_tarjeta ? '#e3f2fd' : undefined }}>
            <span>💳 **** {t.numero_cuenta} (Vence: {t.fecha_vencimiento})</span>
            <input type="radio" name="tarjeta" checked={selected === t.id_tarjeta} onChange={() => setSelected(t.id_tarjeta)} />
          </li>
        ))}
      </ul>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <button style={{ flex: 1, background: '#43a047', color: '#fff', border: 'none', borderRadius: 8, padding: 12, fontSize: 16, cursor: 'pointer' }} onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancelar' : 'Agregar tarjeta'}
        </button>
        <button style={{ flex: 1, background: '#e53935', color: '#fff', border: 'none', borderRadius: 8, padding: 12, fontSize: 16, cursor: 'pointer' }} disabled={selected == null} onClick={handleEliminar}>
          Retirar tarjeta
        </button>
      </div>
      {showForm && (
        <form onSubmit={handleAgregar} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
          <input type="text" placeholder="Número de tarjeta" value={form.numero_cuenta} onChange={e => setForm(f => ({ ...f, numero_cuenta: e.target.value }))} required maxLength={20} />
          <input type="text" placeholder="Fecha de vencimiento (MM/AAAA)" value={form.fecha_vencimiento} onChange={e => setForm(f => ({ ...f, fecha_vencimiento: e.target.value }))} required maxLength={7} />
          <input type="text" placeholder="CVV" value={form.cvv} onChange={e => setForm(f => ({ ...f, cvv: e.target.value }))} required maxLength={4} />
          <button type="submit" style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 8, padding: 12, fontSize: 16, cursor: 'pointer' }}>Guardar tarjeta</button>
        </form>
      )}

      {/* Retirar dinero */}
      <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #eee' }}>
        <h3 style={{ marginBottom: 12 }}>Retirar dinero</h3>
        <form onSubmit={handleRetiro} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Monto a retirar"
            value={retiro.monto}
            onChange={e => setRetiro(r => ({ ...r, monto: e.target.value }))}
            required
            style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
          />
          <select
            value={retiro.tarjeta}
            onChange={e => setRetiro(r => ({ ...r, tarjeta: e.target.value }))}
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
          <button type="submit" disabled={loading || !retiro.monto || !retiro.tarjeta} style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 16, cursor: 'pointer' }}>
            {loading ? 'Procesando...' : 'Retirar'}
          </button>
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
      </div>

      {/* Historial de transacciones */}
      <div style={{ marginTop: 48 }}>
        <h3 style={{ marginBottom: 12 }}>Historial de transacciones</h3>
        <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ padding: 8, textAlign: 'left' }}>Fecha</th>
                <th style={{ padding: 8, textAlign: 'left' }}>Tipo</th>
                <th style={{ padding: 8, textAlign: 'left' }}>Monto</th>
                <th style={{ padding: 8, textAlign: 'left' }}>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {transacciones.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 16, color: '#888' }}>No hay transacciones.</td></tr>
              )}
              {transacciones.map((tx: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 8 }}>{tx.fecha ? new Date(tx.fecha).toLocaleString() : '-'}</td>
                  <td style={{ padding: 8 }}>
                    {tx.cuenta_origen === (cuenta?.id_cuenta) && tx.cuenta_destino === (cuenta?.id_cuenta) ? 'Retiro' : tx.cuenta_origen === (cuenta?.id_cuenta) ? 'Enviado' : 'Recibido'}
                  </td>
                  <td style={{ padding: 8 }}>
                    {tx.cuenta_origen === (cuenta?.id_cuenta) ? '-' : '+'}
                    S/ {parseFloat(tx.monto).toFixed(2)}
                  </td>
                  <td style={{ padding: 8 }}>{tx.descripcion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
