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

  // Geolocalización para pagos
  const [latitud, setLatitud] = useState<number|null>(null);
  const [longitud, setLongitud] = useState<number|null>(null);
  const [nombreDispositivo, setNombreDispositivo] = useState('');

  // --- NUEVO: Formulario para crear solicitud de pago ---
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

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setLatitud(pos.coords.latitude);
          setLongitud(pos.coords.longitude);
        },
        err => {
          setLatitud(null);
          setLongitud(null);
        }
      );
    }
    setNombreDispositivo(navigator.userAgent);
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
    console.log('[DEBUG] completarPago llamado');
    setFirmaError('');
    if (!modal.solicitud || !cuentaSeleccionada) return;
    if (!claveCifrada || !clavePago) {
      setFirmaError('Debes pegar tu clave privada cifrada y la contraseña para firmar el pago.');
      return;
    }
    try {
      // Descifrar clave privada cifrada (AES-GCM, PBKDF2, base64)
      const descifrarClavePrivada = async (cifrada: string, password: string) => {
        // Normalizar base64-url: reemplazar -/_ y agregar padding
        let b64 = cifrada.replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4 !== 0) b64 += '=';
        const data = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const salt = data.slice(0, 16);
        const iv = data.slice(16, 28); // 12 bytes
        const ciphertextAndTag = data.slice(28); // ciphertext + tag (últimos 16 bytes)
        console.log('Salt (base64):', btoa(String.fromCharCode(...salt)));
        console.log('IV (base64):', btoa(String.fromCharCode(...iv)));
        console.log('Ciphertext+Tag (base64):', btoa(String.fromCharCode(...ciphertextAndTag)));
        // Derivar clave
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
        console.log('Key derived (CryptoKey):', key);
        // Descifrar (WebCrypto espera tag al final del ciphertext)
        let decrypted;
        try {
          decrypted = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            ciphertextAndTag
          );
        } catch (e) {
          console.error('Error en decrypt:', e);
          throw e;
        }
        const privBytes = new Uint8Array(decrypted);
        // Log clave privada descifrada (PEM)
        const pemString = new TextDecoder().decode(privBytes);
        console.log('Clave privada descifrada (PEM):\n', pemString);
        return privBytes;
      };
      // Descifrar y convertir a PEM
      const privKeyBytes = await descifrarClavePrivada(claveCifrada, clavePago);
      // Convertir a string PEM
      let pem = new TextDecoder().decode(privKeyBytes);
      // Si el PEM parece estar en formato hex (\xNN), conviértelo a texto
      if (/^(\\x[0-9a-fA-F]{2})+$/.test(pem)) {
        const hex = pem.replace(/\\x/g, '');
        let str = '';
        for (let i = 0; i < hex.length; i += 2) {
          str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        }
        console.warn('[WARN] PEM estaba en hex, convertido a texto:', str);
        pem = str;
      }
      // Limpiar y extraer base64 del PEM
      const pemHeader = '-----BEGIN PRIVATE KEY-----';
      const pemFooter = '-----END PRIVATE KEY-----';
      const pemContents = pem.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '');
      console.log('PEM limpio (base64, sin headers ni espacios):', pemContents);
      if (!pemContents || !/^[A-Za-z0-9+/=]+$/.test(pemContents)) {
        console.error('[ERROR] El contenido base64 del PEM está vacío o malformado:', pemContents);
        setFirmaError('Error: El contenido base64 de la clave privada descifrada está vacío o malformado.');
        return;
      }
      let binaryDer;
      try {
        binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
      } catch (e) {
        console.error('[ERROR] atob falló para pemContents:', pemContents, e);
        setFirmaError('Error: El contenido base64 de la clave privada descifrada no es válido.');
        return;
      }
      console.log('DER length:', binaryDer.length, 'Primeros bytes:', binaryDer.slice(0, 16));
      let privateKey;
      try {
        privateKey = await window.crypto.subtle.importKey(
          'pkcs8',
          binaryDer.buffer,
          { name: 'RSA-PSS', hash: 'SHA-256' }, // <-- nombre correcto para WebCrypto
          false,
          ['sign']
        );
      } catch (e) {
        console.error('Error en importKey:', e);
        throw e;
      }
      // Construir mensaje a firmar
      const montoFormateado = Number(modal.solicitud.monto).toFixed(2);
      const mensaje = `${modal.solicitud.id_solicitud}:${cuentaSeleccionada}:${montoFormateado}`;
      console.log('[DEBUG] Mensaje firmado:', mensaje);
      const encoder = new TextEncoder();
      const signature = await window.crypto.subtle.sign(
        { name: 'RSA-PSS', saltLength: 32 },
        privateKey,
        encoder.encode(mensaje)
      );
      const firmaB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
      // Log para comparar con backend
      console.log('[DEBUG] Firma generada (base64):', firmaB64);
      console.log('[DEBUG] Firma generada (hex):', Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join(''));
      // Enviar al backend
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
      console.error('[ERROR en completarPago]:', e);
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
        // Recargar solicitudes sin recargar la página
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
                <div style={{ margin: '1em 0' }}>
                  <label>Clave privada cifrada:<br/>
                    <textarea value={claveCifrada} onChange={e => setClaveCifrada(e.target.value)} style={{ width:'100%' }} rows={2} placeholder="Pega aquí tu clave privada cifrada" />
                  </label>
                </div>
                <div style={{ margin: '1em 0' }}>
                  <label>Contraseña para descifrar:<br/>
                    <input type="password" value={clavePago} onChange={e => setClavePago(e.target.value)} style={{ width:'100%' }} maxLength={100} />
                  </label>
                </div>
                {firmaError && <div style={{ color: 'red', fontSize: 13 }}>{firmaError}</div>}
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
