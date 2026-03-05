import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { lightColors, darkColors, type ThemeColors } from '../constants/theme';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  colors: ThemeColors;
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: lightColors,
  mode: 'light',
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');

  const toggleTheme = useCallback(() => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const colors = mode === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ colors, mode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
