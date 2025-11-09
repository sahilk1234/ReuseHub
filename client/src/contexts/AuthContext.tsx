import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  isVerified: boolean;
  accountType: 'individual' | 'organization';
  ecoPoints: number;
  rating: number;
  totalExchanges: number;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  displayName: string;
  phone?: string;
  accountType: 'individual' | 'organization';
  latitude: number;
  longitude: number;
  address: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Check for existing session on mount
  useEffect(() => {
    console.log('[AuthContext] Initializing, checking for existing token...');
    const token = localStorage.getItem('accessToken');
    if (token) {
      console.log('[AuthContext] Token found, fetching current user');
      fetchCurrentUser();
    } else {
      console.log('[AuthContext] No token found, user not authenticated');
      setIsLoading(false);
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      console.log('[AuthContext] fetchCurrentUser - Token exists:', !!token);
      
      if (!token) {
        console.log('[AuthContext] No token, skipping user fetch');
        setIsLoading(false);
        return;
      }

      console.log('[AuthContext] Calling /auth/me endpoint...');
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('[AuthContext] /auth/me response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[AuthContext] User data received:', data.data?.email);
        setUser(data.data);
      } else {
        const errorData = await response.text();
        console.error('[AuthContext] Failed to fetch user, status:', response.status, 'error:', errorData);
        // Token is invalid, clear it
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        console.log('[AuthContext] Cleared invalid tokens');
      }
    } catch (error) {
      console.error('[AuthContext] Failed to fetch current user:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      console.log('[AuthContext] Cleared tokens due to error');
    } finally {
      setIsLoading(false);
      console.log('[AuthContext] fetchCurrentUser completed');
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Login failed');
      }

      const data = await response.json();
      
      // Store tokens
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      
      // Fetch full user profile
      await fetchCurrentUser();
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await fetch(`${API_URL}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Registration failed');
      }

      // After successful registration, redirect to login
      navigate('/login', { 
        state: { 
          message: 'Registration successful! Please check your email to verify your account.' 
        } 
      });
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and state regardless of API call success
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      navigate('/');
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Profile update failed');
      }

      // Refresh user data
      await fetchCurrentUser();
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
