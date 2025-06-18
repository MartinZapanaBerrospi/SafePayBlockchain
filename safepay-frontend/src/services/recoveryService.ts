import axios from 'axios';

export async function obtenerPreguntaSecreta() {
  const token = localStorage.getItem('token');
  const res = await axios.get('/api/usuarios/pregunta-secreta', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

export async function generarNuevaClavePrivada(respuestaSecreta: string) {
  const token = localStorage.getItem('token');
  try {
    const res = await axios.post('/api/usuarios/generar-clave-privada', { respuesta_secreta: respuestaSecreta }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.mensaje || 'Error al generar nueva clave privada');
  }
}
