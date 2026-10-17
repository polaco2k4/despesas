import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../lib/backendApi';
import type { Usuario } from '../types/database';

const USER_STORAGE_KEY = 'sgbd_user';

interface AuthContextType {
  userProfile: Usuario | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userProfile, setUserProfile] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on initial load
  useEffect(() => {
    const loadUser = () => {
      try {
        const userJson = localStorage.getItem(USER_STORAGE_KEY);
        if (userJson) {
          const user = JSON.parse(userJson);
          setUserProfile(user);
        }
      } catch (error) {
        console.error('Error loading user:', error);
        localStorage.removeItem(USER_STORAGE_KEY);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const result = await authAPI.signIn(email, password);
      if (result?.user) {
        setUserProfile(result.user);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(result.user));
        return { error: null };
      }
      return { error: result?.error || 'Credenciais inválidas' };
    } catch (error) {
      console.error('Login error:', error);
      return { error: 'Erro ao fazer login. Tente novamente.' };
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await authAPI.signOut();
      setUserProfile(null);
      localStorage.removeItem(USER_STORAGE_KEY);
      return { error: null };
    } catch (error) {
      console.error('Logout error:', error);
      return { error: 'Erro ao fazer logout' };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    userProfile,
    loading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};