import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/axios';

const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      loading: false,

      login: async (email, password) => {
        set({ loading: true });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          set({ token: data.data.token, user: data.data.user, loading: false });
          return data.data;
        } catch (err) {
          set({ loading: false });
          throw err;
        }
      },

      logout: () => {
        set({ token: null, user: null });
      },

      setLoading: (loading) => set({ loading }),

      initAuth: async () => {
        const state = useAuthStore.getState();
        if (!state.token) return;
        set({ loading: true });
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data.data, loading: false });
        } catch {
          set({ token: null, user: null, loading: false });
        }
      },
    }),
    {
      name: 'auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
      getStorage: () => ({
        getItem: (key) => {
          const val = localStorage.getItem(key);
          return val;
        },
        setItem: (key, value) => {
          const parsed = JSON.parse(value);
          if (parsed?.state?.token) {
            localStorage.setItem('auth_token', parsed.state.token);
          } else {
            localStorage.removeItem('auth_token');
          }
          if (parsed?.state?.user) {
            localStorage.setItem('auth_user', JSON.stringify(parsed.state.user));
          } else {
            localStorage.removeItem('auth_user');
          }
          localStorage.setItem(key, value);
        },
        removeItem: (key) => {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          localStorage.removeItem(key);
        },
      }),
    }
  )
);

export default useAuthStore;
