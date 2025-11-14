import { User } from '../types/user';
import * as authService from './authService';
import CryptoJS from 'crypto-js'; // Add crypto-js import

// Use import.meta.env for Vite
const API_URL = import.meta.env.VITE_API_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

// Decryption function
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

// Interface for API response
interface ApiResponse<T = any> {
  data: T;
  success?: boolean;
  message?: string;
}

// Validate MongoDB ObjectId// Utility to validate MongoDB ObjectId
export const isValidObjectId = (id: string | undefined): id is string => {
  return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
};

export const fetchAPI = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = authService.getToken();
  const fullUrl = `${API_URL}/${endpoint.replace(/^\//, '')}`; 

  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'x-api-key': API_KEY || 'mySuperSecretToken',
    ...options.headers,
  };

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      let errorMessage = `HTTP error ${response.status} for ${fullUrl}`;
      try {
        const json = JSON.parse(text);
        errorMessage = json.message || errorMessage;
        if (response.status === 401 || errorMessage.includes('No token provided')) {
          console.warn('Unauthorized access, logging out...', { endpoint, status: response.status });
          authService.clearAuthData();
          window.location.href = '/login';
          errorMessage = 'Authentication required: Please log in.';
        } else if (response.status === 403) {
          console.warn('Forbidden: Check x-api-key configuration', { endpoint, status: response.status });
          errorMessage = 'Forbidden: Invalid API key.';
        } else if (response.status === 404) {
          console.warn(`Resource not found: ${fullUrl}`);
          errorMessage = 'Resource not found: The requested endpoint does not exist.';
        }
      } catch {
        console.error(`fetchAPI: Non-JSON response received from ${fullUrl}:`, text.slice(0, 100));
        errorMessage = `Invalid response from ${fullUrl}: ${text.slice(0, 50)}...`;
      }
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error(`fetchAPI: Invalid content-type from ${fullUrl}:`, contentType, text.slice(0, 100));
      throw new Error(`Invalid response format from ${fullUrl}: ${text.slice(0, 50)}...`);
    }

    const json = await response.json();
    // Decrypt response if encrypted
    const decryptedData = json.payload && json.iv
      ? decryptResponse(json.payload, json.iv)
      : json;
    // console.log(`fetchAPI: Decrypted response from ${fullUrl}:`, decryptedData);
    return decryptedData.data || decryptedData;
  } catch (error: any) {
    console.error(`fetchAPI: API call failed for ${fullUrl}:`, error.message);
    throw error;
  }
};



// Auth APIs
export const loginUser = async (email: string, password: string) => {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  return fetchAPI('auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

export const registerUser = async (name: string, email: string, password: string) => {
  if (!name || !email || !password) {
    throw new Error('Name, email and password are required');
  }
  return fetchAPI('auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
};

export const getCurrentUser = async (): Promise<User> => {
  return fetchAPI('users/current');
};

export const updateProfile = async (userData: Partial<User>) => {
  if (!userData || typeof userData !== 'object') {
    throw new Error('Invalid user data');
  }
  return fetchAPI('auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(userData),
  });
};




// Users APIs
export const getUsers = async (): Promise<User[]> => {
  return fetchAPI('users');
};


// Upload image
export const uploadImage = async (file: File): Promise<{ url: string }> => {
  if (!(file instanceof File)) {
    throw new Error('Invalid file provided');
  }

  const formData = new FormData();
  formData.append('image', file);
  const token = authService.getToken();

  try {
    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'x-api-key': API_KEY || 'mySuperSecretToken',
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Image upload failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading image:', error);
    return { url: `https://source.unsplash.com/random/800x600?t=${Date.now()}` };
  }
};
