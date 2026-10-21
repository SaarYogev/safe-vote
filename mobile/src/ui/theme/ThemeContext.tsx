import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Appearance } from 'react-native';
import { StorageProvider } from '../../services/IdentityService';

export type ThemeMode = 'system' | 'dark' | 'light';

export interface ThemeColors {
  background: string;
  card: string;
  cardSecondary: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  accentLight: string;
  success: string;
  successLight: string;
  danger: string;
  dangerLight: string;
  warning: string;
  inputBackground: string;
  divider: string;
  tabBarBackground: string;
  tabBarBorder: string;
  statusBar: 'light-content' | 'dark-content';
}

export const lightTheme: ThemeColors = {
  background: '#F2F2F7',
  card: '#FFFFFF',
  cardSecondary: '#F9F9FB',
  text: '#1C1C1E',
  textMuted: '#8E8E93',
  border: '#E5E5EA',
  accent: '#007AFF',
  accentLight: '#EBF3FE',
  success: '#34C759',
  successLight: '#E8F8EE',
  danger: '#FF3B30',
  dangerLight: '#FFEEEE',
  warning: '#FF9500',
  inputBackground: '#F9F9FB',
  divider: '#F2F2F7',
  tabBarBackground: '#FFFFFF',
  tabBarBorder: '#E5E5EA',
  statusBar: 'dark-content',
};

export const darkTheme: ThemeColors = {
  background: '#0D1117',
  card: '#161B22',
  cardSecondary: '#21262D',
  text: '#F0F6FC',
  textMuted: '#8B949E',
  border: '#30363D',
  accent: '#58A6FF',
  accentLight: '#162842',
  success: '#3FB950',
  successLight: '#132C1E',
  danger: '#F85149',
  dangerLight: '#371818',
  warning: '#D29922',
  inputBackground: '#21262D',
  divider: '#30363D',
  tabBarBackground: '#161B22',
  tabBarBorder: '#30363D',
  statusBar: 'light-content',
};

export interface ThemeContextValue {
  themeMode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const THEME_STORAGE_KEY = 'safevote_theme_preference';

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: 'system',
  resolvedTheme: 'light',
  colors: lightTheme,
  setThemeMode: async () => {},
});

export interface ThemeProviderProps {
  children: React.ReactNode;
  storage?: StorageProvider;
  initialMode?: ThemeMode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  storage,
  initialMode = 'system',
}) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(initialMode);
  const [systemScheme, setSystemScheme] = useState<'light' | 'dark'>(() => {
    return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme === 'dark' ? 'dark' : 'light');
    });
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!storage) return;
    storage.getItem(THEME_STORAGE_KEY).then((saved) => {
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        setThemeModeState(saved);
      }
    });
  }, [storage]);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    if (storage) {
      await storage.setItem(THEME_STORAGE_KEY, mode);
    }
  };

  const resolvedTheme: 'light' | 'dark' = useMemo(() => {
    if (themeMode === 'dark') return 'dark';
    if (themeMode === 'light') return 'light';
    return systemScheme;
  }, [themeMode, systemScheme]);

  const colors = useMemo(() => {
    return resolvedTheme === 'dark' ? darkTheme : lightTheme;
  }, [resolvedTheme]);

  const contextValue = useMemo(
    () => ({
      themeMode,
      resolvedTheme,
      colors,
      setThemeMode,
    }),
    [themeMode, resolvedTheme, colors]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => useContext(ThemeContext);
