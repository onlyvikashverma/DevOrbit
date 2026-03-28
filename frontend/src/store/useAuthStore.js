import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('devorbit_token') || null,
  setAuth: (user, token) => {
    localStorage.setItem('devorbit_token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('devorbit_token');
    set({ user: null, token: null });
  }
}));
