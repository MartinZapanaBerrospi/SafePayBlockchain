import axios from 'axios';

const API_URL = '/api';

export async function getCuenta(id_usuario: number) {
  const res = await axios.get(`${API_URL}/cuentas`);
  // Buscar la cuenta activa del usuario
  return res.data.find((c: any) => c.id_usuario === id_usuario && c.activa);
}

export async function getTransacciones(id_cuenta: number) {
  const res = await axios.get(`${API_URL}/transacciones`);
  // Filtrar transacciones donde la cuenta sea origen o destino
  return res.data.filter((t: any) => t.cuenta_origen === id_cuenta || t.cuenta_destino === id_cuenta);
}
