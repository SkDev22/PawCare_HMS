import { create } from 'zustand';
import type { AuthUser } from '@pawcare/shared';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  // True until the initial /auth/refresh bootstrap (using the HttpOnly
  // refresh cookie) has resolved — route guards must wait for this before
  // deciding whether to redirect to /login.
  isBootstrapping: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  setAccessToken: (token: string) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  clearAuth: () => void;
  finishBootstrap: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isBootstrapping: true,

  setAuth: (user, accessToken) => set({ user, accessToken }),

  setAccessToken: (accessToken) => set({ accessToken }),

  updateUser: (patch) => set((state) => (state.user ? { user: { ...state.user, ...patch } } : state)),

  clearAuth: () => set({ user: null, accessToken: null }),

  finishBootstrap: () => set({ isBootstrapping: false }),

  isAuthenticated: () => get().accessToken !== null,
}));
