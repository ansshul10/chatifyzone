import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Ensure cookies are sent with every request
});

// Optional: Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API request error:', error);
    // Optionally handle specific errors (e.g., 401 Unauthorized)
    if (error.response?.status === 401) {
      // Handle unauthorized errors (e.g., redirect to login)
      console.warn('Unauthorized request, please log in again.');
    }
    return Promise.reject(error);
  }
);

export default api;
