import axios from 'axios';
import { useAuthStore } from '../stores/auth.store';

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // sends the HttpOnly refresh_token cookie
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Queue of callers waiting while a token refresh is in flight
let isRefreshing = false;
let waitQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function drainQueue(token: string | null, err: unknown = null) {
  waitQueue.forEach(({ resolve, reject }) => (token ? resolve(token) : reject(err)));
  waitQueue = [];
}

// Auto-refresh access token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean };

    // A locked-out trial clinic — every authenticated request will keep
    // returning this until the clinic converts, so send the user straight
    // to the trial-expired screen instead of retrying anything.
    if (error.response?.data?.error?.code === 'TRIAL_EXPIRED') {
      if (window.location.pathname !== '/trial-expired') {
        window.location.replace('/trial-expired');
      }
      return Promise.reject(error);
    }

    // The refresh call itself must never trigger another refresh attempt —
    // doing so recurses into the queueing logic below and deadlocks forever.
    // A failed login attempt is also excluded: a wrong password is a genuine
    // 401 from a request that was never authenticated in the first place,
    // not an expired session — silently "refreshing" it just replaces the
    // real "invalid email or password" error with a redirect to /login,
    // wiping the error banner before the user ever sees it.
    if (
      error.response?.status !== 401 ||
      original._retry ||
      original.url?.includes('/auth/refresh') ||
      original.url?.includes('/auth/login')
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        waitQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await api.post<{ accessToken: string }>('/auth/refresh');
      useAuthStore.getState().setAccessToken(data.accessToken);
      drainQueue(data.accessToken);
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch (refreshErr) {
      drainQueue(null, refreshErr);
      useAuthStore.getState().clearAuth();
      window.location.replace('/login');
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  },
);
