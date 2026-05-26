import React, { createContext, useState, useEffect, useContext } from 'react';
import { tokenStorage } from '../utils/tokenStorage';
import apiClient, { BASE_URL } from '../api/apiClient';
import axios from 'axios';

// Polyfill local para descodificar base64 no ambiente do React Native (onde a função global 'atob' não existe)
function atob(input: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = input.replace(/=+$/, '');
  let output = '';

  if (str.length % 4 === 1) {
    throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
  }

  for (
    let bc = 0, bs = 0, buffer, i = 0;
    (buffer = str.charAt(i++));
    ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
      ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
      : 0
  ) {
    buffer = chars.indexOf(buffer);
  }

  return output;
}

// WHY: A self-contained, pure JS JWT decoder avoids installing heavy external libraries
// and handles standard base64 url-decoding safely.
function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // Decodes base64 string on mobile platforms safely.
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

interface User {
  userId: string;
  email: string;
  role: string;
  playerId?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, playerName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // WHY: Verify if a session already exists on startup. If an access token exists, decode it.
  // If it's expired, try to silently refresh it to avoid throwing the user back to the login screen.
  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const accessToken = await tokenStorage.getItem('accessToken');
        if (accessToken) {
          const payload = parseJwt(accessToken);
          const currentTime = Date.now() / 1000;

          // Check if access token is still active (sub 15m expiration)
          if (payload && payload.exp > currentTime) {
            setUser({
              userId: payload.sub,
              email: payload.email,
              role: payload.role,
              playerId: payload.playerId || undefined,
            });
          } else {
            // Token expired on startup: Attempt background rotation using the refresh token
            const refreshToken = await tokenStorage.getItem('refreshToken');
            if (refreshToken) {
              const response = await axios.post(`${BASE_URL}/auth/refresh`, {}, {
                headers: { Authorization: `Bearer ${refreshToken}` },
              });
              const { accessToken: newAccess, refreshToken: newRefresh } = response.data;
              await tokenStorage.setItem('accessToken', newAccess);
              await tokenStorage.setItem('refreshToken', newRefresh);
              
              const newPayload = parseJwt(newAccess);
              setUser({
                userId: newPayload.sub,
                email: newPayload.email,
                role: newPayload.role,
                playerId: newPayload.playerId || undefined,
              });
            }
          }
        }
      } catch (e) {
        console.log('Session verification expired or failed on startup:', e);
      } finally {
        setIsLoading(false);
      }
    };

    checkActiveSession();
  }, []);

  const login = async (email: string, password: string) => {
    // WHY: Use direct apiClient. Post credentials, capture tokens, save securely, decode, and mount context.
    const response = await apiClient.post('/auth/login', { email, password });
    const { accessToken, refreshToken } = response.data;

    await tokenStorage.setItem('accessToken', accessToken);
    await tokenStorage.setItem('refreshToken', refreshToken);

    const payload = parseJwt(accessToken);
    setUser({
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      playerId: payload.playerId || undefined,
    });
  };

  const register = async (email: string, password: string, playerName?: string) => {
    const response = await apiClient.post('/auth/register', { email, password, playerName });
    const { accessToken, refreshToken } = response.data;

    await tokenStorage.setItem('accessToken', accessToken);
    await tokenStorage.setItem('refreshToken', refreshToken);

    const payload = parseJwt(accessToken);
    setUser({
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      playerId: payload.playerId || undefined,
    });
  };

  const logout = async () => {
    try {
      // WHY: Notify backend to clear the hashed refresh token inside DB for security audit trails.
      await apiClient.post('/auth/logout');
    } catch (e) {
      console.log('Backend logout record expired or skipped:', e);
    } finally {
      // WHY: Always clear device tokens and memory context to prevent hijacking regardless of backend connectivity success.
      await tokenStorage.removeItem('accessToken');
      await tokenStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
