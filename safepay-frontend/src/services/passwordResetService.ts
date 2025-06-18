import axios from 'axios';

export async function solicitarReset(correo: string) {
  try {
    const res = await axios.post('/api/usuarios/solicitar-reset', { correo });
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.mensaje || 'Error al solicitar recuperación');
  }
}

export async function resetPassword(token: string, nuevaContrasena: string) {
  try {
    const res = await axios.post('/api/usuarios/reset-password', { token, nueva_contrasena: nuevaContrasena });
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.mensaje || 'Error al restablecer contraseña');
  }
}
