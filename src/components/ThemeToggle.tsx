import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme/ThemeProvider';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-xl border border-app-border bg-app-card px-3 py-2 text-sm font-medium text-app-foreground shadow-sm transition-colors hover:bg-app-surface"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      <span className="hidden sm:inline">{isDark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
};
