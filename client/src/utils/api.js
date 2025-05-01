import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API request error:', error);
    if (error.response?.status === 401) {
      console.warn('Unauthorized request, please log in again.');
    }
    return Promise.reject(error);
  }
);

export default api;
