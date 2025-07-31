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

export interface SendEmailData {
  contactId: string;
  subject: string;
  message: string;
}

export interface EmailRecord {
  id: number;
  subject: string;
  message: string;
  status: 'sent' | 'bounced' | 'delivered';
  sentAt: string;
  openedAt: string | null;
  bouncedAt: string | null;
}

export interface SendEmailResponse {
  success: boolean;
  emailId: number;
  messageId: string;
}

class EmailAPI {
  async send(data: SendEmailData): Promise<SendEmailResponse> {
    const response = await api.post('/emails/send', data);
    return response.data;
  }

  async getHistory(contactId: string): Promise<EmailRecord[]> {
    const response = await api.get(`/emails/contact/${contactId}`);
    return response.data;
  }
}

export const emailAPI = new EmailAPI();