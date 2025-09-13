export interface Organization {
  id: string;
  name: string;
  crmName?: string;
  crm_name?: string;
  primaryColor?: string;
  primary_color?: string;
  isActive?: boolean;
  is_active?: boolean;
}

export interface User {
  id: string;
  email: string;
  isVerified: boolean;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  isLoanOfficer?: boolean;
  organizationId?: string;
  organization?: Organization;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StateLicense {
  state: string;
  licenseNumber: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  title?: string;
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
  primaryColor?: string;
  crmName?: string;
  nmlsId?: string;
  stateLicenses?: StateLicense[];
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
  dealStats?: {
    dealCount: number;
    totalValue: number;
    wonDeals: number;
    openDeals: number;
    openValue: number;
  };
  isUnsubscribed?: boolean;
  unsubscribeReason?: string | null;
  // Recruiting fields
  contactType?: 'contact' | 'candidate';
  resumeUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  skills?: string[];
  experienceYears?: number;
  salaryExpectation?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  availability?: string;
  currentEmployer?: string;
  currentRole?: string;
}

export interface CustomField {
  id: string;
  userId: string;
  entityType: 'contact' | 'deal';
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
  pipelineType?: 'sales' | 'recruiting';
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
  customFields?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  Contact?: Contact;
  Stage?: Stage;
}

export interface AutomationTrigger {
  type: 'contact_created' | 'contact_updated' | 'deal_created' | 'deal_updated' | 'deal_stage_changed' |
        'candidate_added' | 'candidate_stage_changed' | 'candidate_hired' | 'candidate_rejected' | 
        'interview_scheduled' | 'position_created' | 'position_closed';
  config?: any;
}

export interface AutomationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty' | 'greater_than' | 'less_than' | 'has_tag' | 'not_has_tag';
  value: any;
  logic?: 'AND' | 'OR';
}

export interface AutomationAction {
  type: 'send_email' | 'update_contact_field' | 'add_contact_tag' | 'update_deal_field' | 'move_deal_to_stage' | 'update_custom_field' |
        'update_candidate_status' | 'schedule_interview' | 'send_offer' | 'update_candidate_rating' |
        'add_candidate_note' | 'move_candidate_to_stage' | 'assign_to_position' | 'send_rejection_email';
  config: any;
}

export interface AutomationStep {
  id?: string;
  automationId?: string;
  stepIndex: number;
  name: string;
  type: 'action' | 'delay' | 'condition' | 'branch';
  config?: any;
  conditions?: AutomationCondition[];
  actions?: AutomationAction[];
  delayConfig?: {
    value: number;
    unit: 'minutes' | 'hours' | 'days';
  };
  branchConfig?: {
    branches: Array<{
      name: string;
      conditions: AutomationCondition[];
    }>;
    defaultBranch?: string;
  };
  nextStepIndex?: number | null;
  branchStepIndices?: { [key: string]: number | null };
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
  isMultiStep: boolean;
  executionCount: number;
  enrolledCount: number;
  activeEnrollments: number;
  completedEnrollments: number;
  lastExecutedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  totalExecutions?: number;
  successfulExecutions?: number;
  steps?: AutomationStep[];
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


export interface AutomationEnrollment {
  id: string;
  automationId: string;
  userId: string;
  entityType: 'contact' | 'deal';
  entityId: string;
  currentStepIndex: number;
  status: 'active' | 'completed' | 'failed' | 'unenrolled';
  enrolledAt: Date;
  completedAt?: Date;
  nextStepAt?: Date;
  metadata: any;
}

export interface EnrollmentSummary {
  total: number;
  active: number;
  completed: number;
  failed: number;
  unenrolled: number;
  recentEnrollments: AutomationEnrollment[];
}

export interface Position {
  id: string;
  userId: string;
  title: string;
  department?: string;
  location?: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  remote: 'onsite' | 'remote' | 'hybrid';
  salaryRange?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  requirements?: string;
  description?: string;
  status: 'open' | 'closed' | 'on-hold';
  customFields?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecruitingPipeline {
  id: string;
  userId: string;
  candidateId: string;
  positionId: string;
  stageId: string;
  status: 'active' | 'hired' | 'passed' | 'withdrawn';
  rating?: number;
  notes?: string;
  interviewDate?: Date;
  offerDetails?: {
    salary?: number;
    startDate?: Date;
    benefits?: string[];
  };
  rejectionReason?: string;
  appliedAt: Date;
  hiredAt?: Date;
  customFields?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  Candidate?: Contact;
  Position?: Position;
  Stage?: Stage;
}

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}