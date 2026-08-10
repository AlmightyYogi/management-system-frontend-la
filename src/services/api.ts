import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem('token') ||
      (() => {
        try {
          const stored = localStorage.getItem('auth-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            return parsed?.state?.token ?? null;
          }
        } catch {
          return null;
        }
        return null;
      })();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;

    if (status === 401 && url !== "/login") {
      localStorage.removeItem("token");
      localStorage.removeItem("auth-storage");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;