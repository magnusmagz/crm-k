export interface User {
  id: string;
  email: string;
  isVerified: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  website?: string;
  profilePhoto?: string;
  companyLogo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contact {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  tags: string[];
  notes?: string;
  customFields: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomField {
  id: string;
  userId: string;
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'url';
  required: boolean;
  options?: string[];
  validation?: Record<string, any>;
  order: number;
  createdAt: Date;
}

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}