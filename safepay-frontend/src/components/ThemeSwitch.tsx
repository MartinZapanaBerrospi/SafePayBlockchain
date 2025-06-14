import React from 'react';
import { useTheme } from '../theme/ThemeProvider';

const ThemeSwitch: React.FC = () => {
  const { mode, setMode } = useTheme();

  return (
    <button
      onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
      style={{
        background: 'none',
        border: 'none',
        color: 'var(--color-primary)',
        fontSize: '1.3em',
        cursor: 'pointer',
        marginLeft: '1em',
        transition: 'color 0.2s',
      }}
      aria-label={mode === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={mode === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {mode === 'dark' ? '🌞' : '🌙'}
    </button>
  );
};

export default ThemeSwitch;
