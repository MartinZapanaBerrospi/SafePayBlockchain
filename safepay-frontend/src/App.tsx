import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Inicio from './pages/inicio';
import PagosSeguros from './pages/PagosSeguros';
import TransferenciaUsuario from './pages/TransferenciaUsuario';
import Dashboard from './pages/Dashboard/Dashboard';
import Navbar from './components/Navbar';
import MiTarjeta from './pages/MiTarjeta';

function AppRoutes() {
  const location = useLocation();
  // Ocultar navbar en login, registro e inicio
  const hideNavbar = ['/login', '/registro', '/inicio'].includes(location.pathname);
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
        <Route path="/mi-tarjeta" element={<MiTarjeta />} />
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/login" />} />
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
