import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAuthToken, setAuthToken } from '../services/apiClient';
import { wepayService } from '../services/wepayService';
import { Organizer } from '../types/wepay';

interface AuthContextValue {
  organizer: Organizer | null;
  isAuthenticated: boolean;
  isNewUser: boolean;
  isLoading: boolean;
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

const NEW_USER_STORAGE_KEY = 'wepay_is_new_user';

function readIsNewUserFlag(): boolean {
  try {
    return typeof window !== 'undefined' && window.sessionStorage.getItem(NEW_USER_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeIsNewUserFlag(value: boolean): void {
  try {
    if (typeof window === 'undefined') return;
    if (value) {
      window.sessionStorage.setItem(NEW_USER_STORAGE_KEY, 'true');
    } else {
      window.sessionStorage.removeItem(NEW_USER_STORAGE_KEY);
    }
  } catch {
    // Ignore storage access errors
  }
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [isNewUser, setIsNewUser] = useState<boolean>(readIsNewUserFlag);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function hydrate() {
      const token = getAuthToken();
      if (!token) {
        writeIsNewUserFlag(false);
        if (active) {
          setIsNewUser(false);
          setIsLoading(false);
        }
        return;
      }
      try {
        const org = await wepayService.getCurrentOrganizer();
        if (active) setOrganizer(org);
      } catch {
        setAuthToken(null);
        writeIsNewUserFlag(false);
        if (active) setIsNewUser(false);
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
    writeIsNewUserFlag(false);
    setIsNewUser(false);
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
    writeIsNewUserFlag(true);
    setIsNewUser(true);
    setOrganizer(res.organizer);
  };

  const refreshOrganizer = async () => {
    const org = await wepayService.getCurrentOrganizer();
    setOrganizer(org);
  };

  const logout = () => {
    setAuthToken(null);
    writeIsNewUserFlag(false);
    setIsNewUser(false);
    setOrganizer(null);
  };

  return (
    <AuthContext.Provider
      value={{
        organizer,
        isAuthenticated: Boolean(organizer),
        isNewUser,
        isLoading,
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
