import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserProfile, AuthState } from '../types';
import { authAPI } from '../services/api';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string; companyName?: string }) => Promise<void>;
  logout: () => void;
  updateProfile: (profile: UserProfile) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    token: localStorage.getItem('token'),
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await authAPI.getMe();
          setState({
            user: response.data.user,
            profile: response.data.user.profile,
            token,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          localStorage.removeItem('token');
          setState({
            user: null,
            profile: null,
            token: null,
            isLoading: false,
            error: null,
          });
        }
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const response = await authAPI.login({ email, password });
      const { user, token } = response.data;
      
      localStorage.setItem('token', token);
      setState({
        user,
        profile: user.profile,
        token,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.response?.data?.error || 'Login failed',
      }));
      throw error;
    }
  };

  const register = async (data: { email: string; password: string; firstName: string; lastName: string; companyName?: string }) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const response = await authAPI.register(data);
      const { user, profile, token } = response.data;
      
      localStorage.setItem('token', token);
      setState({
        user,
        profile,
        token,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.response?.data?.error || 'Registration failed',
      }));
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setState({
      user: null,
      profile: null,
      token: null,
      isLoading: false,
      error: null,
    });
  };

  const updateProfile = (profile: UserProfile) => {
    setState(prev => ({ ...prev, profile }));
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};