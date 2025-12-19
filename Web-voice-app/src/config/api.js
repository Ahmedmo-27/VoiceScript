/**
 * API Configuration
 * Centralized configuration for all API endpoints
 */

const API_CONFIG = {
  BACKEND_URL: import.meta.env.VITE_BACKEND_URL || "http://localhost:5001",
  MICROPHONE_SERVICE_URL: import.meta.env.VITE_MICROPHONE_SERVICE_URL || "https://voicescript-python-2389d92b9afa.herokuapp.com",
  FILE_UPLOAD_SERVICE_URL: import.meta.env.VITE_FILE_UPLOAD_SERVICE_URL || "https://voicescript-python-2389d92b9afa.herokuapp.com/api",
};

export default API_CONFIG;

