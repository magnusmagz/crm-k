# Rapid Round-Robin Implementation - THIS WEEK

## Day 1 (Monday) - Database & Core Backend
### Morning (2-3 hours)
1. **Create Essential Database Tables** (Skip complex ones for now)
```javascript
// Create single migration file: 
// backend/migrations/add-round-robin-system.js

- Add to contacts table:
  * assignedTo (UUID) 
  * assignedAt (DATE)
  * source (STRING)
  * state (STRING)
  * contactType (STRING)

- Create assignments table (simplified):
  * id, contactId, userId, assignedAt, status

- Create assignment_rules table (basic):
  * id, name, conditions (JSON), isActive, priority
```

2. **Quick User Model Update**
```javascript
// Just add to User model:
- licensedStates (ARRAY of strings)
- isLoanOfficer (BOOLEAN)
```

### Afternoon (3-4 hours)
3. **Build Minimal AssignmentEngine**
```javascript
// backend/services/assignmentEngine.js
- Simple round-robin logic
- State matching check
- Auto-assign on contact creation
```

4. **Create 3 Essential API Routes**
```javascript
// backend/routes/assignments.js
POST /api/assignments/assign-lead
GET  /api/assignments/unassigned
GET  /api/assignments/history
```

## Day 2 (Tuesday) - Convert HTML to React
### Morning (3-4 hours)
5. **Convert Core Pages to React Components**
```javascript
// frontend/src/pages/RoundRobin/
- RoundRobinDashboard.tsx (from admin-dashboard.html)
- AssignmentQueue.tsx (from contact-assignment.html) 
- AssignmentHistory.tsx (from assignment-history.html)
```

### Afternoon (2-3 hours)
6. **Add Routing & Navigation**
```javascript
// Update App.tsx with new routes
// Add to Layout.tsx navigation menu
```

## Day 3 (Wednesday) - Connect & Test
### Morning (2-3 hours)
7. **Wire Frontend to Backend**
```javascript
// Connect React components to API endpoints
// Add loading states and error handling
```

### Afternoon (2-3 hours)
8. **Test Core Flow**
- Create contact → Auto-assigns
- Manual assignment works
- History displays correctly

## MVP Features Only (Skip for Later)
❌ WebSocket real-time updates → Use polling every 30 seconds
❌ Complex rule builder → Start with simple source-based rules  
❌ Weighted distribution → Round-robin only
❌ Activity tracking details → Basic status only
❌ Performance metrics → Simple count display
❌ CSV export → Later feature
❌ Bulk operations → Single assignment only

## Quick Wins Implementation Order

### 1. Backend Essentials (Day 1)
```bash
# Run these commands:
cd backend
npm run migrate:create add-round-robin-system
# Edit migration file with simple schema
npm run migrate

# Create basic files:
touch services/assignmentEngine.js
touch routes/assignments.js
```

### 2. Frontend Conversion (Day 2)
```bash
cd frontend
mkdir -p src/pages/RoundRobin
# Copy logic from HTML files into React components
# Reuse existing CRM components (cards, buttons, etc.)
```

### 3. Integration (Day 3)
```javascript
// Minimal integration in contacts.js route:
router.post('/contacts', async (req, res) => {
  const contact = await Contact.create(req.body);
  
  // Auto-assign if it's a lead
  if (contact.contactType === 'lead') {
    await assignmentEngine.assignToNextOfficer(contact);
  }
  
  res.json(contact);
});
```

## Simplified Component Structure

### Instead of Complex Rule Builder:
```javascript
// Just use a simple dropdown
<select onChange={handleRuleChange}>
  <option>Assign All Leads</option>
  <option>Redfin Leads Only</option>
  <option>Zillow Leads Only</option>
</select>
```

### Instead of Real-time Activity Feed:
```javascript
// Simple table with refresh button
<button onClick={fetchLatestAssignments}>Refresh</button>
<AssignmentTable data={assignments} />
```

### Instead of Complex Officer Selection:
```javascript
// Simple checkbox list
{users.filter(u => u.isLoanOfficer).map(officer => (
  <label>
    <input type="checkbox" /> {officer.name}
  </label>
))}
```

## Database Schema (Simplified)

```sql
-- Just 2 new tables for MVP:

CREATE TABLE assignments (
  id UUID PRIMARY KEY,
  contact_id UUID REFERENCES contacts(id),
  user_id UUID REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'pending'
);

CREATE TABLE assignment_rules (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  source_filter VARCHAR(100), -- 'redfin', 'zillow', 'all'
  is_active BOOLEAN DEFAULT true
);

-- Modify contacts:
ALTER TABLE contacts ADD assigned_to UUID REFERENCES users(id);
ALTER TABLE contacts ADD source VARCHAR(100);
ALTER TABLE contacts ADD state VARCHAR(2);

-- Modify users:
ALTER TABLE users ADD licensed_states TEXT[]; -- Array of state codes
ALTER TABLE users ADD is_loan_officer BOOLEAN DEFAULT false;
```

## React Component Templates

### Quick Dashboard Component:
```typescript
// src/pages/RoundRobin/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export const RoundRobinDashboard = () => {
  const [stats, setStats] = useState({
    totalAssigned: 0,
    todayAssigned: 0,
    unassigned: 0
  });

  useEffect(() => {
    api.get('/assignments/stats').then(res => setStats(res.data));
  }, []);

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3>Total Assigned</h3>
        <p className="text-3xl">{stats.totalAssigned}</p>
      </div>
      {/* More stat cards */}
    </div>
  );
};
```

### Assignment Queue (Reuse HTML Logic):
```typescript
// Convert the HTML JavaScript directly to React
const [unassignedContacts, setUnassignedContacts] = useState([]);
const [selectedOfficer, setSelectedOfficer] = useState(null);

const handleAssign = async () => {
  await api.post('/assignments/assign-lead', {
    contactId: selectedContact.id,
    userId: selectedOfficer.id
  });
  // Refresh list
};
```

## Testing Checklist (Day 3)
- [ ] Create a contact → Check it auto-assigns
- [ ] Manual assignment page loads
- [ ] Can select officer and assign
- [ ] History page shows assignments
- [ ] Navigation works between pages
- [ ] Basic state filtering works

## Success Criteria for Week 1
✅ Contacts can be assigned automatically
✅ Manual assignment interface works
✅ Can see assignment history
✅ State-based filtering functional
✅ Basic round-robin rotation works

## What We'll Add Next Week
- Real-time updates
- Activity tracking
- Performance metrics
- Rule builder UI
- Bulk operations
- Export features

## Commands to Run Now:

```bash
# Start backend implementation
cd backend
npm run migrate:create add-round-robin-system

# Start frontend setup
cd ../frontend
mkdir -p src/pages/RoundRobin
```

This gets you a WORKING round-robin system by end of week!