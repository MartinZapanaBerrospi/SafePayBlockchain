import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Inicio from './pages/inicio';
import PagosSeguros from './pages/PagosSeguros';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route path="/inicio" element={<Inicio />} />
        <Route path="/pagos-seguros" element={<PagosSeguros />} />
        {/* Puedes agregar más rutas aquí, por ejemplo Dashboard */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
