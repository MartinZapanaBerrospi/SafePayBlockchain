import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Solicitud {
  id_solicitud: number;
  solicitante: number;
  destinatario: number;
  monto: number;
  mensaje: string;
  estado: string;
  fecha_solicitud: string;
}

export default function PagosSeguros() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [nombres, setNombres] = useState<{ [id: string]: string }>({});
  const [error, setError] = useState('');
  const [modal, setModal] = useState<{ solicitud: Solicitud | null }>({ solicitud: null });
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<number | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [pagoExitoso, setPagoExitoso] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('userData');
    let id_usuario = null;
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        id_usuario = parsed.id_usuario;
      } catch {}
    }
    if (!id_usuario) return;
    fetch(`/api/solicitudes`)
      .then(res => res.json())
      .then(data => {
        const activas = data.filter((s: Solicitud) => s.destinatario === id_usuario && s.estado === 'pendiente');
        setSolicitudes(activas);
        // Obtener nombres de solicitantes únicos
        const ids = Array.from(new Set(activas.map(s => s.solicitante)));
        if (ids.length > 0) {
          fetch('/api/usuarios/nombres', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
          })
            .then(res => res.json())
            .then(setNombres);
        }
      })
      .catch(() => setError('No se pudieron cargar las solicitudes.'));
  }, []);

  const abrirModal = (solicitud: Solicitud) => {
    setModal({ solicitud });
    setPagoExitoso(null);
    setDescripcion('');
    // Obtener cuentas del usuario
    const userData = localStorage.getItem('userData');
    let id_usuario = null;
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        id_usuario = parsed.id_usuario;
      } catch {}
    }
    if (!id_usuario) return;
    fetch(`/api/cuentas`)
      .then(res => res.json())
      .then(data => {
        const cuentasUsuario = data.filter((c: any) => c.id_usuario === id_usuario && c.activa);
        setCuentas(cuentasUsuario);
        if (cuentasUsuario.length > 0) setCuentaSeleccionada(cuentasUsuario[0].id_cuenta);
      });
  };

  const cerrarModal = () => {
    setModal({ solicitud: null });
    setPagoExitoso(null);
    setDescripcion('');
  };

  const completarPago = async () => {
    if (!modal.solicitud || !cuentaSeleccionada) return;
    try {
      const res = await fetch(`/api/solicitudes/${modal.solicitud.id_solicitud}/pagar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_cuenta_origen: cuentaSeleccionada, descripcion })
      });
      const data = await res.json();
      if (res.ok) {
        // Actualizar el saldo de la cuenta usada en el estado de cuentas
        setCuentas(prevCuentas => prevCuentas.map(c =>
          c.id_cuenta === cuentaSeleccionada ? { ...c, saldo: data.nuevo_saldo } : c
        ));
        // Guardar la cuenta usada con el nuevo saldo para mostrar en el modal de éxito
        const cuentaUsada = cuentas.find(c => c.id_cuenta === cuentaSeleccionada);
        setPagoExitoso({ ...data, solicitud: modal.solicitud, cuenta: cuentaUsada ? { ...cuentaUsada, saldo: data.nuevo_saldo } : undefined });
        // Quitar la solicitud pagada de la lista
        setSolicitudes(solicitudes.filter(s => s.id_solicitud !== modal.solicitud!.id_solicitud));
      } else {
        setError(data.mensaje || 'Error al realizar el pago');
      }
    } catch {
      setError('Error al realizar el pago');
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto' }}>
      <h2>Solicitudes de pago activas</h2>
      {error && <p className="error">{error}</p>}
      {solicitudes.length === 0 && <p>No tienes solicitudes de pago pendientes.</p>}
      {solicitudes.map(s => (
        <div key={s.id_solicitud} style={{ border: '1px solid #ccc', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <p><b>De:</b> {nombres[s.solicitante] || s.solicitante}</p>
          <p><b>Monto:</b> {s.monto} USD</p>
          <p><b>Mensaje:</b> {s.mensaje}</p>
          <button style={{ marginTop: 8 }} onClick={() => abrirModal(s)}>Pagar</button>
        </div>
      ))}
      {modal.solicitud && (
        <div className="modal-bg" style={{ position: 'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div className="modal" style={{ background:'#fff', borderRadius:8, padding:32, minWidth:320, maxWidth:400, boxShadow:'0 2px 16px #0003', position:'relative' }}>
            <button onClick={cerrarModal} style={{ position:'absolute', top:8, right:12, fontSize:20, background:'none', border:'none', cursor:'pointer' }}>&times;</button>
            {!pagoExitoso ? (
              <>
                <h3>Confirmar pago</h3>
                <p><b>De:</b> {nombres[modal.solicitud.solicitante] || modal.solicitud.solicitante}</p>
                <p><b>Monto:</b> {modal.solicitud.monto} USD</p>
                <p><b>Mensaje:</b> {modal.solicitud.mensaje}</p>
                <div style={{ margin: '1em 0' }}>
                  <label>Cuenta de pago:&nbsp;
                    <select value={cuentaSeleccionada ?? ''} onChange={e => setCuentaSeleccionada(Number(e.target.value))}>
                      {cuentas.map(c => (
                        <option key={c.id_cuenta} value={c.id_cuenta}>{c.id_cuenta} - Saldo: {c.saldo} {c.moneda}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div style={{ margin: '1em 0' }}>
                  <label>Descripción (opcional):<br/>
                    <input type="text" value={descripcion} onChange={e => setDescripcion(e.target.value)} style={{ width:'100%' }} maxLength={100} />
                  </label>
                </div>
                <button style={{ marginTop: 12 }} onClick={completarPago}>Completar pago</button>
              </>
            ) : (
              <div style={{ textAlign:'center', padding:'2em 0' }}>
                <div style={{ fontSize:48, color:'#4caf50', marginBottom:16 }}>✔️</div>
                <h3>Pago realizado</h3>
                <p><b>De:</b> {nombres[modal.solicitud.solicitante] || modal.solicitud.solicitante}</p>
                <p><b>Monto:</b> {modal.solicitud.monto} USD</p>
                <p><b>Cuenta usada:</b> {pagoExitoso.cuenta ? `${pagoExitoso.cuenta.id_cuenta} (${pagoExitoso.cuenta.moneda})` : ''}</p>
                <p><b>Mensaje:</b> {modal.solicitud.mensaje}</p>
                <p><b>Nuevo saldo:</b> {pagoExitoso.cuenta ? pagoExitoso.cuenta.saldo + ' ' + pagoExitoso.cuenta.moneda : ''}</p>
                <p style={{ color:'#888', fontSize:13 }}>{pagoExitoso.mensaje}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
