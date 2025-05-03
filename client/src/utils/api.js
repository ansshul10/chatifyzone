import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Request interceptor to attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API request error:', error);
    if (error.response?.status === 401) {
      console.warn('Unauthorized request, please log in again.');
      // Optionally trigger logout logic here (see step 3)
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
    console.error('Error checking maintenance status:', error);
    return { maintenanceMode: false }; // Default to false if error occurs
  }
};

export default api;
