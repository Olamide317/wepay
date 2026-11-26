import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('wepay_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authApi = {
  register: (payload) => axiosClient.post('/auth/register', payload),
  login: (payload) => axiosClient.post('/auth/login', payload),
  getMe: () => axiosClient.get('/auth/me'),
};

export const collectionsApi = {
  create: (payload) => axiosClient.post('/collections', payload),
  getMine: () => axiosClient.get('/collections'),
  getBySlug: (slug) => axiosClient.get(`/collections/${slug}`),
  updateStatus: (slug, status) => axiosClient.patch(`/collections/${slug}/status`, { status }),
};

export default axiosClient;