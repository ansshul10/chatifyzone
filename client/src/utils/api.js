import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Request interceptor to attach token or anonymous ID
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const anonymousId = localStorage.getItem('anonymousId');

    console.log('[API Interceptor] Headers setup:', { token, anonymousId });

    if (anonymousId) {
      config.headers['x-anonymous-id'] = anonymousId;
      delete config.headers['x-auth-token']; // Ensure no token is sent for anonymous users
      console.log('[API Interceptor] Set x-anonymous-id:', anonymousId);
    } else if (token) {
      config.headers['x-auth-token'] = token;
      delete config.headers['x-anonymous-id']; // Ensure no anonymous ID is sent for registered users
      console.log('[API Interceptor] Set x-auth-token:', token);
    }

    return config;
  },
  (error) => {
    console.error('[API Interceptor] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API Interceptor] Response error:', error);
    if (error.response?.status === 401) {
      console.warn('[API Interceptor] Unauthorized request, please log in again.');
      // Optionally trigger logout logic here (e.g., clear localStorage and redirect)
    }
    return Promise.reject(error);
  }
);

// Check maintenance status
export const checkMaintenanceStatus = async () => {
  try {
    const response = await api.get('/admin/settings/public');
    return response.data;
  } catch (error) {
    console.error('[API] Error checking maintenance status:', error);
    return { maintenanceMode: false }; // Default to false if error occurs
  }
};

export default api;
