import React, { useState, useRef, useEffect } from 'react';

interface Mensaje {
  autor: 'usuario' | 'bot';
  texto: string;
}

const sugerenciasSinSesion = [
  '¿Qué es SafePay?',
  '¿Cómo me registro?',
  '¿Qué funciones tiene?',
  '¿SafePay es seguro?',
  '¿Quién puede usar SafePay?',
  'Ayuda'
];
const sugerenciasConSesion = [
  '¿Cómo hago una transferencia?',
  '¿Cómo registro una tarjeta?',
  '¿Cómo consulto mi saldo?',
  '¿Cómo veo mi historial?',
  '¿Cómo solicito un pago?',
  '¿Cómo registro un dispositivo?',
  'Ayuda'
];

const coloresInterbank = {
  verde: '#43B02A',
  azul: '#003366',
  blanco: '#fff',
  grisOscuro: '#222',
  grisClaro: '#f7f7f7',
  grisMedio: '#e3eafc',
  amarillo: '#fffbe6',
  naranja: '#b26a00',
};

const ChatbotWidget: React.FC = () => {
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    { autor: 'bot', texto: '¡Hola! Soy tu asistente. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [visible, setVisible] = useState(false);
  const [logueado, setLogueado] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
    const userData = localStorage.getItem('userData');
    setLogueado(!!userData);
  }, [mensajes]);

  // Mensaje de bienvenida personalizado
  useEffect(() => {
    if (mensajes.length === 1) {
      setMensajes([
        {
          autor: 'bot',
          texto: logueado
            ? '¡Hola! Soy tu asistente. Puedes preguntarme sobre transferencias, pagos, tarjetas, solicitudes, dispositivos y más.'
            : '¡Hola! Soy tu asistente informativo. Pregúntame sobre SafePay, registro, funciones, seguridad y más.'
        }
      ]);
    }
    // eslint-disable-next-line
  }, [logueado]);

  const enviarMensaje = async (texto: string) => {
    setMensajes(m => [...m, { autor: 'usuario', texto }]);
    setEnviando(true);
    try {
      const headers: any = { 'Content-Type': 'application/json' };
      const userData = localStorage.getItem('userData');
      if (userData) {
        const { token } = JSON.parse(userData);
        if (token) headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers,
        body: JSON.stringify({ mensaje: texto })
      });
      const data = await res.json();
      // Si no hay sesión y la respuesta es de función protegida, muestra advertencia
      if (!logueado && [
        'saldo', 'historial', 'tarjetas', 'solicitudes', 'dispositivos', 'transferencia', 'pago', 'blockchain'
      ].some(palabra => texto.toLowerCase().includes(palabra))) {
        setMensajes(m => [...m, { autor: 'bot', texto: 'Debes iniciar sesión para acceder a esta función.' }]);
      } else {
        setMensajes(m => [...m, { autor: 'bot', texto: data.respuesta }]);
      }
    } catch {
      setMensajes(m => [...m, { autor: 'bot', texto: 'Ocurrió un error. Intenta de nuevo.' }]);
    }
    setEnviando(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      enviarMensaje(input.trim());
      setInput('');
    }
  };

  const theme = {
    fondo: coloresInterbank.blanco,
    texto: coloresInterbank.grisOscuro,
    burbujaUsuario: coloresInterbank.verde,
    burbujaBot: coloresInterbank.grisMedio,
    textoUsuario: coloresInterbank.blanco,
    textoBot: coloresInterbank.grisOscuro,
    borde: coloresInterbank.azul,
    sugerencia: coloresInterbank.azul,
  };

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="chatbot-fab"
        title="Abrir asistente Interbank"
        aria-label="Abrir asistente Interbank"
        style={{ width: 56, height: 56, fontSize: 28, borderRadius: '50%' }}
      >
        🤖
      </button>
    );
  }

  // Panel más grande y responsive
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, fontFamily: 'Segoe UI, Arial, sans-serif', maxWidth: '98vw' }}>
      <div style={{ width: 370, maxWidth: '98vw', height: 520, maxHeight: '90vh', background: theme.fondo, borderRadius: 14, boxShadow: '0 2px 16px #0003', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: `2px solid ${theme.borde}` }}>
        <div style={{ background: theme.borde, color: theme.texto, padding: '12px 16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Asistente Interbank</span>
          <button onClick={() => setVisible(false)} style={{ background: 'none', border: 'none', color: theme.texto, fontSize: 20, cursor: 'pointer' }} title="Cerrar">✖</button>
        </div>
        <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: 16, background: coloresInterbank.grisClaro }}>
          {mensajes.map((m, i) => (
            <div key={i} style={{ textAlign: m.autor === 'usuario' ? 'right' : 'left', margin: '8px 0' }}>
              <span style={{ display: 'inline-block', background: m.autor === 'usuario' ? theme.burbujaUsuario : theme.burbujaBot, color: m.autor === 'usuario' ? theme.textoUsuario : theme.textoBot, borderRadius: 16, padding: '12px 18px', maxWidth: 300, wordBreak: 'break-word', fontSize: 16, boxShadow: m.autor === 'usuario' ? '0 1px 4px #0002' : 'none' }}>{m.texto}</span>
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', borderTop: `1px solid ${theme.borde}`, background: theme.fondo }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={logueado ? "Escribe tu mensaje..." : "Puedes preguntar sobre SafePay, registro, funciones, etc."}
            style={{ flex: 1, border: 'none', padding: 16, outline: 'none', fontSize: 17, background: 'transparent', color: theme.texto, fontWeight: 500 }}
            disabled={enviando}
            autoComplete="off"
          />
          <button type="submit" style={{ background: 'none', border: 'none', color: theme.borde, fontWeight: 'bold', fontSize: 20, padding: '0 18px', cursor: 'pointer' }} disabled={enviando}>Enviar</button>
        </form>
        <div style={{ padding: 10, background: coloresInterbank.grisClaro, borderTop: `1px solid ${theme.borde}`, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {(logueado ? sugerenciasConSesion : sugerenciasSinSesion).map(s => (
            <button key={s} style={{ fontSize: 14, background: theme.sugerencia, border: 'none', borderRadius: 12, padding: '7px 14px', cursor: 'pointer', color: theme.textoUsuario, fontWeight: 500 }} onClick={() => enviarMensaje(s)} disabled={enviando}>{s}</button>
          ))}
        </div>
        {!logueado && (
          <div style={{ background: coloresInterbank.amarillo, color: coloresInterbank.naranja, padding: 12, fontSize: 14, textAlign: 'center', borderTop: '1px solid #ffe082' }}>
            Inicia sesión para acceder a funciones personalizadas del asistente.
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatbotWidget;
