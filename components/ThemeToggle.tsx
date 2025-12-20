import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleTheme();
    }
  };

  return (
    <button
      onClick={toggleTheme}
      onKeyDown={handleKeyDown}
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
        isDark ? 'bg-indigo-600' : 'bg-zinc-300'
      }`}
    >
      <div
        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${
          isDark ? 'right-1' : 'left-1'
        }`}
      />
    </button>
  );
};
