import React, { createContext, useContext, useEffect, useState } from 'react';

// Colores corporativos Interbank
const lightTheme = {
  background: '#f4fafd',
  card: '#fff',
  text: '#222',
  primary: '#2196f3', // Azul
  secondary: '#43a047', // Verde
  accent: '#00bcd4',
  border: '#e0e0e0',
  buttonText: '#fff',
};

const darkTheme = {
  background: '#181c1f',
  card: '#23272b',
  text: '#f4fafd',
  primary: '#43a047', // Verde Interbank
  secondary: '#2196f3', // Azul
  accent: '#00bcd4',
  border: '#333',
  buttonText: '#fff',
};

const ThemeContext = createContext({
  theme: lightTheme,
  mode: 'light',
  setMode: (mode: 'light' | 'dark') => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<'light' | 'dark'>(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

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
