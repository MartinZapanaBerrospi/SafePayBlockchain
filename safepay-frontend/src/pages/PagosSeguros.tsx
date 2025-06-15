import React, { useEffect, useState } from 'react';

interface Solicitud {
  id_solicitud: number;
  solicitante: number;
  destinatario: number;
  monto: number;
  mensaje: string;
  estado: string;
  fecha_solicitud: string;
  fecha_vencimiento?: string;
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
  const [claveCifrada, setClaveCifrada] = useState('');
  const [clavePago, setClavePago] = useState('');
  const [firmaError, setFirmaError] = useState<string>('');
  const [latitud, setLatitud] = useState<number|null>(null);
  const [longitud, setLongitud] = useState<number|null>(null);
  // Formulario para crear solicitud de pago
  const [showCrear, setShowCrear] = useState(false);
  const [nuevoDestinatario, setNuevoDestinatario] = useState('');
  const [nuevoMonto, setNuevoMonto] = useState('');
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [nuevoFechaVencimiento, setNuevoFechaVencimiento] = useState('');
  const [crearError, setCrearError] = useState('');
  const [crearExito, setCrearExito] = useState('');

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

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setLatitud(pos.coords.latitude);
          setLongitud(pos.coords.longitude);
        },
        () => {
          setLatitud(null);
          setLongitud(null);
        }
      );
    }
  }, []);

  const abrirModal = (solicitud: Solicitud) => {
    setModal({ solicitud });
    setPagoExitoso(null);
    setDescripcion('');
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
    setFirmaError('');
    if (!modal.solicitud || !cuentaSeleccionada) return;
    if (!claveCifrada || !clavePago) {
      setFirmaError('Debes pegar tu clave privada cifrada y la contraseña para firmar el pago.');
      return;
    }
    try {
      // Descifrar clave privada cifrada (AES-GCM, PBKDF2, base64)
      const descifrarClavePrivada = async (cifrada: string, password: string) => {
        let b64 = cifrada.replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4 !== 0) b64 += '=';
        const data = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const salt = data.slice(0, 16);
        const iv = data.slice(16, 28);
        const ciphertextAndTag = data.slice(28);
        const keyMaterial = await window.crypto.subtle.importKey(
          'raw',
          new TextEncoder().encode(password),
          { name: 'PBKDF2' },
          false,
          ['deriveKey']
        );
        const key = await window.crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt,
            iterations: 100000,
            hash: 'SHA-256',
          },
          keyMaterial,
          { name: 'AES-GCM', length: 256 },
          false,
          ['decrypt']
        );
        let decrypted;
        try {
          decrypted = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            ciphertextAndTag
          );
        } catch (e) {
          throw e;
        }
        return new Uint8Array(decrypted);
      };
      const privKeyBytes = await descifrarClavePrivada(claveCifrada, clavePago);
      let pem = new TextDecoder().decode(privKeyBytes);
      if (/^(\\x[0-9a-fA-F]{2})+$/.test(pem)) {
        const hex = pem.replace(/\\x/g, '');
        let str = '';
        for (let i = 0; i < hex.length; i += 2) {
          str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        }
        pem = str;
      }
      const pemHeader = '-----BEGIN PRIVATE KEY-----';
      const pemFooter = '-----END PRIVATE KEY-----';
      const pemContents = pem.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '');
      if (!pemContents || !/^[A-Za-z0-9+/=]+$/.test(pemContents)) {
        setFirmaError('Error: El contenido base64 de la clave privada descifrada está vacío o malformado.');
        return;
      }
      let binaryDer;
      try {
        binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
      } catch (e) {
        setFirmaError('Error: El contenido base64 de la clave privada descifrada no es válido.');
        return;
      }
      let privateKey;
      try {
        privateKey = await window.crypto.subtle.importKey(
          'pkcs8',
          binaryDer.buffer,
          { name: 'RSA-PSS', hash: 'SHA-256' },
          false,
          ['sign']
        );
      } catch (e) {
        setFirmaError('Error al importar la clave privada.');
        return;
      }
      const montoFormateado = Number(modal.solicitud.monto).toFixed(2);
      const mensaje = `${modal.solicitud.id_solicitud}:${cuentaSeleccionada}:${montoFormateado}`;
      const encoder = new TextEncoder();
      const signature = await window.crypto.subtle.sign(
        { name: 'RSA-PSS', saltLength: 32 },
        privateKey,
        encoder.encode(mensaje)
      );
      const firmaB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
      const userData = localStorage.getItem('userData');
      let id_dispositivo = null;
      if (userData) {
        try {
          const parsed = JSON.parse(userData);
          id_dispositivo = parsed.id_dispositivo || localStorage.getItem('id_dispositivo');
        } catch {}
      }
      const res = await fetch(`/api/solicitudes/${modal.solicitud.id_solicitud}/pagar_firma`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_cuenta_origen: cuentaSeleccionada,
          firma: firmaB64,
          id_dispositivo,
          latitud,
          longitud
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCuentas(prevCuentas => prevCuentas.map(c =>
          c.id_cuenta === cuentaSeleccionada ? { ...c, saldo: data.nuevo_saldo } : c
        ));
        const cuentaUsada = cuentas.find(c => c.id_cuenta === cuentaSeleccionada);
        setPagoExitoso({ ...data, solicitud: modal.solicitud, cuenta: cuentaUsada ? { ...cuentaUsada, saldo: data.nuevo_saldo } : undefined });
        setSolicitudes(solicitudes.filter(s => s.id_solicitud !== modal.solicitud!.id_solicitud));
        setClaveCifrada('');
        setClavePago('');
      } else {
        setError((data.mensaje || 'Error al realizar el pago') + (data.error ? ' Detalle: ' + data.error : ''));
        setFirmaError((data.mensaje || 'Error al realizar el pago') + (data.error ? ' Detalle: ' + data.error : ''));
      }
    } catch (e: any) {
      setFirmaError('Error: ' + (e?.message || e?.toString() || 'Error al descifrar la clave o firmar el pago. Verifica tu clave cifrada y contraseña.'));
    }
  };

  const handleCrearSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    setCrearError('');
    setCrearExito('');
    if (!nuevoDestinatario || !nuevoMonto || !nuevoFechaVencimiento) {
      setCrearError('Debes ingresar destinatario, monto y fecha de vencimiento.');
      return;
    }
    let id_usuario = null;
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        id_usuario = parsed.id_usuario;
      } catch {}
    }
    if (!id_usuario) {
      setCrearError('No se pudo obtener el usuario actual.');
      return;
    }
    try {
      const res = await fetch('/api/solicitudes/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solicitante: id_usuario, destinatario: nuevoDestinatario, monto: nuevoMonto, mensaje: nuevoMensaje, fecha_vencimiento: nuevoFechaVencimiento })
      });
      const data = await res.json();
      if (res.ok) {
        setCrearExito('Solicitud creada correctamente.');
        setNuevoDestinatario('');
        setNuevoMonto('');
        setNuevoMensaje('');
        setNuevoFechaVencimiento('');
        setShowCrear(false);
        fetch(`/api/solicitudes`)
          .then(res => res.json())
          .then(data => {
            const activas = data.filter((s: Solicitud) => s.destinatario === id_usuario && s.estado === 'pendiente');
            setSolicitudes(activas);
          });
      } else {
        setCrearError(data.mensaje || 'Error al crear solicitud.');
      }
    } catch (e) {
      setCrearError('Error al crear solicitud.');
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto' }}>
      <h2>Solicitudes de pago activas</h2>
      <button className="btn-primary" style={{ marginBottom: 24 }} onClick={() => setShowCrear(v => !v)}>
        {showCrear ? 'Cancelar' : 'Crear solicitud de pago'}
      </button>
      {showCrear && (
        <form className="solicitud-form" onSubmit={handleCrearSolicitud} style={{ background: 'var(--color-card)', border: '1.5px solid var(--color-border)', borderRadius: 12, boxShadow: '0 2px 8px #2563eb20', padding: 24, marginBottom: 24 }}>
          <h3 style={{ color: 'var(--color-primary)', marginBottom: 16 }}>Nueva solicitud de pago</h3>
          <div className="form-group">
            <label>Destinatario (usuario o correo):</label>
            <input value={nuevoDestinatario} onChange={e => setNuevoDestinatario(e.target.value)} required placeholder="Usuario o correo" style={{ width: '100%' }} />
          </div>
          <div className="form-group">
            <label>Monto:</label>
            <input type="number" min="0.01" step="0.01" value={nuevoMonto} onChange={e => setNuevoMonto(e.target.value)} required placeholder="Monto a solicitar" style={{ width: '100%' }} />
          </div>
          <div className="form-group">
            <label>Mensaje (opcional):</label>
            <input value={nuevoMensaje} onChange={e => setNuevoMensaje(e.target.value)} placeholder="Motivo o referencia" style={{ width: '100%' }} />
          </div>
          <div className="form-group">
            <label>Fecha de vencimiento:</label>
            <input type="date" value={nuevoFechaVencimiento} onChange={e => setNuevoFechaVencimiento(e.target.value)} required style={{ width: '100%' }} />
          </div>
          {crearError && <div className="error" style={{ marginBottom: 8 }}>{crearError}</div>}
          {crearExito && <div className="success" style={{ marginBottom: 8 }}>{crearExito}</div>}
          <button className="btn-primary" type="submit" style={{ width: '100%', fontSize: 16, fontWeight: 600, marginTop: 8 }}>Crear solicitud</button>
        </form>
      )}
      {error && <p className="error">{error}</p>}
      {solicitudes.length === 0 && <p>No tienes solicitudes de pago pendientes.</p>}
      {solicitudes.map(s => (
        <div key={s.id_solicitud} style={{ border: '1px solid #ccc', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <p><b>De:</b> {nombres[s.solicitante] || s.solicitante}</p>
          <p><b>Monto:</b> {s.monto} USD</p>
          <p><b>Mensaje:</b> {s.mensaje}</p>
          <p><b>Vence:</b> {s.fecha_vencimiento ? new Date(s.fecha_vencimiento).toLocaleDateString() : 'Sin fecha'}</p>
          <button style={{ marginTop: 8 }} onClick={() => abrirModal(s)}>Pagar</button>
        </div>
      ))}
      {modal.solicitud && (
        <div className="modal-bg" style={{ position: 'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div className="modal" style={{ 
            background: 'var(--color-card)',
            color: 'var(--color-text)',
            borderRadius: 16,
            padding: 0,
            minWidth: 320,
            maxWidth: 420,
            maxHeight: '90vh',
            boxShadow: '0 6px 32px #2563eb33',
            position: 'relative',
            border: '2px solid var(--color-border)',
            transition: 'background 0.3s, color 0.3s',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            overflow: 'hidden',
          }}>
            {/* Encabezado fijo */}
            <div style={{
              position: 'sticky',
              top: 0,
              background: 'var(--color-card)',
              zIndex: 2,
              padding: '24px 28px 8px 28px',
              borderBottom: '1.5px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 60,
            }}>
              <h3 style={{ color: 'var(--color-primary)', fontSize: 22, fontWeight: 700, textAlign: 'center', flex: 1, margin: 0 }}>Confirmar pago</h3>
              <button onClick={cerrarModal} style={{ position:'absolute', top:18, right:22, fontSize:22, background:'none', border:'none', cursor:'pointer', color: 'var(--color-text)', zIndex:3 }}>&times;</button>
            </div>
            {/* Contenido desplazable */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 28px 18px 28px' }}>
              {!pagoExitoso ? (
                <>
                  <div style={{ width: '100%', marginBottom: 10 }}>
                    <p><b>De:</b> {nombres[modal.solicitud.solicitante] || modal.solicitud.solicitante}</p>
                    <p><b>Monto:</b> {modal.solicitud.monto} USD</p>
                    <p><b>Mensaje:</b> {modal.solicitud.mensaje}</p>
                  </div>
                  <div style={{ margin: '1em 0', width: '100%' }}>
                    <label>Cuenta de pago:&nbsp;
                      <select value={cuentaSeleccionada ?? ''} onChange={e => setCuentaSeleccionada(Number(e.target.value))} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1.5px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)' }}>
                        {cuentas.map(c => (
                          <option key={c.id_cuenta} value={c.id_cuenta}>{c.id_cuenta} - Saldo: {c.saldo} {c.moneda}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div style={{ margin: '1em 0', width: '100%' }}>
                    <label>Descripción (opcional):<br/>
                      <input type="text" value={descripcion} onChange={e => setDescripcion(e.target.value)} style={{ width:'100%', padding: 8, borderRadius: 6, border: '1.5px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)' }} maxLength={100} />
                    </label>
                  </div>
                  <div style={{ margin: '1em 0', width: '100%' }}>
                    <label>Clave privada cifrada:<br/>
                      <textarea value={claveCifrada} onChange={e => setClaveCifrada(e.target.value)} style={{ width:'100%', padding: 8, borderRadius: 6, border: '1.5px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)' }} rows={2} placeholder="Pega aquí tu clave privada cifrada" />
                    </label>
                  </div>
                  <div style={{ margin: '1em 0', width: '100%' }}>
                    <label>Contraseña para descifrar:<br/>
                      <input type="password" value={clavePago} onChange={e => setClavePago(e.target.value)} style={{ width:'100%', padding: 8, borderRadius: 6, border: '1.5px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text)' }} maxLength={100} />
                    </label>
                  </div>
                  {firmaError && <div style={{ color: 'var(--color-error)', fontSize: 14, marginBottom: 8 }}>{firmaError}</div>}
                </>
              ) : (
                <div style={{ textAlign:'center', padding:'2em 0', borderRadius: 12, background: 'var(--color-card)', color: 'var(--color-text)', boxShadow: '0 2px 16px #2563eb22', border: '2px solid var(--color-border)', transition: 'background 0.3s, color 0.3s' }}>
                  <div style={{ fontSize:48, color:'var(--color-success)', marginBottom:16 }}>✔️</div>
                  <h3 style={{ color: 'var(--color-primary)' }}>Pago realizado</h3>
                  <p><b>De:</b> {nombres[modal.solicitud.solicitante] || modal.solicitud.solicitante}</p>
                  <p><b>Monto:</b> {modal.solicitud.monto} USD</p>
                  <p><b>Cuenta usada:</b> {pagoExitoso.cuenta ? `${pagoExitoso.cuenta.id_cuenta} (${pagoExitoso.cuenta.moneda})` : ''}</p>
                  <p><b>Mensaje:</b> {modal.solicitud.mensaje}</p>
                  <p><b>Nuevo saldo:</b> {pagoExitoso.cuenta ? pagoExitoso.cuenta.saldo + ' ' + pagoExitoso.cuenta.moneda : ''}</p>
                  <p style={{ color:'var(--color-text)', fontSize:13 }}>{pagoExitoso.mensaje}</p>
                </div>
              )}
            </div>
            {/* Botón fijo en la parte inferior */}
            {!pagoExitoso && (
              <div style={{
                position: 'sticky',
                bottom: 0,
                background: 'var(--color-card)',
                zIndex: 2,
                padding: '18px 28px 24px 28px',
                borderTop: '1.5px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'center',
              }}>
                <button style={{ width: '100%', maxWidth: 220, fontSize: 17, fontWeight: 700, background: 'var(--color-primary)', color: 'var(--color-buttonText)', border: 'none', borderRadius: 8, padding: '12px 0', boxShadow: '0 2px 8px #2563eb22', cursor: 'pointer', transition: 'background 0.2s' }} onClick={completarPago}>
                  Completar pago
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
