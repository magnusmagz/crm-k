import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

export type AppMode = 'sales' | 'recruiting';

interface AppModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
}

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

export const useAppMode = () => {
  const context = useContext(AppModeContext);
  if (!context) {
    throw new Error('useAppMode must be used within AppModeProvider');
  }
  return context;
};

interface AppModeProviderProps {
  children: ReactNode;
}

export const AppModeProvider: React.FC<AppModeProviderProps> = ({ children }) => {
  // Initialize from localStorage or default to 'sales'
  const [mode, setModeState] = useState<AppMode>(() => {
    const savedMode = localStorage.getItem('appMode');
    return (savedMode === 'recruiting' ? 'recruiting' : 'sales') as AppMode;
  });

  const setMode = (newMode: AppMode) => {
    setModeState(newMode);
    localStorage.setItem('appMode', newMode);
  };

  const toggleMode = () => {
    const newMode = mode === 'sales' ? 'recruiting' : 'sales';
    setMode(newMode);
  };

  // Update document title based on mode
  useEffect(() => {
    const baseTitle = document.title.split(' - ')[0];
    document.title = `${baseTitle} - ${mode === 'recruiting' ? 'Recruiting' : 'Sales'} Mode`;
  }, [mode]);

  const value = {
    mode,
    setMode,
    toggleMode
  };

  return (
    <AppModeContext.Provider value={value}>
      {children}
    </AppModeContext.Provider>
  );
};

export default AppModeContext;