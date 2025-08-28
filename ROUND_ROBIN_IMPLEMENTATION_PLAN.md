# Round-Robin Lead Assignment System - Implementation Plan

## Overview
Integration plan to add the round-robin lead assignment system to the existing CRM application, enabling automated and manual lead distribution with full tracking and compliance features.

## Phase 1: Database Schema Extensions

### New Tables Required

#### 1. `assignment_rules`
```sql
CREATE TABLE assignment_rules (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 100,
  conditions JSONB NOT NULL, -- Store rule conditions
  assignment_method ENUM('round_robin', 'weighted', 'availability'),
  require_state_match BOOLEAN DEFAULT true,
  active_hours_start TIME,
  active_hours_end TIME,
  timezone VARCHAR(50),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### 2. `assignments`
```sql
CREATE TABLE assignments (
  id UUID PRIMARY KEY,
  contact_id UUID REFERENCES contacts(id),
  assigned_to UUID REFERENCES users(id),
  assigned_by UUID REFERENCES users(id),
  rule_id UUID REFERENCES assignment_rules(id),
  assignment_method VARCHAR(50), -- 'manual' or 'automatic'
  assigned_at TIMESTAMP NOT NULL,
  first_contact_at TIMESTAMP,
  status ENUM('pending', 'contacted', 'no_answer', 'converted', 'lost'),
  notes TEXT
);
```

#### 3. `assignment_activities`
```sql
CREATE TABLE assignment_activities (
  id UUID PRIMARY KEY,
  assignment_id UUID REFERENCES assignments(id),
  user_id UUID REFERENCES users(id),
  activity_type ENUM('call', 'text', 'email', 'note', 'meeting'),
  outcome VARCHAR(50), -- 'connected', 'no_answer', 'voicemail', etc.
  duration INTEGER, -- in seconds for calls
  notes TEXT,
  created_at TIMESTAMP
);
```

#### 4. `user_licenses`
```sql
CREATE TABLE user_licenses (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  state_code VARCHAR(2) NOT NULL,
  license_number VARCHAR(100),
  expires_at DATE,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, state_code)
);
```

#### 5. `round_robin_queues`
```sql
CREATE TABLE round_robin_queues (
  id UUID PRIMARY KEY,
  rule_id UUID REFERENCES assignment_rules(id),
  user_id UUID REFERENCES users(id),
  last_assigned_at TIMESTAMP,
  assignment_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  weight INTEGER DEFAULT 1, -- For weighted distribution
  UNIQUE(rule_id, user_id)
);
```

### Modifications to Existing Tables

#### Update `contacts` table:
```sql
ALTER TABLE contacts ADD COLUMN assignment_id UUID REFERENCES assignments(id);
ALTER TABLE contacts ADD COLUMN assignment_status VARCHAR(50);
ALTER TABLE contacts ADD COLUMN source VARCHAR(100); -- 'redfin', 'zillow', 'website', etc.
ALTER TABLE contacts ADD COLUMN lead_value DECIMAL(10,2);
ALTER TABLE contacts ADD COLUMN state VARCHAR(2);
ALTER TABLE contacts ADD COLUMN contact_type VARCHAR(50); -- 'lead', 'client', etc.
```

#### Update `users` table:
```sql
ALTER TABLE users ADD COLUMN is_loan_officer BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN max_active_leads INTEGER DEFAULT 50;
ALTER TABLE users ADD COLUMN current_active_leads INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN avatar_color VARCHAR(7) DEFAULT '#6B7280';
```

## Phase 2: Backend API Development

### New API Routes Required

#### `/api/round-robin` - Main Round-Robin Routes
```javascript
// routes/roundRobin.js
GET    /api/round-robin/rules           // List all assignment rules
POST   /api/round-robin/rules           // Create new rule
GET    /api/round-robin/rules/:id       // Get specific rule
PUT    /api/round-robin/rules/:id       // Update rule
DELETE /api/round-robin/rules/:id       // Delete rule
POST   /api/round-robin/rules/:id/toggle // Enable/disable rule
```

#### `/api/assignments` - Assignment Management
```javascript
// routes/assignments.js
GET    /api/assignments                 // List assignments with filters
POST   /api/assignments                 // Create manual assignment
GET    /api/assignments/:id             // Get assignment details
PUT    /api/assignments/:id             // Update assignment status
GET    /api/assignments/unassigned      // Get unassigned contacts
POST   /api/assignments/bulk            // Bulk assign contacts
GET    /api/assignments/history         // Assignment history with pagination
POST   /api/assignments/export          // Export to CSV
```

#### `/api/assignment-activities` - Activity Tracking
```javascript
// routes/assignmentActivities.js
GET    /api/assignment-activities       // List activities with filters
POST   /api/assignment-activities       // Log new activity
GET    /api/assignment-activities/live  // Real-time activity feed
GET    /api/assignment-activities/stats // Performance statistics
```

#### `/api/user-licenses` - License Management
```javascript
// routes/userLicenses.js
GET    /api/users/:id/licenses          // Get user's licenses
POST   /api/users/:id/licenses          // Add license
DELETE /api/users/:id/licenses/:licenseId // Remove license
GET    /api/users/by-state/:state       // Get users licensed in state
```

### Core Services to Implement

#### 1. `AssignmentEngine` Service
```javascript
// services/assignmentEngine.js
class AssignmentEngine {
  async processIncomingLead(contact) {
    // 1. Evaluate all active rules
    // 2. Find matching rule with highest priority
    // 3. Get eligible officers based on state/availability
    // 4. Apply assignment method (round-robin/weighted/availability)
    // 5. Create assignment record
    // 6. Update contact and user records
    // 7. Trigger notifications
  }
  
  async getNextOfficerInRotation(ruleId, state) {
    // Implement round-robin logic
  }
  
  async getOfficerByAvailability(state) {
    // Find officer with fewest active leads
  }
}
```

#### 2. `ActivityTracker` Service
```javascript
// services/activityTracker.js
class ActivityTracker {
  async logActivity(assignmentId, activityData) {
    // 1. Create activity record
    // 2. Update assignment status if needed
    // 3. Calculate response times
    // 4. Update performance metrics
  }
  
  async getRealtimeActivities(filters) {
    // Return live activity feed
  }
  
  async calculateMetrics(userId, dateRange) {
    // Calculate performance metrics
  }
}
```

## Phase 3: Frontend React Components

### New Components to Create

#### 1. Round-Robin Rule Management
```typescript
// components/roundrobin/RuleBuilder.tsx
// components/roundrobin/RuleList.tsx
// components/roundrobin/ConditionBuilder.tsx
// components/roundrobin/OfficerSelector.tsx
```

#### 2. Assignment Interface
```typescript
// components/assignments/AssignmentDashboard.tsx
// components/assignments/UnassignedQueue.tsx
// components/assignments/ManualAssignment.tsx
// components/assignments/BulkAssignment.tsx
```

#### 3. Activity Monitoring
```typescript
// components/activities/ActivityFeed.tsx
// components/activities/ActivityTimeline.tsx
// components/activities/PerformanceMetrics.tsx
// components/activities/OfficerCard.tsx
```

#### 4. Admin Dashboard Updates
```typescript
// components/admin/RoundRobinStats.tsx
// components/admin/AssignmentOverview.tsx
// components/admin/LiveActivityMonitor.tsx
```

### New Pages/Routes
```typescript
// pages/RoundRobinAdmin.tsx - Main admin dashboard
// pages/AssignmentRules.tsx - Rule management
// pages/AssignmentQueue.tsx - Manual assignment interface
// pages/ActivityMonitor.tsx - Live activity tracking
// pages/AssignmentHistory.tsx - Historical reports
```

## Phase 4: Real-time Updates

### WebSocket Implementation
```javascript
// backend/services/websocket.js
io.on('connection', (socket) => {
  // Join rooms based on user role
  socket.on('join:assignments', () => {
    socket.join('assignment-updates');
  });
  
  // Emit real-time updates
  socket.on('assignment:created', (data) => {
    io.to('assignment-updates').emit('new-assignment', data);
  });
  
  socket.on('activity:logged', (data) => {
    io.to('assignment-updates').emit('new-activity', data);
  });
});
```

### Frontend Real-time Hook
```typescript
// hooks/useRealtimeAssignments.ts
export function useRealtimeAssignments() {
  const [activities, setActivities] = useState([]);
  
  useEffect(() => {
    socket.on('new-assignment', (data) => {
      // Update UI with new assignment
    });
    
    socket.on('new-activity', (data) => {
      // Add to activity feed
    });
  }, []);
  
  return { activities };
}
```

## Phase 5: Integration Points

### 1. Contact Creation Hook
```javascript
// Modify existing contact creation to trigger assignment
async function createContact(contactData) {
  const contact = await Contact.create(contactData);
  
  // Trigger round-robin assignment
  if (contact.contactType === 'lead') {
    await assignmentEngine.processIncomingLead(contact);
  }
  
  return contact;
}
```

### 2. Navigation Updates
```javascript
// Add to navigation array in Layout.tsx
const navigation = [
  // ... existing items
  { name: 'Assignments', href: '/assignments' },
  { name: 'Round Robin', href: '/round-robin' },
];
```

### 3. Permissions/Roles
```javascript
// Add new permissions
const PERMISSIONS = {
  // ... existing
  MANAGE_ASSIGNMENTS: 'manage_assignments',
  VIEW_ALL_ASSIGNMENTS: 'view_all_assignments',
  MANAGE_ROUND_ROBIN_RULES: 'manage_round_robin_rules',
};
```

## Phase 6: Testing Requirements

### Unit Tests
- Assignment engine rule evaluation
- Round-robin rotation logic
- State licensing validation
- Activity tracking calculations

### Integration Tests
- Contact creation → assignment flow
- Rule priority evaluation
- Multi-user assignment scenarios
- Real-time update propagation

### E2E Tests
- Complete lead assignment workflow
- Manual override scenarios
- Bulk assignment operations
- Export functionality

## Phase 7: Migration Strategy

### Step 1: Database Setup
```bash
# Create migration files
npm run migrate:create add-round-robin-tables
npm run migrate:create update-contacts-for-assignments
npm run migrate:create add-user-licensing
```

### Step 2: Data Migration
```javascript
// Migrate existing contacts to have assignment fields
// Set default values for source, state, contact_type
// Create initial assignment records for existing contacts
```

### Step 3: Feature Flag Rollout
```javascript
// Use feature flags for gradual rollout
const FEATURES = {
  ROUND_ROBIN_ENABLED: process.env.ENABLE_ROUND_ROBIN === 'true',
};
```

## Phase 8: Performance Considerations

### Caching Strategy
- Cache active rules in Redis
- Cache user license data
- Cache officer availability counts

### Database Indexes
```sql
CREATE INDEX idx_assignments_contact_id ON assignments(contact_id);
CREATE INDEX idx_assignments_assigned_to ON assignments(assigned_to);
CREATE INDEX idx_assignment_activities_assignment_id ON assignment_activities(assignment_id);
CREATE INDEX idx_user_licenses_user_state ON user_licenses(user_id, state_code);
```

### Query Optimization
- Use database views for complex reports
- Implement pagination for all list endpoints
- Use batch operations for bulk assignments

## Estimated Timeline

### Week 1-2: Database & Backend Core
- Set up database schema
- Implement core assignment engine
- Create basic API endpoints

### Week 3-4: Frontend Components
- Build React components
- Implement rule builder UI
- Create assignment interfaces

### Week 5: Real-time & Integration
- Add WebSocket support
- Integrate with existing contact system
- Implement activity tracking

### Week 6: Testing & Polish
- Complete test coverage
- Performance optimization
- Documentation

## Success Metrics

1. **Assignment Speed**: < 1 second from lead creation to assignment
2. **System Uptime**: 99.9% availability
3. **Response Time**: Average first contact < 30 minutes
4. **Fair Distribution**: Variance in assignments < 5% among active officers
5. **User Adoption**: 80% of eligible users actively using system

## Risk Mitigation

1. **Data Loss**: Implement audit logs for all assignments
2. **Unfair Distribution**: Regular rotation validation checks
3. **Performance**: Implement caching and queue systems
4. **Compliance**: Automated state license verification
5. **User Error**: Comprehensive validation and confirmation dialogs

## Documentation Requirements

1. API documentation with Swagger
2. User guide for administrators
3. Training materials for loan officers
4. Technical architecture document
5. Database schema diagram

## Post-Launch Enhancements

1. Mobile app for officers
2. SMS/Email notifications
3. AI-powered lead scoring
4. Predictive assignment optimization
5. Advanced analytics dashboard
6. Integration with third-party lead sources