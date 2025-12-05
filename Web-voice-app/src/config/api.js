/**
 * API Configuration
 * Centralized configuration for all API endpoints
 */

const API_CONFIG = {
  BACKEND_URL: import.meta.env.VITE_BACKEND_URL || "http://localhost:5001",
  MICROPHONE_SERVICE_URL: import.meta.env.VITE_MICROPHONE_SERVICE_URL || "http://127.0.0.1:5003",
};

export default API_CONFIG;

