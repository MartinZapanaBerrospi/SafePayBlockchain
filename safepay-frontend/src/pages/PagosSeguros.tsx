import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PagosSeguros() {
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    // Obtener el id_usuario del localStorage (debería guardarse tras login)
    const userData = localStorage.getItem('userData');
    let id_usuario = null;
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        id_usuario = parsed.id_usuario;
      } catch {}
    }
    if (!id_usuario) return;
    // Obtener solicitudes donde destinatario = id_usuario
    fetch(`/api/solicitudes`)
      .then(res => res.json())
      .then(data => {
        // Filtrar solo las solicitudes activas (pendientes) y del usuario
        const activas = data.filter((s: any) => s.destinatario === id_usuario && s.estado === 'pendiente');
        setSolicitudes(activas);
      })
      .catch(() => setError('No se pudieron cargar las solicitudes.'));
  }, []);

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto' }}>
      <h2>Solicitudes de pago activas</h2>
      {error && <p className="error">{error}</p>}
      {solicitudes.length === 0 && <p>No tienes solicitudes de pago pendientes.</p>}
      {solicitudes.map(s => (
        <div key={s.id_solicitud} style={{ border: '1px solid #ccc', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <p><b>De:</b> {s.solicitante}</p>
          <p><b>Monto:</b> {s.monto} {s.moneda || 'USD'}</p>
          <p><b>Mensaje:</b> {s.mensaje}</p>
          <button style={{ marginTop: 8 }}>Pagar</button>
        </div>
      ))}
    </div>
  );
}
