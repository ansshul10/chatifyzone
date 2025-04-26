import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Ensure cookies are sent with every request
});

// Response interceptor for error handling and debugging
api.interceptors.response.use(
  (response) => {
    console.log(`API Response [${response.config.method.toUpperCase()} ${response.config.url}]:`, response.status);
    return response;
  },
  (error) => {
    console.error(`API Error [${error.config?.method.toUpperCase()} ${error.config?.url}]:`, error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.warn('Unauthorized request, please log in again.');
    }
    return Promise.reject(error);
  }
);

export default api;
