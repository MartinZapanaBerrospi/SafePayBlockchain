import axios from 'axios';

export async function login(nombre: string, contrasena: string) {
  try {
    const res = await axios.post('/api/login', { nombre, contrasena });
    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
      return res.data;
    }
    throw new Error(res.data.mensaje || 'Error al iniciar sesión');
  } catch (err: any) {
    throw new Error(err.response?.data?.mensaje || 'Error al iniciar sesión');
  }
}

export async function register(nombre: string, correo: string, telefono: string, contrasena: string) {
  try {
    const res = await axios.post('/api/usuarios/registrar', { nombre, correo, telefono, contrasena });
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.mensaje || 'Error al crear usuario');
  }
}
