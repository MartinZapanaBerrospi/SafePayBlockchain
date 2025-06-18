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

export async function register(nombre: string, correo: string, telefono: string, contrasena: string, preguntaSecreta: string, respuestaSecreta: string) {
  try {
    const res = await axios.post('/api/usuarios/registrar', { nombre, correo, telefono, contrasena, pregunta_secreta: preguntaSecreta, respuesta_secreta: respuestaSecreta });
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.mensaje || 'Error al crear usuario');
  }
}

export async function checkUsuarioExiste(nombre: string) {
  try {
    const res = await axios.get(`/api/usuarios/existe-usuario?nombre=${encodeURIComponent(nombre)}`);
    return res.data.existe;
  } catch {
    return false;
  }
}

export async function checkCorreoExiste(correo: string) {
  try {
    const res = await axios.get(`/api/usuarios/existe-correo?correo=${encodeURIComponent(correo)}`);
    return res.data.existe;
  } catch {
    return false;
  }
}
