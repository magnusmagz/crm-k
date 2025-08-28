# Round-Robin System - Architecture Decision Required

## Current CRM Architecture
- **Single-tenant model**: Each user has their own isolated contacts
- **No contact sharing**: Contacts belong to individual users via `userId`
- **No team concept**: No organization/company structure
- **Personal CRM**: Built for individual use, not teams

## The Round-Robin System Requires
- **Multiple users (loan officers) in same organization**
- **Shared contact pool** that can be assigned
- **Team hierarchy** (admins, loan officers)
- **Cross-user visibility** for assignments

## Option 1: Transform to Multi-Tenant Team CRM
### Required Changes:
```sql
-- Add organization layer
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  created_at TIMESTAMP
);

-- Update users table
ALTER TABLE users ADD organization_id UUID REFERENCES organizations(id);
ALTER TABLE users ADD role VARCHAR(50); -- 'admin', 'loan_officer', 'viewer'

-- Update contacts to be org-level
ALTER TABLE contacts ADD organization_id UUID REFERENCES organizations(id);
ALTER TABLE contacts ADD assigned_to UUID REFERENCES users(id);
-- Remove or make nullable: user_id (current owner)
```

### Impact:
- **BREAKING CHANGE**: Existing single-user contacts need migration
- Requires org creation flow during signup
- Need team invitation system
- All queries need to filter by organization_id
- Permission system needed (who can see what)

## Option 2: Personal CRM with Lead Distribution Feature
### Concept:
- Keep personal CRM as-is
- Add "Lead Pool" feature where users can submit leads to shared pool
- Other users can claim leads from pool
- Once claimed, lead becomes personal contact

### Implementation:
```sql
-- Create shared lead pool
CREATE TABLE lead_pool (
  id UUID PRIMARY KEY,
  submitted_by UUID REFERENCES users(id),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  source VARCHAR(100),
  state VARCHAR(2),
  submitted_at TIMESTAMP,
  claimed_by UUID REFERENCES users(id),
  claimed_at TIMESTAMP,
  status VARCHAR(50) -- 'available', 'claimed'
);

-- Users can opt-in to receive leads
ALTER TABLE users ADD accepts_leads BOOLEAN DEFAULT false;
ALTER TABLE users ADD licensed_states TEXT[];
```

### Workflow:
1. User submits lead to pool
2. Available to other users who accept leads
3. Users can browse and claim leads
4. Claimed lead gets copied to their contacts

## Option 3: Demo/Simulation Mode
### Concept:
- Round-robin pages work in "demo mode"
- Use mock data to show how it would work
- No actual database integration
- Pure frontend demonstration

### Implementation:
- Keep HTML files as standalone demo
- Add "Demo Mode" banner
- Use localStorage for state
- No backend changes needed

## Option 4: Simple Assignment Tracker
### Concept:
- Don't change contact ownership model
- Just track "who should contact whom"
- Assignment is a suggestion, not ownership

### Implementation:
```sql
CREATE TABLE assignment_suggestions (
  id UUID PRIMARY KEY,
  contact_id UUID REFERENCES contacts(id),
  suggested_for UUID REFERENCES users(id),
  suggested_by UUID REFERENCES users(id),
  reason VARCHAR(255),
  created_at TIMESTAMP,
  followed_up BOOLEAN DEFAULT false
);
```

## RECOMMENDATION: Start with Option 3 (Demo Mode)

### Why:
1. **No breaking changes** to existing CRM
2. **Immediate value** - can show the concept
3. **Low risk** - doesn't affect real data
4. **Fast to implement** - this week achievable
5. **Good for testing** market fit before major changes

### Implementation Plan for Demo Mode:

#### Day 1: Setup Demo Environment
```javascript
// Create demo data service
// frontend/src/services/demoData.js
export const demoOfficers = [
  { id: 1, name: 'Alex Thompson', licensedStates: ['TX', 'OK'], activeLeads: 23 },
  { id: 2, name: 'Jessica Chen', licensedStates: ['CA', 'OR'], activeLeads: 19 },
  // ... more mock data
];

export const demoContacts = generateMockContacts(50);
export const demoAssignments = generateMockAssignments(100);
```

#### Day 2: Create React Demo Pages
```javascript
// frontend/src/pages/RoundRobinDemo/
- DemoDashboard.tsx
- DemoAssignment.tsx  
- DemoHistory.tsx
- DemoRules.tsx

// Add banner to all demo pages
<div className="bg-yellow-100 border-yellow-400 p-4">
  ⚠️ Demo Mode - Using simulated data
</div>
```

#### Day 3: Add Demo Navigation
```javascript
// Add to main navigation
{ name: 'Round Robin (Demo)', href: '/demo/round-robin' }

// Use localStorage for persistence
const saveDemoState = (state) => {
  localStorage.setItem('roundRobinDemo', JSON.stringify(state));
};
```

## Future Path:
1. **Launch demo mode** to get user feedback
2. **Measure interest** in team features
3. **If validated**, implement Option 1 (full multi-tenant)
4. **If not**, keep as personal CRM

## Questions to Answer First:
1. Is this CRM meant to become team-based?
2. Do current users want/need team features?
3. Is round-robin a core feature or nice-to-have?
4. Would users pay more for team features?

## Quick Win Alternative:
### Lead Import Assignment
Instead of real-time round-robin, add assignment during import:
```javascript
// During CSV import of contacts
// Add "Assign To" column in CSV
// Distribute during import based on rules
// Each user still owns their assigned contacts
```

This works with current architecture!