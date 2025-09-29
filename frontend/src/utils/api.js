import axios from 'axios';

const baseURL = process.env.REACT_APP_API_URL || '';

const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.message && error.message.toLowerCase().includes('network error')) {
      error.normalizedMessage = 'Sunucuya bağlanılamadı. Backend çalışıyor mu?';
    }
    return Promise.reject(error);
  }
);

export default api;
