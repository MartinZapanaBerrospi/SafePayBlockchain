import React, { useEffect, useState } from 'react';
import { getTarjetas, agregarTarjeta, eliminarTarjeta, retirarDinero } from '../services/tarjetaService';
import { getCuenta, getTransacciones } from '../services/cuentaService';

export default function MiCuenta() {
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
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [tarjetaAEliminar, setTarjetaAEliminar] = useState<number | null>(null);
  const [nombresCuentas, setNombresCuentas] = useState<{ [id: number]: string }>({});

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
        // Obtener los ids de cuentas involucradas (origen y destino)
        const cuentaIds = Array.from(new Set(txs.flatMap((t: any) => [t.cuenta_origen, t.cuenta_destino])));
        if (cuentaIds.length > 0) {
          fetch('/api/cuentas/nombres', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cuenta_ids: cuentaIds })
          })
            .then(res => res.json())
            .then(setNombresCuentas);
        }
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
    setTarjetaAEliminar(selected);
    setShowConfirmDelete(true);
  }
  async function confirmarEliminar() {
    setLoading(true);
    try {
      if (tarjetaAEliminar == null) throw new Error('No hay tarjeta seleccionada');
      await eliminarTarjeta(id_usuario, tarjetaAEliminar);
      setSelected(null);
      setTarjetaAEliminar(null);
      setShowConfirmDelete(false);
      cargarTarjetas();
    } catch {
      setError('Error al eliminar tarjeta');
      setShowConfirmDelete(false);
    }
    setLoading(false);
  }
  function cancelarEliminar() {
    setShowConfirmDelete(false);
    setTarjetaAEliminar(null);
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
    <div className="cuenta-panel">
      <h2 style={{ textAlign: 'center', marginBottom: 24 }}>Mi cuenta</h2>
      <div className="cuenta-info">
        <div style={{ fontSize: 18, fontWeight: 600 }}>
          <span role="img" aria-label="cuenta">🏦</span> Cuenta: <span style={{ fontFamily: 'monospace', color: 'var(--color-primary)' }}>{cuenta ? cuenta.numero_cuenta : '...'}</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>
          Saldo actual:
          <span
            style={{
              display: 'inline-block',
              marginLeft: 8,
              padding: '4px 18px',
              borderRadius: 8,
              background: 'linear-gradient(90deg, var(--color-primary) 60%, var(--color-secondary) 100%)',
              color: 'var(--color-button-text)',
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 1,
              boxShadow: '0 2px 8px #0002',
              border: '2px solid var(--color-border)'
            }}
          >
            {cuenta ? `S/ ${parseFloat(cuenta.saldo).toFixed(2)}` : '...'}
          </span>
        </div>
      </div>
      {loading && <div style={{ textAlign: 'center' }}>Cargando...</div>}
      {error && <div style={{ color: 'var(--color-error)', textAlign: 'center' }}>{error}</div>}
      {/* Tarjetas */}
      <ul style={{ listStyle: 'none', padding: 0, marginBottom: 24 }}>
        {tarjetas.length === 0 && <li style={{ textAlign: 'center', color: '#888' }}>No tienes tarjetas registradas.</li>}
        {tarjetas.map((t: any) => (
          <li key={t.id_tarjeta} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: '1px solid var(--color-border)', background: selected === t.id_tarjeta ? 'var(--color-accent)' : undefined }}>
            <span style={{ flex: 1, display: 'flex', alignItems: 'center' }}>💳 **** {t.numero_cuenta} (Vence: {t.fecha_vencimiento})</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flex: '0 0 40px' }}>
              <input type="radio" name="tarjeta" checked={selected === t.id_tarjeta} onChange={() => setSelected(t.id_tarjeta)} style={{ marginLeft: 16, accentColor: 'var(--color-primary)' }} />
            </div>
          </li>
        ))}
      </ul>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 16, marginBottom: 32 }}>
        <button style={{ flex: 1, fontSize: 16, padding: '0.7em 1.5em' }} className="btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancelar' : 'Agregar tarjeta'}
        </button>
        <button
          style={{ flex: 1, fontSize: 16, padding: '0.7em 1.5em', opacity: selected == null ? 0.6 : 1, cursor: selected == null ? 'not-allowed' : 'pointer' }}
          className="btn-danger"
          disabled={selected == null || loading}
          onClick={() => {
            if (selected != null) handleEliminar();
          }}
        >
          Eliminar tarjeta
        </button>
      </div>
      {showForm && (
        <form onSubmit={handleAgregar} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
          <input type="text" placeholder="Número de tarjeta" value={form.numero_cuenta} onChange={e => setForm(f => ({ ...f, numero_cuenta: e.target.value }))} required maxLength={20} />
          <input type="text" placeholder="Fecha de vencimiento (MM/AAAA)" value={form.fecha_vencimiento} onChange={e => setForm(f => ({ ...f, fecha_vencimiento: e.target.value }))} required maxLength={7} />
          <input type="text" placeholder="CVV" value={form.cvv} onChange={e => setForm(f => ({ ...f, cvv: e.target.value }))} required maxLength={4} />
          <button type="submit" className="btn-primary">Guardar tarjeta</button>
        </form>
      )}
      {/* Retirar dinero */}
      <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--color-border)' }}>
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
            style={{ flex: 1 }}
          />
          <select
            value={retiro.tarjeta}
            onChange={e => setRetiro(r => ({ ...r, tarjeta: e.target.value }))}
            required
            style={{ flex: 1 }}
          >
            <option value="">Selecciona tarjeta</option>
            {tarjetas.map((t: any) => (
              <option key={t.id_tarjeta} value={t.id_tarjeta}>
                **** {t.numero_cuenta} (Vence: {t.fecha_vencimiento})
              </option>
            ))}
          </select>
          <button type="submit" disabled={loading || !retiro.monto || !retiro.tarjeta} className="btn-primary">
            {loading ? 'Procesando...' : 'Retirar'}
          </button>
        </form>
        {showModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'var(--color-card)', padding: 32, borderRadius: 12, boxShadow: '0 2px 16px #0003', textAlign: 'center' }}>
              <h2 style={{ color: 'var(--color-success)', marginBottom: 16 }}>Retiro exitoso</h2>
              <p>El retiro se ha realizado correctamente.</p>
              <button onClick={() => setShowModal(false)} className="btn-primary" style={{ marginTop: 16 }}>Cerrar</button>
            </div>
          </div>
        )}
      </div>
      {/* Historial de transacciones */}
      <div style={{ marginTop: 48 }}>
        <h3 style={{ marginBottom: 12 }}>Historial de transacciones</h3>
        <div style={{ maxHeight: 340, overflowY: 'auto', border: '1.5px solid var(--color-border)', borderRadius: 14, boxShadow: '0 2px 16px #2563eb18', background: 'var(--color-card)', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 16, minWidth: 480 }}>
            <thead>
              <tr style={{ background: 'var(--color-bg)', color: 'var(--color-primary)', fontWeight: 700 }}>
                <th style={{ padding: '14px 12px', textAlign: 'left', borderBottom: '2px solid var(--color-border)' }}>Fecha</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', borderBottom: '2px solid var(--color-border)' }}>Tipo</th>
                <th style={{ padding: '14px 12px', textAlign: 'right', borderBottom: '2px solid var(--color-border)' }}>Monto</th>
                <th style={{ padding: '14px 12px', textAlign: 'left', borderBottom: '2px solid var(--color-border)' }}>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {transacciones.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: '#888' }}>No hay transacciones.</td></tr>
              )}
              {transacciones.map((tx: any, idx: number) => {
                const isRetiro = tx.cuenta_origen === tx.cuenta_destino && tx.cuenta_origen === cuenta?.id_cuenta;
                const isEnviado = tx.cuenta_origen === cuenta?.id_cuenta && !isRetiro;
                const isRecibido = tx.cuenta_destino === cuenta?.id_cuenta && !isRetiro;
                // Fecha solo día/mes/año
                const fecha = tx.fecha ? new Date(tx.fecha).toLocaleDateString() : '-';
                // Monto visual
                const monto = parseFloat(tx.monto).toFixed(2);
                // Descripción mejorada
                let descripcion = tx.descripcion;
                if (isEnviado && tx.cuenta_destino !== cuenta?.id_cuenta) {
                  const nombreDest = nombresCuentas[tx.cuenta_destino] || `usuario ${tx.cuenta_destino}`;
                  descripcion = `Transferencia a ${nombreDest}`;
                } else if (isRecibido && tx.cuenta_origen !== cuenta?.id_cuenta) {
                  const nombreOrigen = nombresCuentas[tx.cuenta_origen] || `usuario ${tx.cuenta_origen}`;
                  descripcion = `Transferencia de ${nombreOrigen}`;
                } else if (isRetiro) {
                  descripcion = 'Retiro';
                }
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 0 ? 'var(--color-bg)' : 'var(--color-card)' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 500 }}>{fecha}</td>
                    <td style={{ padding: '12px 10px', fontWeight: 500 }}>
                      {isRetiro ? <span style={{ color: 'var(--color-error)', fontWeight: 700 }}>Retiro</span> : isEnviado ? <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>Enviado</span> : <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>Recibido</span>}
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700, color: isEnviado || isRetiro ? 'var(--color-error)' : 'var(--color-success)', fontSize: 17 }}>
                      {isEnviado || isRetiro ? '-' : '+'}S/ {monto}
                    </td>
                    <td style={{ padding: '12px 10px', fontWeight: 500 }}>{descripcion}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {/* Modal de confirmación de eliminación de tarjeta */}
      {showConfirmDelete && (
        <div className="modal-bg" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.35)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal" style={{ background: 'var(--color-card)', color: 'var(--color-text)', border: '1.5px solid var(--color-border)', borderRadius: 12, boxShadow: '0 4px 32px #0008', padding: 32, minWidth: 320, maxWidth: 440, width: '100%', textAlign: 'center', zIndex: 2100, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ color: 'var(--color-error)', marginBottom: 16 }}>¿Eliminar tarjeta?</h3>
            <p style={{ marginBottom: 24 }}>¿Estás seguro de que deseas eliminar esta tarjeta?<br/>Esta acción no se puede deshacer.</p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 24, width: '100%' }}>
              <button className="btn-danger" style={{ flex: 1, fontSize: 16, padding: '0.7em 1.5em', minWidth: 0, maxWidth: 'none' }} onClick={confirmarEliminar}>Eliminar</button>
              <button className="btn-danger" style={{ flex: 1, fontSize: 16, padding: '0.7em 1.5em', minWidth: 0, maxWidth: 'none' }} onClick={cancelarEliminar}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}