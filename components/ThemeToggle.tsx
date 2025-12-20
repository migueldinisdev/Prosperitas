import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
        isDark ? 'bg-indigo-600' : 'bg-zinc-300'
      }`}
      aria-label="Toggle theme"
    >
      <div
        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${
          isDark ? 'right-1' : 'left-1'
        }`}
      />
    </button>
  );
};
