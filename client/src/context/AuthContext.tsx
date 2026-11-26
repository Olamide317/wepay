import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAuthToken, setAuthToken } from '../services/apiClient';
import { wepayService } from '../services/wepayService';
import { Organizer } from '../types/wepay';

interface AuthContextValue {
  organizer: Organizer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isMockMode: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  register: (data: {
    fullName: string;
    email: string;
    phone: string;
    handle: string;
    password: string;
  }) => Promise<void>;
  refreshOrganizer: () => Promise<void>;
  setOrganizerState: (org: Organizer) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMockMode = wepayService.isMockMode();

  useEffect(() => {
    let active = true;
    async function hydrate() {
      const token = getAuthToken();
      if (!token) {
        if (active) setIsLoading(false);
        return;
      }
      try {
        const org = await wepayService.getCurrentOrganizer();
        if (active) setOrganizer(org);
      } catch {
        setAuthToken(null);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    hydrate();
    return () => {
      active = false;
    };
  }, []);

  const login = async (email: string, password: string, remember = true) => {
    const res = await wepayService.login({ email, password, remember });
    setOrganizer(res.organizer);
  };

  const register = async (data: {
    fullName: string;
    email: string;
    phone: string;
    handle: string;
    password: string;
  }) => {
    const res = await wepayService.register(data);
    setOrganizer(res.organizer);
  };

  const refreshOrganizer = async () => {
    const org = await wepayService.getCurrentOrganizer();
    setOrganizer(org);
  };

  const logout = () => {
    setAuthToken(null);
    setOrganizer(null);
  };

  return (
    <AuthContext.Provider
      value={{
        organizer,
        isAuthenticated: Boolean(organizer),
        isLoading,
        isMockMode,
        login,
        register,
        refreshOrganizer,
        setOrganizerState: setOrganizer,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
