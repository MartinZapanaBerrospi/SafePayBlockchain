import axios from 'axios';

const API_URL = '/api';

export async function getTarjetas(id_usuario: number) {
  const res = await axios.get(`${API_URL}/usuarios/${id_usuario}/tarjetas`);
  return res.data;
}

export async function agregarTarjeta(id_usuario: number, tarjeta: { numero_cuenta: string; fecha_vencimiento: string; cvv: string }) {
  const res = await axios.post(`${API_URL}/usuarios/${id_usuario}/tarjetas`, tarjeta);
  return res.data;
}

export async function eliminarTarjeta(id_usuario: number, id_tarjeta: number) {
  const res = await axios.delete(`${API_URL}/usuarios/${id_usuario}/tarjetas/${id_tarjeta}`);
  return res.data;
}

export async function retirarDinero(id_usuario: number, monto: number) {
  const res = await axios.post(`${API_URL}/usuarios/${id_usuario}/retirar`, { monto });
  return res.data;
}
