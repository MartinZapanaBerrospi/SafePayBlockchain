import { useEffect, useState } from 'react';
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

  // Paleta adaptada a modo claro/oscuro
  const COLORS = [
    'var(--color-primary)',
    'var(--color-secondary)',
    'var(--color-accent)',
    'var(--color-error)',
    '#8e24aa',
    '#00838f'
  ];

  return (
    <div className="dashboard-panel fade-in">
      <h2>Dashboard de SafePay</h2>
      {loading ? (
        <div>Cargando indicadores...</div>
      ) : error ? (
        <div style={{ color: 'var(--color-error)' }}>Error: {error}</div>
      ) : (
        <>
          <div className="dashboard-cards">
            <div className="dashboard-card">
              <h3>Total de transacciones</h3>
              <div className="dashboard-card-value">{indicadores?.total_transacciones ?? '-'}</div>
            </div>
            <div className="dashboard-card">
              <h3>Monto total transferido</h3>
              <div className="dashboard-card-value">{indicadores?.monto_total?.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' }) ?? '-'}</div>
            </div>
            <div className="dashboard-card">
              <h3>Usuarios activos</h3>
              <div className="dashboard-card-value">{indicadores?.usuarios_activos ?? '-'}</div>
            </div>
            <div className="dashboard-card">
              <h3>Solicitudes pendientes</h3>
              <div className="dashboard-card-value">{indicadores?.solicitudes_pendientes ?? '-'}</div>
            </div>
          </div>

          <div className="dashboard-section">
            <h3>Actividad de transacciones (últimos 30 días)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={indicadores?.actividad_por_dia || []}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="fecha" tickFormatter={d => d.slice(5)} minTickGap={3} stroke="var(--color-text)" />
                <YAxis allowDecimals={false} stroke="var(--color-text)" />
                <Tooltip contentStyle={{ background: 'var(--color-card)', color: 'var(--color-text)', border: '1.5px solid var(--color-border)' }} formatter={(v: any) => `${v} transacciones`} labelFormatter={l => `Fecha: ${l}`} />
                <Line type="monotone" dataKey="cantidad" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="dashboard-section">
            <h3>Mapa de ubicaciones de transacciones</h3>
            <div style={{ width: '100%', height: 350 }}>
              {/* @ts-ignore */}
              <MapContainer center={[-9.19, -75.0152]} zoom={5} style={{ width: '100%', height: 350 }} scrollWheelZoom={true}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  {...({ attribution: '&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors' } as any)}
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

          <div className="dashboard-row">
            <div className="dashboard-section dashboard-chart">
              <h3>Solicitudes por estado</h3>
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
                    {(indicadores?.solicitudes_estado || []).map((_: any, idx: number) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip contentStyle={{ background: 'var(--color-card)', color: 'var(--color-text)', border: '1.5px solid var(--color-border)' }} formatter={(v: any) => `${v} solicitudes`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="dashboard-section dashboard-chart">
              <h3>Usuarios nuevos por día (últimos 30 días)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={indicadores?.usuarios_nuevos_por_dia || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="fecha" tickFormatter={d => d.slice(5)} minTickGap={3} stroke="var(--color-text)" />
                  <YAxis allowDecimals={false} stroke="var(--color-text)" />
                  <Tooltip contentStyle={{ background: 'var(--color-card)', color: 'var(--color-text)', border: '1.5px solid var(--color-border)' }} formatter={(v: any) => `${v} usuarios`} labelFormatter={l => `Fecha: ${l}`} />
                  <Bar dataKey="cantidad" fill="var(--color-secondary)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="dashboard-row">
            <div className="dashboard-section dashboard-chart">
              <h3>Top 5 usuarios con más transacciones</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={indicadores?.top_transacciones || []}
                  layout="vertical"
                  margin={{ left: 40, right: 20, top: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" allowDecimals={false} stroke="var(--color-text)" />
                  <YAxis dataKey="usuario" type="category" width={120} stroke="var(--color-text)" />
                  <Tooltip contentStyle={{ background: 'var(--color-card)', color: 'var(--color-text)', border: '1.5px solid var(--color-border)' }} formatter={(v: any) => `${v} transacciones`} />
                  <Bar dataKey="transacciones" fill="var(--color-primary)" barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="dashboard-section dashboard-chart">
              <h3>Top 5 usuarios con más dinero movido</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={indicadores?.top_montos || []}
                  layout="vertical"
                  margin={{ left: 40, right: 20, top: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" tickFormatter={v => v.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })} stroke="var(--color-text)" />
                  <YAxis dataKey="usuario" type="category" width={120} stroke="var(--color-text)" />
                  <Tooltip contentStyle={{ background: 'var(--color-card)', color: 'var(--color-text)', border: '1.5px solid var(--color-border)' }} formatter={(v: any) => `${v.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}`} />
                  <Bar dataKey="monto" fill="var(--color-secondary)" barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
