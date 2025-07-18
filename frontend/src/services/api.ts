import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: { email: string; password: string; firstName: string; lastName: string; companyName?: string }) =>
    api.post('/auth/register', data),
  
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  
  logout: () => api.post('/auth/logout'),
  
  getMe: () => api.get('/auth/me'),
  
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
};

// User API
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  
  updateProfile: (data: any) => api.put('/users/profile', data),
  
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/users/change-password', { currentPassword, newPassword }),
  
  deleteAccount: () => api.delete('/users/account'),
};

// Contacts API
export const contactsAPI = {
  getAll: (params?: { search?: string; tags?: string[]; sortBy?: string; sortOrder?: string; limit?: number; offset?: number }) =>
    api.get('/contacts', { params }),
  
  getById: (id: string) => api.get(`/contacts/${id}`),
  
  create: (data: any) => api.post('/contacts', data),
  
  update: (id: string, data: any) => api.put(`/contacts/${id}`, data),
  
  delete: (id: string) => api.delete(`/contacts/${id}`),
  
  bulkDelete: (ids: string[]) => api.post('/contacts/bulk-delete', { ids }),
  
  getTags: () => api.get('/contacts/tags/all'),
};

// Custom Fields API
export const customFieldsAPI = {
  getAll: () => api.get('/custom-fields'),
  
  getById: (id: string) => api.get(`/custom-fields/${id}`),
  
  create: (data: any) => api.post('/custom-fields', data),
  
  update: (id: string, data: any) => api.put(`/custom-fields/${id}`, data),
  
  delete: (id: string) => api.delete(`/custom-fields/${id}`),
  
  reorder: (fields: { id: string }[]) => api.put('/custom-fields/reorder', { fields }),
};

export default api;