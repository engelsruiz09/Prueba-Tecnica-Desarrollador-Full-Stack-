/**
 * Cliente Axios centralizado.
 *
 * El interceptor de request inyecta automáticamente el token JWT en cada
 * llamada — los hooks y servicios nunca tienen que pensar en el header.
 *
 * El interceptor de response captura 401 globalmente y limpia la sesión,
 * evitando que el usuario quede en un estado inconsistente con un token expirado.
 */
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// ── Request interceptor: inyectar token ────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: manejar 401 globalmente ─────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido — limpiar sesión y redirigir al login
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);