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
  const { profile, user } = useAuth();

  // Get organization branding from user.organization, fallback to profile or defaults
  const primaryColor = user?.organization?.primaryColor || user?.organization?.primary_color || profile?.primaryColor || '#1f2937';
  const crmName = user?.organization?.crmName || user?.organization?.crm_name || profile?.crmName || 'CRM Killer';

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

    // Generate darker variant (for hover states)
    const darkenColor = (hex: string, percent: number = 10) => {
      const num = parseInt(hex.replace('#', ''), 16);
      const amt = Math.round(2.55 * percent);
      const R = (num >> 16) - amt;
      const G = ((num >> 8) & 0x00FF) - amt;
      const B = (num & 0x0000FF) - amt;
      return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    };

    // Generate lighter variant (for active states)
    const lightenColor = (hex: string, percent: number = 20) => {
      const num = parseInt(hex.replace('#', ''), 16);
      const amt = Math.round(2.55 * percent);
      const R = (num >> 16) + amt;
      const G = ((num >> 8) & 0x00FF) + amt;
      const B = (num & 0x0000FF) + amt;
      return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    };

    const rgb = hexToRgb(primaryColor);
    if (rgb) {
      // Set primary color variables
      root.style.setProperty('--color-primary', `${rgb.r} ${rgb.g} ${rgb.b}`);
      root.style.setProperty('--color-primary-hex', primaryColor);
      
      // Set darker variant for hover states
      const darkerColor = darkenColor(primaryColor, 10);
      const darkerRgb = hexToRgb(darkerColor);
      if (darkerRgb) {
        root.style.setProperty('--color-primary-dark', `${darkerRgb.r} ${darkerRgb.g} ${darkerRgb.b}`);
        root.style.setProperty('--color-primary-dark-hex', darkerColor);
      }

      // Set lighter variant for active states
      const lighterColor = lightenColor(primaryColor, 20);
      const lighterRgb = hexToRgb(lighterColor);
      if (lighterRgb) {
        root.style.setProperty('--color-primary-light', `${lighterRgb.r} ${lighterRgb.g} ${lighterRgb.b}`);
        root.style.setProperty('--color-primary-light-hex', lighterColor);
      }
    }

    // Update page title
    document.title = crmName;
  }, [primaryColor, crmName, user]);

  return (
    <ThemeContext.Provider value={{ primaryColor, crmName }}>
      {children}
    </ThemeContext.Provider>
  );
};