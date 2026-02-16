import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeMode = 'dark' | 'light';
export type BackgroundType = 'solid' | 'gradient' | 'animated';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  backgroundGradient: string;
  card: string;
  cardBorder: string;
  text: string;
  textSecondary: string;
  textMuted: string;
}

export interface ThemePreferences {
  mode: ThemeMode;
  backgroundType: BackgroundType;
  accentColor: string;
  backgroundGradient: string;
  glassIntensity: number;
  solidBackgroundColor?: string;
  gradientColor1?: string;
  gradientColor2?: string;
}

interface ThemeContextType {
  theme: ThemeMode;
  preferences: ThemePreferences;
  colors: ThemeColors;
  setTheme: (theme: ThemeMode) => void;
  updatePreferences: (prefs: Partial<ThemePreferences>) => void;
  toggleMode: () => void;
}

const defaultPreferences: ThemePreferences = {
  mode: 'dark',
  backgroundType: 'animated',
  accentColor: '#00d4ff',
  backgroundGradient: 'linear-gradient(135deg, #0d0d1a 0%, #1a1a2e 50%, #0d0d1a 100%)',
  glassIntensity: 0.1,
  solidBackgroundColor: '#0a0a1a',
  gradientColor1: '#1a1a2e',
  gradientColor2: '#0f3460',
};

const darkColors: ThemeColors = {
  primary: '#00d4ff',
  secondary: '#a855f7',
  accent: '#00d4ff',
  background: '#0d0d1a',
  backgroundGradient: 'linear-gradient(135deg, #0d0d1a 0%, #1a1a2e 50%, #0d0d1a 100%)',
  card: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(255, 255, 255, 0.1)',
  text: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
};

const lightColors: ThemeColors = {
  primary: '#007AFF',
  secondary: '#5856D6',
  accent: '#007AFF',
  background: '#F2F2F7',
  backgroundGradient: 'linear-gradient(135deg, #E5E5EA 0%, #F2F2F7 50%, #FFFFFF 100%)',
  card: 'rgba(255, 255, 255, 0.8)',
  cardBorder: 'rgba(0, 0, 0, 0.1)',
  text: '#000000',
  textSecondary: 'rgba(0, 0, 0, 0.6)',
  textMuted: 'rgba(0, 0, 0, 0.3)',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<ThemePreferences>(() => {
    const saved = localStorage.getItem('vigileye-preferences');
    return saved ? JSON.parse(saved) : defaultPreferences;
  });

  const colors = preferences.mode === 'dark' ? {
    ...darkColors,
    accent: preferences.accentColor,
    primary: preferences.accentColor,
  } : {
    ...lightColors,
    accent: preferences.accentColor,
    primary: preferences.accentColor,
  };

  useEffect(() => {
    localStorage.setItem('vigileye-preferences', JSON.stringify(preferences));
    document.documentElement.setAttribute('data-theme', preferences.mode);
  }, [preferences]);

  const setTheme = (mode: ThemeMode) => {
    setPreferences(prev => ({ ...prev, mode }));
  };

  const updatePreferences = (prefs: Partial<ThemePreferences>) => {
    setPreferences(prev => ({ ...prev, ...prefs }));
  };

  const toggleMode = () => {
    setPreferences(prev => ({ 
      ...prev, 
      mode: prev.mode === 'dark' ? 'light' : 'dark' 
    }));
  };

  return (
    <ThemeContext.Provider value={{ 
      theme: preferences.mode, 
      preferences, 
      colors, 
      setTheme, 
      updatePreferences,
      toggleMode
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
