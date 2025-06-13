import React, { useEffect, useState } from 'react';

export default function Dashboard() {
  const [indicadores, setIndicadores] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/indicadores')
      .then(res => {
        if (!res.ok) throw new Error('Error al obtener indicadores');
        return res.json();
      })
      .then(data => {
        setIndicadores(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: '2rem auto', padding: 24 }}>
      <h2>Dashboard de SafePay</h2>
      {loading ? (
        <div>Cargando indicadores...</div>
      ) : error ? (
        <div style={{ color: 'red' }}>Error: {error}</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          <div style={{ flex: 1, minWidth: 220, background: '#f5f5f5', borderRadius: 8, padding: 16 }}>
            <h3>Total de transacciones</h3>
            <div style={{ fontSize: 32, fontWeight: 'bold' }}>{indicadores?.total_transacciones ?? '-'}</div>
          </div>
          <div style={{ flex: 1, minWidth: 220, background: '#f5f5f5', borderRadius: 8, padding: 16 }}>
            <h3>Monto total transferido</h3>
            <div style={{ fontSize: 32, fontWeight: 'bold' }}>{indicadores?.monto_total?.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' }) ?? '-'}</div>
          </div>
          <div style={{ flex: 1, minWidth: 220, background: '#f5f5f5', borderRadius: 8, padding: 16 }}>
            <h3>Usuarios activos</h3>
            <div style={{ fontSize: 32, fontWeight: 'bold' }}>{indicadores?.usuarios_activos ?? '-'}</div>
          </div>
          <div style={{ flex: 1, minWidth: 220, background: '#f5f5f5', borderRadius: 8, padding: 16 }}>
            <h3>Solicitudes pendientes</h3>
            <div style={{ fontSize: 32, fontWeight: 'bold' }}>{indicadores?.solicitudes_pendientes ?? '-'}</div>
          </div>
        </div>
      )}
    </div>
  );
}
