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
  
  // Email signature endpoints
  getEmailSignature: () => api.get('/users/email-signature'),
  
  updateEmailSignature: (emailSignature: any) => 
    api.put('/users/email-signature', { emailSignature }),
  
  generateEmailSignature: () => api.post('/users/email-signature/generate'),
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

// Stages API
export const stagesAPI = {
  getAll: () => api.get('/stages'),
  
  create: (data: { name: string; color?: string; order?: number }) => api.post('/stages', data),
  
  update: (id: string, data: any) => api.put(`/stages/${id}`, data),
  
  delete: (id: string) => api.delete(`/stages/${id}`),
  
  reorder: (stages: { id: string; order: number }[]) => api.put('/stages/reorder', { stages }),
  
  initialize: () => api.post('/stages/initialize'),
};

// Deals API
export const dealsAPI = {
  getAll: (params?: { 
    search?: string; 
    stageId?: string; 
    status?: string; 
    contactId?: string;
    sortBy?: string; 
    sortOrder?: string; 
    limit?: number; 
    offset?: number 
  }) => api.get('/deals', { params }),
  
  getById: (id: string) => api.get(`/deals/${id}`),
  
  create: (data: {
    name: string;
    value?: number;
    stageId: string;
    contactId?: string;
    notes?: string;
    expectedCloseDate?: string;
  }) => api.post('/deals', data),
  
  update: (id: string, data: any) => api.put(`/deals/${id}`, data),
  
  updateStage: (id: string, stageId: string) => api.patch(`/deals/${id}/stage`, { stageId }),
  
  delete: (id: string) => api.delete(`/deals/${id}`),
};

// Deal Custom Fields API
export const dealCustomFieldsAPI = {
  getAll: () => api.get('/deal-custom-fields'),
  create: (data: any) => api.post('/deal-custom-fields', data),
  update: (id: string, data: any) => api.put(`/deal-custom-fields/${id}`, data),
  delete: (id: string) => api.delete(`/deal-custom-fields/${id}`),
  reorder: (fieldIds: string[]) => api.post('/deal-custom-fields/reorder', { fieldIds })
};

// Automations API
export const automationsAPI = {
  getAll: () => api.get('/automations'),
  
  getById: (id: string) => api.get(`/automations/${id}`),
  
  create: (data: {
    name: string;
    description?: string;
    trigger: any;
    conditions?: any[];
    actions: any[];
  }) => api.post('/automations', data),
  
  update: (id: string, data: any) => api.put(`/automations/${id}`, data),
  
  toggle: (id: string) => api.patch(`/automations/${id}/toggle`),
  
  delete: (id: string) => api.delete(`/automations/${id}`),
  
  getLogs: (id: string, params?: { limit?: number; offset?: number }) => 
    api.get(`/automations/${id}/logs`, { params }),
  
  test: (id: string, testData?: any) => api.post(`/automations/${id}/test`, { testData }),
  
  getEnrollments: (id: string) => api.get(`/automations/${id}/enrollments`),
  
  previewEnrollment: (id: string) => api.get(`/automations/${id}/preview-enrollment`),
  
  enroll: (id: string, entityType: 'contact' | 'deal', entityIds: string[]) => 
    api.post(`/automations/${id}/enroll`, { entityType, entityIds }),
  
  unenroll: (id: string, entityType: 'contact' | 'deal', entityId: string) => 
    api.post(`/automations/${id}/unenroll`, { entityType, entityId }),
  
  getFields: (entityType: 'contact' | 'deal') => 
    api.get(`/automations/fields/${entityType}`),
  
  getEntityDebugInfo: (entityType: 'contact' | 'deal', entityId: string) =>
    api.get(`/automations/debug/entity/${entityType}/${entityId}`),
  
  processEnrollment: (enrollmentId: string) =>
    api.post(`/automations/enrollment/${enrollmentId}/process`),

  // Multi-step automation endpoints
  createMultiStep: (data: any) => api.post('/automations/multi-step', data),
  
  updateMultiStep: (id: string, data: any) => api.put(`/automations/${id}/multi-step`, data),
  
  getWithSteps: (id: string) => api.get(`/automations/${id}/with-steps`),
  
  validateWorkflow: (id: string) => api.post(`/automations/${id}/validate`),
};

// Email Analytics API
export const analyticsAPI = {
  getOverview: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/analytics/overview', { params }),
  
  getContactAnalytics: (contactId: string) =>
    api.get(`/analytics/contact/${contactId}`),
  
  getCampaignPerformance: (period: '24h' | '7d' | '30d' | '90d' = '7d') =>
    api.get('/analytics/campaign-performance', { params: { period } }),
  
  getLinkAnalytics: (limit: number = 20) =>
    api.get('/analytics/links', { params: { limit } }),
};

export default api;