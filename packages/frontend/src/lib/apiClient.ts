import axios from "axios";
import { logCorrelationId } from "./correlationId";

/**
 * Shared Axios instance for all backend API calls.
 * Base URL defaults to "/api" (proxied by Vite in dev, same origin in prod).
 * Automatically logs correlation IDs from response headers.
 * Attaches Bearer token from localStorage for cross-origin auth.
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  withCredentials: true,
});

// Attach Bearer token from localStorage on every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("session_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const correlationId = response.headers["x-correlation-id"];
    if (correlationId) {
      logCorrelationId(correlationId);
    }
    return response;
  },
  (error) => {
    const correlationId = error.response?.headers?.["x-correlation-id"];
    if (correlationId) {
      logCorrelationId(correlationId);
    }
    return Promise.reject(error);
  },
);

export default apiClient;
