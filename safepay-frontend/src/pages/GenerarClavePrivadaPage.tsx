import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generarNuevaClavePrivada, obtenerPreguntaSecreta } from '../services/recoveryService';
import ThemeSwitch from '../components/ThemeSwitch';
import { useTheme } from '../theme/ThemeProvider';

export default function GenerarClavePrivadaPage() {
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [clavePrivadaCifrada, setClavePrivadaCifrada] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { mode } = useTheme();
  useEffect(() => {
    obtenerPreguntaSecreta()
      .then(res => setPregunta(res.pregunta_secreta))
      .catch(() => setPregunta('No se pudo obtener la pregunta secreta.'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setClavePrivadaCifrada(null);
    setLoading(true);
    try {
      const res = await generarNuevaClavePrivada(respuesta);
      if (res.clave_privada_cifrada) {
        setClavePrivadaCifrada(res.clave_privada_cifrada);
        setSuccess('¡Clave privada generada y cifrada correctamente!');
      } else {
        setError('No se pudo generar la clave privada.');
      }
    } catch (err: any) {
      setError(err.message || 'Error al generar la clave privada');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (clavePrivadaCifrada) navigator.clipboard.writeText(clavePrivadaCifrada);
  };
  const handleDownload = () => {
    if (clavePrivadaCifrada) {
      const blob = new Blob([clavePrivadaCifrada], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'clave_privada_cifrada.txt';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', transition: 'background 0.3s' }}>
      <div style={{ position: 'absolute', top: 18, right: 24, zIndex: 10 }}>
        <ThemeSwitch />
      </div>
      <div className="login-container card fade-in" style={{
        maxWidth: 480,
        margin: '6vh auto 6vh auto',
        background: 'var(--color-card)',
        borderRadius: 20,
        boxShadow: mode === 'dark' ? '0 4px 32px #0008' : '0 4px 24px #2563eb22',
        padding: '2.5em 2em 2em 2em',
        border: '1.5px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <h2 style={{ textAlign: 'center', color: 'var(--color-primary)', fontWeight: 900, fontSize: 28, marginBottom: 18 }}>Generar nueva clave privada</h2>
        <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <label style={{ fontWeight: 600, color: 'var(--color-text)' }}>
            Pregunta secreta
            <div style={{ fontWeight: 700, color: 'var(--color-primary)', marginBottom: 6, fontSize: 16 }}>{pregunta}</div>
          </label>
          <label style={{ fontWeight: 600, color: 'var(--color-text)' }}>
            Respuesta secreta
            <input
              type="text"
              placeholder="Ingresa tu respuesta secreta"
              value={respuesta}
              onChange={e => setRespuesta(e.target.value)}
              required
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1.5px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 16, marginTop: 4 }}
            />
          </label>
          {error && <div className="error" style={{ color: 'var(--color-error)', marginTop: 12, textAlign: 'center', fontWeight: 600 }}>{error}</div>}
          <button type="submit" className="btn-primary" style={{ fontWeight: 700, fontSize: 17, marginTop: 8, borderRadius: 8, padding: '10px 0', background: 'var(--color-primary)', color: 'var(--color-button-text)', border: 'none', boxShadow: mode === 'dark' ? '0 2px 8px #0006' : '0 2px 8px #2563eb22', transition: 'background 0.2s' }} disabled={loading}>
            {loading ? 'Procesando...' : 'Generar nueva clave privada'}
          </button>
        </form>
        {success && (
          <div style={{ marginTop: 24, color: 'var(--color-primary)', fontWeight: 700, textAlign: 'center', fontSize: 17 }}>{success}</div>
        )}
        {clavePrivadaCifrada && (
          <div style={{
            marginTop: 32,
            background: mode === 'dark' ? '#23272f' : '#fffde7',
            border: `1.5px solid var(--color-primary)` ,
            borderRadius: 12,
            padding: 28,
            color: 'var(--color-text)',
            fontWeight: 700,
            fontFamily: 'monospace',
            fontSize: 16,
            maxWidth: 520,
            marginLeft: 'auto',
            marginRight: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: mode === 'dark' ? '0 2px 16px #0008' : '0 2px 12px #2563eb22',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18, justifyContent: 'center' }}>
              <span style={{ fontSize: 36, color: '#fbc02d', marginRight: 14 }}>🔒</span>
              <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: 22, letterSpacing: 0.5 }}>
                ¡Guarda tu clave privada cifrada!
              </span>
            </div>
            <div style={{ margin: '18px 0 0 0', display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
              <input
                type="text"
                value={clavePrivadaCifrada}
                readOnly
                style={{ width: '100%', fontFamily: 'monospace', fontSize: 16, background: mode === 'dark' ? '#18181b' : '#fffde7', border: '1.5px solid var(--color-primary)', borderRadius: 8, padding: 12, color: 'var(--color-text)', fontWeight: 600, letterSpacing: 0.5 }}
              />
              <button
                style={{ marginLeft: 12, fontSize: 15, padding: '10px 16px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px #2563eb22' }}
                onClick={handleCopy}
                type="button"
              >
                Copiar
              </button>
              <button
                style={{ marginLeft: 10, fontSize: 15, padding: '10px 16px', background: 'var(--color-secondary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px #43a04722' }}
                onClick={handleDownload}
                type="button"
              >
                Descargar
              </button>
            </div>
            <div style={{ color:'#b71c1c', fontSize:16, marginTop: 18, fontWeight: 500, textAlign: 'center', lineHeight: 1.5 }}>
              Esta clave es única y solo se muestra una vez.<br/>
              Guárdala en un lugar seguro. La necesitarás junto con tu contraseña para firmar pagos y acceder a funciones avanzadas.
            </div>
          </div>
        )}
        <p style={{ textAlign: 'center', marginTop: 36, marginBottom: 0 }}>
          <button className="link" onClick={() => navigate('/inicio')} style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontWeight: 700, fontSize: 16, padding: '10px 24px', borderRadius: 8, margin: '0 auto', display: 'inline-block' }}>
            Volver a inicio
          </button>
        </p>
      </div>
    </div>
  );
}
