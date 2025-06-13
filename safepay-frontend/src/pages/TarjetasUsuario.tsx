import React, { useEffect, useState } from 'react';

interface Tarjeta {
  id_tarjeta: number;
  numero_cuenta: string;
  fecha_vencimiento: string;
}

interface Props {
  id_usuario: number;
}

const TarjetasUsuario: React.FC<Props> = ({ id_usuario }) => {
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([]);
  const [numeroCuenta, setNumeroCuenta] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [cvv, setCvv] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargarTarjetas = async () => {
    const res = await fetch(`/api/usuarios/${id_usuario}/tarjetas`);
    const data = await res.json();
    setTarjetas(data);
  };

  useEffect(() => {
    cargarTarjetas();
    // eslint-disable-next-line
  }, []);

  const agregarTarjeta = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje('');
    const res = await fetch(`/api/usuarios/${id_usuario}/tarjetas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numero_cuenta: numeroCuenta,
        fecha_vencimiento: fechaVencimiento,
        cvv: cvv
      })
    });
    if (res.ok) {
      setMensaje('Tarjeta agregada correctamente');
      setNumeroCuenta('');
      setFechaVencimiento('');
      setCvv('');
      cargarTarjetas();
    } else {
      const data = await res.json();
      setMensaje(data.mensaje || 'Error al agregar tarjeta');
    }
  };

  return (
    <div>
      <h2>Mis Tarjetas</h2>
      <form onSubmit={agregarTarjeta} style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Número de cuenta"
          value={numeroCuenta}
          onChange={e => setNumeroCuenta(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Fecha de vencimiento (MM/AAAA)"
          value={fechaVencimiento}
          onChange={e => setFechaVencimiento(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="CVV"
          value={cvv}
          onChange={e => setCvv(e.target.value)}
          required
        />
        <button type="submit">Agregar Tarjeta</button>
      </form>
      {mensaje && <div>{mensaje}</div>}
      <ul>
        {tarjetas.map(t => (
          <li key={t.id_tarjeta}>
            **** **** **** {t.numero_cuenta} - Vence: {t.fecha_vencimiento}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TarjetasUsuario;
