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
  company?: string;
  position?: string;
  tags: string[];
  notes?: string;
  customFields: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  deals?: Deal[];
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

export interface Stage {
  id: string;
  userId: string;
  name: string;
  order: number;
  color: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  dealCount?: number;
  totalValue?: number;
  deals?: Deal[];
}

export interface Deal {
  id: string;
  userId: string;
  contactId?: string;
  stageId: string;
  name: string;
  value: number;
  status: 'open' | 'won' | 'lost';
  notes?: string;
  closedAt?: Date;
  expectedCloseDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  Contact?: Contact;
  Stage?: Stage;
}

export interface AutomationTrigger {
  type: 'contact_created' | 'contact_updated' | 'deal_created' | 'deal_updated' | 'deal_stage_changed';
  config?: any;
}

export interface AutomationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty' | 'greater_than' | 'less_than' | 'has_tag' | 'not_has_tag';
  value: any;
  logic?: 'AND' | 'OR';
}

export interface AutomationAction {
  type: 'update_contact_field' | 'add_contact_tag' | 'update_deal_field' | 'move_deal_to_stage';
  config: any;
}

export interface Automation {
  id: string;
  userId: string;
  name: string;
  description?: string;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  isActive: boolean;
  executionCount: number;
  lastExecutedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  totalExecutions?: number;
  successfulExecutions?: number;
}

export interface AutomationLog {
  id: string;
  automationId: string;
  userId: string;
  triggerType: string;
  triggerData: any;
  conditionsMet: boolean;
  conditionsEvaluated?: any[];
  actionsExecuted?: any[];
  status: 'success' | 'failed' | 'skipped';
  error?: string;
  executedAt: Date;
}

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}