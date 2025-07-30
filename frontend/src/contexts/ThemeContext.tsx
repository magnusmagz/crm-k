import React, { createContext, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface ThemeContextType {
  primaryColor: string;
  crmName: string;
}

const ThemeContext = createContext<ThemeContextType>({
  primaryColor: '#1f2937',
  crmName: 'CRM Killer',
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();

  const primaryColor = profile?.primaryColor || '#1f2937';
  const crmName = profile?.crmName || 'CRM Killer';

  useEffect(() => {
    // Update CSS variables for theme
    const root = document.documentElement;
    
    // Convert hex to RGB for CSS variables
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };

    const rgb = hexToRgb(primaryColor);
    if (rgb) {
      root.style.setProperty('--color-primary', `${rgb.r} ${rgb.g} ${rgb.b}`);
      root.style.setProperty('--color-primary-hex', primaryColor);
    }

    // Update page title
    document.title = crmName;
  }, [primaryColor, crmName]);

  return (
    <ThemeContext.Provider value={{ primaryColor, crmName }}>
      {children}
    </ThemeContext.Provider>
  );
};