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
  '¿Cuál es mi saldo?',
  '¿Cómo hago una transferencia?',
  '¿Cómo registro una tarjeta?',
  '¿Cómo consulto mi historial?',
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

const INTENT_KEYWORDS = [
  { intent: 'saludo', keywords: ['hola', 'buenos días', 'buenas tardes', 'buenas noches', 'qué tal', 'saludos', 'hey', 'holi', 'hello', 'hi'] },
  { intent: 'despedida', keywords: ['adiós', 'hasta luego', 'nos vemos', 'bye', 'chao', 'me voy', 'gracias, chau', 'gracias, adiós'] },
  { intent: 'agradecimiento', keywords: ['gracias', 'muchas gracias', 'te agradezco', 'thank you', 'thanks'] },
  { intent: 'info_general', keywords: ['qué es safepay', 'información general', 'presentación', 'sobre safepay', 'seguro', 'quién puede usar'] },
  { intent: 'registro', keywords: ['cómo me registro', 'registrarme', 'crear cuenta', 'abrir cuenta'] },
  { intent: 'funciones', keywords: ['qué funciones tiene', 'qué puedo hacer', 'servicios disponibles', 'funcionalidades'] },
  { intent: 'ayuda', keywords: ['ayuda', 'soporte', 'opciones'] },
];

const INTENT_RESPONSES = {
  saludo: '¡Hola! ¿En qué puedo ayudarte hoy? Puedes preguntarme sobre SafePay, registro, funciones, seguridad y más.',
  despedida: '¡Hasta luego! Si tienes más preguntas, aquí estaré para ayudarte.',
  agradecimiento: '¡De nada! Si necesitas más información, no dudes en preguntar.',
  info_general: 'SafePay es una plataforma de pagos segura basada en blockchain, diseñada para facilitar transferencias, gestión de tarjetas y solicitudes de pago de manera confiable. Cualquier persona puede usar SafePay para pagos y transferencias seguras.',
  registro: 'Para registrarte, haz clic en “Crear usuario” en la pantalla de inicio de sesión y completa tus datos. Es rápido y sencillo.',
  funciones: 'SafePay permite: transferencias seguras, gestión de tarjetas, solicitudes de pago, registro de dispositivos y consulta de historial.',
  ayuda: 'Puedes preguntarme sobre qué es SafePay, cómo registrarte, qué funciones tiene, seguridad y más. ¿Sobre qué tema necesitas ayuda?'
};

const INTENT_KEYWORDS_CON_SESION = [
  { intent: 'saludo', keywords: ['hola', 'buenos días', 'buenas tardes', 'buenas noches', 'qué tal', 'saludos', 'hey', 'holi', 'hello', 'hi'] },
  { intent: 'agradecimiento', keywords: ['gracias', 'muchas gracias', 'te agradezco', 'thank you', 'thanks'] },
];

const INTENT_RESPONSES_CON_SESION = {
  saludo: '¡Hola! ¿En qué operación bancaria puedo ayudarte hoy?',
  agradecimiento: '¡Con gusto! Si necesitas realizar una consulta o transacción, solo dime.',
};

// Unificar intenciones de saludo y agradecimiento para ambos modos
const INTENT_KEYWORDS_COMUN = [
  { intent: 'saludo', keywords: ['hola', 'buenas', 'buenos días', 'buenas tardes', 'buenas noches', 'qué tal', 'saludos', 'hey', 'holi', 'hello', 'hi'] },
  { intent: 'agradecimiento', keywords: ['gracias', 'muchas gracias', 'te agradezco', 'thank you', 'thanks'] },
];

const INTENT_RESPONSES_COMUN = {
  saludo: '¡Hola! ¿En qué puedo ayudarte hoy?',
  agradecimiento: '¡Con gusto! Si necesitas más información o ayuda, solo dime.',
};

function detectarIntencion(texto: string): keyof typeof INTENT_RESPONSES | 'desconocida' {
  const lower = texto.toLowerCase();
  for (const { intent, keywords } of INTENT_KEYWORDS) {
    if (keywords.some(k => lower.includes(k))) return intent as keyof typeof INTENT_RESPONSES;
  }
  return 'desconocida';
}

function detectarIntencionConSesion(texto: string): keyof typeof INTENT_RESPONSES_CON_SESION | 'desconocida' {
  const lower = texto.toLowerCase();
  for (const { intent, keywords } of INTENT_KEYWORDS_CON_SESION) {
    if (keywords.some(k => lower.includes(k))) return intent as keyof typeof INTENT_RESPONSES_CON_SESION;
  }
  return 'desconocida';
}

function detectarIntencionComun(texto: string): keyof typeof INTENT_RESPONSES_COMUN | 'desconocida' {
  const lower = texto.toLowerCase();
  for (const { intent, keywords } of INTENT_KEYWORDS_COMUN) {
    if (keywords.some(k => lower.includes(k))) return intent as keyof typeof INTENT_RESPONSES_COMUN;
  }
  return 'desconocida';
}

const ChatbotWidget: React.FC = () => {
  const [input, setInput] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [visible, setVisible] = useState(false);
  const [logueado, setLogueado] = useState(!!localStorage.getItem('userData'));
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
  }, [mensajes]);

  // Detectar solo el estado de sesión para actualizar el modo del chatbot
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    setLogueado(!!userData);
  }, []);

  // Escuchar cambios en localStorage para actualizar el modo del chatbot en tiempo real
  useEffect(() => {
    const checkSession = () => {
      setLogueado(!!localStorage.getItem('userData'));
    };
    window.addEventListener('storage', checkSession);
    // También escuchar cambios locales (ej: login/logout en la misma pestaña)
    const interval = setInterval(checkSession, 1000);
    return () => {
      window.removeEventListener('storage', checkSession);
      clearInterval(interval);
    };
  }, []);

  // Mensaje de bienvenida profesional y actualización de sugerencias al iniciar/cerrar sesión
  useEffect(() => {
    setMensajes([
      {
        autor: 'bot',
        texto: logueado
          ? '¡Bienvenido a SafePay! Soy tu asistente virtual. Puedes consultarme sobre tu saldo, transferencias, pagos, historial, tarjetas, solicitudes y dispositivos. ¿En qué puedo ayudarte hoy?'
          : '¡Bienvenido a SafePay! Soy tu asistente virtual. ¿Te gustaría saber cómo funciona la plataforma, cómo registrarte o qué beneficios te ofrece? Pregúntame lo que necesites.'
      }
    ]);
  }, [logueado]);

  const enviarMensaje = async (texto: string) => {
    setMensajes(m => [...m, { autor: 'usuario', texto }]);
    setEnviando(true);
    // Detección global de saludo y agradecimiento
    const intentComun = detectarIntencionComun(texto);
    if (intentComun !== 'desconocida') {
      setTimeout(() => {
        setMensajes(m => [...m, { autor: 'bot', texto: INTENT_RESPONSES_COMUN[intentComun] }]);
        setEnviando(false);
      }, 500);
      return;
    }
    if (!logueado) {
      // Detección de intenciones local antes de login
      const intent = detectarIntencion(texto);
      if (intent !== 'desconocida') {
        setTimeout(() => {
          setMensajes(m => [...m, { autor: 'bot', texto: INTENT_RESPONSES[intent] }]);
          setEnviando(false);
        }, 500);
        return;
      } else {
        setTimeout(() => {
          setMensajes(m => [...m, { autor: 'bot', texto: 'No entendí tu mensaje. Puedes preguntarme sobre SafePay, registro, funciones, seguridad o escribir “ayuda”.' }]);
          setEnviando(false);
        }, 500);
        return;
      }
    } else {
      // Detección de saludo y agradecimiento local después de login
      const intent = detectarIntencionConSesion(texto);
      if (intent !== 'desconocida') {
        setTimeout(() => {
          setMensajes(m => [...m, { autor: 'bot', texto: INTENT_RESPONSES_CON_SESION[intent] }]);
          setEnviando(false);
        }, 500);
        return;
      }
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
        setMensajes(m => [...m, { autor: 'bot', texto: data.respuesta }]);
      } catch {
        setMensajes(m => [...m, { autor: 'bot', texto: 'Ocurrió un error. Intenta de nuevo.' }]);
      }
      setEnviando(false);
    }
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
      <div style={{ width: 370, maxWidth: '98vw', height: 520, maxHeight: '90vh', background: 'linear-gradient(135deg, #f7fafd 60%, #e3eafc 100%)', borderRadius: 18, boxShadow: '0 4px 24px #00336622', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: `2px solid ${coloresInterbank.azul}` }}>
        <div style={{ background: coloresInterbank.azul, color: coloresInterbank.blanco, padding: '14px 20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 17, letterSpacing: 0.2 }}>
          <span style={{ opacity: 0.92 }}>Asistente Interbank</span>
          <button onClick={() => setVisible(false)} style={{ background: 'none', border: 'none', color: coloresInterbank.blanco, fontSize: 22, cursor: 'pointer', borderRadius: 6, padding: 2, transition: 'background 0.2s' }} title="Cerrar" aria-label="Cerrar chatbot" onMouseOver={e => e.currentTarget.style.background='#00336633'} onMouseOut={e => e.currentTarget.style.background='none'}>✖</button>
        </div>
        <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: 16, background: 'transparent', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mensajes.map((m, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: m.autor === 'usuario' ? 'flex-end' : 'flex-start',
                alignItems: 'center',
                animation: 'fadeIn 0.4s',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  background: m.autor === 'usuario' ? '#e8f7ec' : '#fff',
                  color: m.autor === 'usuario' ? coloresInterbank.verde : coloresInterbank.azul,
                  borderRadius: 18,
                  padding: '11px 18px',
                  maxWidth: 260,
                  minWidth: 48,
                  wordBreak: 'break-word',
                  fontSize: 15,
                  fontWeight: 500,
                  boxShadow: m.autor === 'usuario'
                    ? '0 2px 8px #43B02A22'
                    : '0 2px 8px #00336611',
                  border: m.autor === 'usuario' ? `1.2px solid #b6e2c6` : `1.2px solid #e3eafc`,
                  marginBottom: 2,
                  marginTop: 2,
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
              >
                {m.texto}
              </span>
            </div>
          ))}
        </div>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <form onSubmit={handleSubmit} style={{ display: 'flex', borderTop: `1px solid #e3eafc`, background: 'transparent', padding: 10, gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={logueado ? "Escribe tu mensaje..." : "Puedes preguntar sobre SafePay, registro, funciones, etc."}
            style={{
              flex: 1,
              border: `1.2px solid #e3eafc`,
              padding: '11px 14px',
              outline: 'none',
              fontSize: 15,
              background: '#fff',
              color: coloresInterbank.grisOscuro,
              fontWeight: 500,
              borderRadius: 10,
              boxShadow: '0 1px 4px #00336608',
              marginRight: 4,
              transition: 'border 0.2s',
            }}
            disabled={enviando}
            autoComplete="off"
          />
          <button
            type="submit"
            style={{
              background: coloresInterbank.azul,
              border: 'none',
              color: coloresInterbank.blanco,
              fontWeight: 'bold',
              fontSize: 15,
              padding: '0 18px',
              borderRadius: 8,
              cursor: 'pointer',
              boxShadow: '0 2px 8px #00336611',
              transition: 'background 0.2s',
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            disabled={enviando}
          >Enviar</button>
        </form>
        <div style={{ padding: '8px 10px', background: 'transparent', borderTop: `1px solid #e3eafc`, display: 'flex', gap: 8, overflowX: 'auto', justifyContent: 'flex-start' }}>
          {(!logueado ? sugerenciasSinSesion : sugerenciasConSesion).map(s => (
            <button key={s} style={{ fontSize: 13, background: '#f0f4fa', border: 'none', borderRadius: 16, padding: '7px 16px', cursor: 'pointer', color: coloresInterbank.azul, fontWeight: 500, boxShadow: '0 1px 4px #00336611', whiteSpace: 'nowrap', marginBottom: 2, borderBottom: `2px solid #e3eafc` }} onClick={() => enviarMensaje(s)} disabled={enviando}>{s}</button>
          ))}
        </div>
        {!logueado && (
          <div style={{ background: coloresInterbank.amarillo, color: coloresInterbank.naranja, padding: 10, fontSize: 13, textAlign: 'center', borderTop: '1px solid #ffe082', borderRadius: '0 0 18px 18px' }}>
            Inicia sesión para acceder a funciones personalizadas del asistente.
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatbotWidget;
