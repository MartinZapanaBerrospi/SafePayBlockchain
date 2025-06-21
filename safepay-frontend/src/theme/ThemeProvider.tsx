import React, { createContext, useContext, useEffect, useState } from 'react';

// Colores corporativos Interbank
const lightTheme = {
  background: '#f9fafb', // gris muy claro
  card: '#fff',
  text: '#18181b', // gris casi negro
  primary: '#2563eb', // azul profesional
  secondary: '#16a34a', // verde profesional
  accent: '#f59e42', // naranja suave
  border: '#e5e7eb', // gris claro
  buttonText: '#fff',
  success: '#16a34a',
  error: '#dc2626',
};

const darkTheme = {
  background: '#18181b', // gris oscuro
  card: '#23272f',
  text: '#f3f4f6', // blanco casi puro
  primary: '#60a5fa', // azul claro para contraste
  secondary: '#4ade80', // verde claro
  accent: '#facc15', // amarillo para acento
  border: '#374151', // gris oscuro
  buttonText: '#18181b',
  success: '#22d3ee',
  error: '#f87171',
};

// Definir el tipo del contexto para evitar errores de tipado
interface ThemeContextType {
  theme: typeof lightTheme;
  mode: 'light' | 'dark';
  setMode: (mode: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  mode: 'light',
  setMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme-mode');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Al cambiar el modo, guardar en localStorage
  const setMode = (newMode: 'light' | 'dark') => {
    setModeState(newMode);
    localStorage.setItem('theme-mode', newMode);
  };

  useEffect(() => {
    const root = document.documentElement;
    const theme = mode === 'dark' ? darkTheme : lightTheme;
    root.style.setProperty('--color-bg', theme.background);
    root.style.setProperty('--color-card', theme.card);
    root.style.setProperty('--color-text', theme.text);
    root.style.setProperty('--color-primary', theme.primary);
    root.style.setProperty('--color-secondary', theme.secondary);
    root.style.setProperty('--color-accent', theme.accent);
    root.style.setProperty('--color-border', theme.border);
    root.style.setProperty('--color-button-text', theme.buttonText);
    root.setAttribute('data-theme', mode);
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ theme: mode === 'dark' ? darkTheme : lightTheme, mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
