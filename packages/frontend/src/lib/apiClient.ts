import axios from "axios";
import { logCorrelationId } from "./correlationId";

/**
 * Shared Axios instance for all backend API calls.
 * Base URL defaults to "/api" (proxied by Vite in dev, same origin in prod).
 * Automatically logs correlation IDs from response headers.
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  withCredentials: true,
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
