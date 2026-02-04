import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '../services/api';
import type { User, LoginCredentials, RegisterData } from '../types';

export const useAuthStore = defineStore('auth', () => {
  // Load user from localStorage on init
  const storedUser = localStorage.getItem('auth_user');
  const user = ref<User | null>(storedUser ? JSON.parse(storedUser) : null);
  const token = ref<string | null>(localStorage.getItem('auth_token'));
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!token.value && !!user.value);

  async function login(credentials: LoginCredentials) {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await authApi.login(credentials);
      user.value = response.user;
      token.value = response.token;
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('auth_user', JSON.stringify(response.user));
      return true;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Login failed';
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function register(registerData: RegisterData) {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await authApi.register(registerData);
      user.value = response.user;
      token.value = response.token;
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('auth_user', JSON.stringify(response.user));
      return true;
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Registration failed';
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function fetchCurrentUser() {
    if (!token.value) return false;

    loading.value = true;
    
    try {
      user.value = await authApi.getCurrentUser();
      localStorage.setItem('auth_user', JSON.stringify(user.value));
      return true;
    } catch (err) {
      logout();
      return false;
    } finally {
      loading.value = false;
    }
  }

  function logout() {
    user.value = null;
    token.value = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    fetchCurrentUser,
    logout,
  };
});
