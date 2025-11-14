// src/services/authService.ts
import { User } from '../types/user';
import { toast } from '@/components/ui/use-toast';
import { loginUser, registerUser, getCurrentUser as getCurrentUserAPI } from './api';
import CryptoJS from 'crypto-js';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

const SECRET = import.meta.env.VITE_ENCRYPTION_SECRET || 'default-supersecretkey';
const KEY = CryptoJS.SHA256(SECRET);

const decryptResponse = (payload: string, iv: string): any => {
  try {
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(payload),
    });
    const decrypted = CryptoJS.AES.decrypt(cipherParams, KEY, {
      iv: CryptoJS.enc.Base64.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
  } catch (err) {
    console.error('Decryption failed:', err);
    throw new Error('Failed to decrypt response');
  }
};

const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000;
    return Date.now() > exp;
  } catch (error) {
    console.error('Error decoding token:', error);
    return true;
  }
};

const authService = {
  getToken: (): string | null => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) return null;

      if (isTokenExpired(token)) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        return null;
      }

      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return null;
    }
  },

  setToken: (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken: (): void => {
    localStorage.removeItem(TOKEN_KEY);
  },

  login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
    try {
      const response = await loginUser(email, password);
      const data = response.data || response; // Normalize response
      if (!data) {
        throw new Error('Invalid login response from server');
      }
      const decryptedData = data.payload && data.iv
        ? decryptResponse(data.payload, data.iv)
        : data;
      if (!decryptedData?.token || !decryptedData?.user) {
        throw new Error('Invalid login response: Missing token or user data');
      }
      authService.saveAuthData(decryptedData);
      return decryptedData;
    } catch (error: any) {
      console.error('Login failed:', error);
      toast({
        title: 'Login Failed',
        description: error.message || 'Unable to log in. Please check your credentials.',
        variant: 'destructive',
        className: 'bg-red-500 text-white border-usm-gold',
      });
      throw error;
    }
  },

  register: async (name: string, email: string, password: string): Promise<{ token: string; user: User }> => {
    try {
      const response = await registerUser(name, email, password);
      const data = response.data || response; // Normalize response
      if (!data) {
        throw new Error('Invalid registration response from server');
      }
      const decryptedData = data.payload && data.iv
        ? decryptResponse(data.payload, data.iv)
        : data;
      if (!decryptedData?.token || !decryptedData?.user) {
        throw new Error('Invalid registration response: Missing token or user data');
      }
      authService.saveAuthData(decryptedData);
      return decryptedData;
    } catch (error: any) {
      console.error('Registration failed:', error);
      toast({
        title: 'Registration Failed',
        description: error.message || 'Unable to register. Please try again.',
        variant: 'destructive',
        className: 'bg-red-500 text-white border-usm-gold',
      });
      throw error;
    }
  },

  getCurrentUser: async (): Promise<User | null> => {
    const token = authService.getToken();
    if (!token) {
      console.warn('No token found for getCurrentUser');
      const cachedUser = localStorage.getItem(USER_KEY);
      return cachedUser ? JSON.parse(cachedUser) : null;
    }

    try {
      const response = await getCurrentUserAPI();
      const data = response.data || response; // Normalize response
      if (!data) {
        throw new Error('Invalid response from server: No data received');
      }
      const user = data.payload && data.iv
        ? decryptResponse(data.payload, data.iv)
        : data;
      if (!user || !user.id) {
        throw new Error('No user data in response');
      }
      // Normalize user ID
      user.id = user.id || user._id;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return user;
    } catch (error: any) {
      console.error('Error fetching current user:', error.message);
      const cachedUser = localStorage.getItem(USER_KEY);
      if (cachedUser) {
        return JSON.parse(cachedUser);
      }
      authService.clearAuthData();
      toast({
        title: 'Authentication Error',
        description: 'Unable to fetch user data. Please log in again.',
        variant: 'destructive',
        className: 'bg-red-500 text-white border-usm-gold',
      });
      setTimeout(() => window.location.href = '/signin', 2000);
      return null;
    }
  },

  saveAuthData: (response: { token: string; user: User }): void => {
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
  },

  clearAuthData: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  updateUserProfile: (userData: Partial<User>): User => {
    const cachedUser = localStorage.getItem(USER_KEY);
    if (!cachedUser) {
      throw new Error('No authenticated user found');
    }
    const currentUser = JSON.parse(cachedUser);
    const updatedUser = { ...currentUser, ...userData };
    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    return updatedUser;
  },

  isAuthenticated: (): boolean => {
    return !!authService.getToken();
  },
};

export default authService;
export const getToken = (): string | null => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const payload = JSON.parse(atob(token.split('.')[1]));
    if (Date.now() >= payload.exp * 1000) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }

    return token;
  } catch (error) {
    console.error('Error getting token:', error);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return null;
  }
};