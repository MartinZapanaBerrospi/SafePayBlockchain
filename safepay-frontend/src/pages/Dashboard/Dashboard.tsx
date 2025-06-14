import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

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

  const COLORS = ['#1976d2', '#43a047', '#ffa000', '#e53935', '#8e24aa', '#00838f'];

  return (
    <div style={{ maxWidth: 1100, margin: '2rem auto', padding: 24 }}>
      <h2>Dashboard de SafePay</h2>
      {loading ? (
        <div>Cargando indicadores...</div>
      ) : error ? (
        <div style={{ color: 'red' }}>Error: {error}</div>
      ) : (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginBottom: 32 }}>
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

          <div style={{ margin: '40px 0', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001', padding: 24 }}>
            <h3 style={{ marginBottom: 16 }}>Actividad de transacciones (últimos 30 días)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={indicadores?.actividad_por_dia || []}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" tickFormatter={d => d.slice(5)} minTickGap={3} />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(v: any) => `${v} transacciones`} labelFormatter={l => `Fecha: ${l}`} />
                <Line type="monotone" dataKey="cantidad" stroke="#1976d2" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ margin: '40px 0', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001', padding: 24 }}>
            <h3 style={{ marginBottom: 16 }}>Mapa de ubicaciones de transacciones</h3>
            <div style={{ width: '100%', height: 350 }}>
              <MapContainer center={[-9.19, -75.0152]} zoom={5} style={{ width: '100%', height: 350 }} scrollWheelZoom={true}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {indicadores?.ubicaciones?.length ? indicadores.ubicaciones.map((u: any, idx: number) => (
                  <Marker key={idx} position={[u.latitud, u.longitud]}>
                    <Popup>
                      Transacción registrada aquí
                    </Popup>
                  </Marker>
                )) : null}
              </MapContainer>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', margin: '40px 0' }}>
            <div style={{ flex: 1, minWidth: 320, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001', padding: 24 }}>
              <h3 style={{ marginBottom: 16 }}>Solicitudes por estado</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={indicadores?.solicitudes_estado || []}
                    dataKey="cantidad"
                    nameKey="estado"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {(indicadores?.solicitudes_estado || []).map((entry: any, idx: number) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(v: any) => `${v} solicitudes`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, minWidth: 320, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001', padding: 24 }}>
              <h3 style={{ marginBottom: 16 }}>Usuarios nuevos por día (últimos 30 días)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={indicadores?.usuarios_nuevos_por_dia || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" tickFormatter={d => d.slice(5)} minTickGap={3} />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(v: any) => `${v} usuarios`} labelFormatter={l => `Fecha: ${l}`} />
                  <Bar dataKey="cantidad" fill="#43a047" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', margin: '40px 0' }}>
            <div style={{ flex: 1, minWidth: 320, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001', padding: 24 }}>
              <h3 style={{ marginBottom: 16 }}>Top 5 usuarios con más transacciones</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={indicadores?.top_transacciones || []}
                  layout="vertical"
                  margin={{ left: 40, right: 20, top: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="usuario" type="category" width={120} />
                  <Tooltip formatter={(v: any) => `${v} transacciones`} />
                  <Bar dataKey="transacciones" fill="#1976d2" barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, minWidth: 320, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001', padding: 24 }}>
              <h3 style={{ marginBottom: 16 }}>Top 5 usuarios con más dinero movido</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={indicadores?.top_montos || []}
                  layout="vertical"
                  margin={{ left: 40, right: 20, top: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={v => v.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })} />
                  <YAxis dataKey="usuario" type="category" width={120} />
                  <Tooltip formatter={(v: any) => `${v.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}`} />
                  <Bar dataKey="monto" fill="#43a047" barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
