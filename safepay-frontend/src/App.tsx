import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Inicio from './pages/inicio';
import PagosSeguros from './pages/PagosSeguros';
import TransferenciaUsuario from './pages/TransferenciaUsuario';
import Dashboard from './pages/Dashboard/Dashboard';
import Navbar from './components/Navbar';
import MiCuenta from './pages/MiCuenta';
import RecuperarClavePage from './pages/RecuperarClavePage';
import SolicitarResetPage from './pages/SolicitarResetPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

function AppRoutes() {
  const location = useLocation();
  // Ocultar navbar en login, registro, inicio y generación de clave privada
  const hideNavbar = ['/login', '/registro', '/inicio', '/generar-clave-privada', '/solicitar-reset', '/reset-password'].includes(location.pathname);
  return (
    <>
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route path="/inicio" element={<Inicio />} />
        <Route path="/pagos-seguros" element={<PagosSeguros />} />
        <Route path="/transferencia-usuario" element={<TransferenciaUsuario />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/mi-cuenta" element={<MiCuenta />} />
        <Route path="/mi-tarjeta" element={<Navigate to="/mi-cuenta" />} />
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/login" />} />
        <Route path="/generar-clave-privada" element={<RecuperarClavePage />} />
        <Route path="/solicitar-reset" element={<SolicitarResetPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
