# Follow-Up Reminders - 1 Day Implementation Scope

## MVP Features (Essential Only)

### Core Functionality
- ✅ Basic reminder creation from contact/deal pages
- ✅ Simple date/time scheduling (no recurrence)
- ✅ In-app notifications only (no email/SMS)
- ✅ Mark complete/incomplete
- ✅ Basic reminder list view

### Simplified Database Schema

```sql
-- Single table approach for speed
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  title VARCHAR(255) NOT NULL,
  description TEXT,
  remind_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Related entity (simplified)
  entity_type VARCHAR(20), -- 'contact' or 'deal'
  entity_id UUID,
  entity_name VARCHAR(255), -- Denormalized for speed

  -- Status
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reminders_user_pending ON reminders(user_id, remind_at) WHERE is_completed = FALSE;
```

### Minimal API Endpoints

```
GET    /api/reminders           # List user's pending reminders
POST   /api/reminders           # Create reminder
PUT    /api/reminders/:id       # Mark complete/incomplete
DELETE /api/reminders/:id       # Delete reminder
GET    /api/reminders/check     # Check for due reminders (polling)
```

### Essential Frontend Components

1. **QuickReminderModal** - Simple popup form
2. **ReminderButton** - "Set Reminder" button on contact/deal cards
3. **RemindersList** - Basic list in dashboard
4. **ReminderNotification** - Simple browser notification

## 1-Day Implementation Timeline

### Hour 1-2: Database & Backend Setup
```bash
# Create migration
npx sequelize migration:generate --name create-reminders-table

# Add to migration file (simplified schema above)
# Run migration
npx sequelize db:migrate
```

Create basic model:
```javascript
// models/Reminder.js - Minimal version
module.exports = (sequelize, DataTypes) => {
  const Reminder = sequelize.define('Reminder', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    remindAt: { type: DataTypes.DATE, allowNull: false },
    entityType: DataTypes.STRING,
    entityId: DataTypes.UUID,
    entityName: DataTypes.STRING,
    isCompleted: { type: DataTypes.BOOLEAN, defaultValue: false },
    completedAt: DataTypes.DATE
  });
  return Reminder;
};
```

### Hour 3-4: API Routes
```javascript
// routes/reminders.js - Minimal CRUD
const express = require('express');
const { Reminder } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Get user's pending reminders
router.get('/', authMiddleware, async (req, res) => {
  const reminders = await Reminder.findAll({
    where: { userId: req.user.id, isCompleted: false },
    order: [['remindAt', 'ASC']]
  });
  res.json({ reminders });
});

// Create reminder
router.post('/', authMiddleware, async (req, res) => {
  const reminder = await Reminder.create({
    ...req.body,
    userId: req.user.id
  });
  res.json({ reminder });
});

// Toggle complete
router.put('/:id', authMiddleware, async (req, res) => {
  const reminder = await Reminder.findOne({
    where: { id: req.params.id, userId: req.user.id }
  });

  await reminder.update({
    isCompleted: !reminder.isCompleted,
    completedAt: reminder.isCompleted ? null : new Date()
  });

  res.json({ reminder });
});

// Delete reminder
router.delete('/:id', authMiddleware, async (req, res) => {
  await Reminder.destroy({
    where: { id: req.params.id, userId: req.user.id }
  });
  res.json({ success: true });
});

// Check for due reminders
router.get('/check', authMiddleware, async (req, res) => {
  const now = new Date();
  const reminders = await Reminder.findAll({
    where: {
      userId: req.user.id,
      isCompleted: false,
      remindAt: { [Op.lte]: now }
    }
  });
  res.json({ reminders });
});

module.exports = router;
```

### Hour 5-6: Frontend Components

#### QuickReminderModal Component
```typescript
// components/QuickReminderModal.tsx
import React, { useState } from 'react';
import { api } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'contact' | 'deal';
  entityId: string;
  entityName: string;
}

export const QuickReminderModal: React.FC<Props> = ({
  isOpen, onClose, entityType, entityId, entityName
}) => {
  const [title, setTitle] = useState(`Follow up with ${entityName}`);
  const [remindAt, setRemindAt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/reminders', {
        title,
        remindAt,
        entityType,
        entityId,
        entityName
      });
      onClose();
    } catch (error) {
      console.error('Failed to create reminder:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96">
        <h3 className="text-lg font-semibold mb-4">Set Reminder</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Remind me at</label>
            <input
              type="datetime-local"
              value={remindAt}
              onChange={(e) => setRemindAt(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              {loading ? 'Creating...' : 'Create Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

#### Reminder Button
```typescript
// components/ReminderButton.tsx
import React, { useState } from 'react';
import { QuickReminderModal } from './QuickReminderModal';

interface Props {
  entityType: 'contact' | 'deal';
  entityId: string;
  entityName: string;
}

export const ReminderButton: React.FC<Props> = ({ entityType, entityId, entityName }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-sm text-blue-600 hover:text-blue-800"
      >
        📅 Set Reminder
      </button>
      <QuickReminderModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        entityType={entityType}
        entityId={entityId}
        entityName={entityName}
      />
    </>
  );
};
```

### Hour 7: Add to Existing Pages

Add reminder button to ContactCard and contact detail pages:
```typescript
// In ContactCard.tsx, add:
import { ReminderButton } from './ReminderButton';

// Add this line in the contact card actions:
<ReminderButton
  entityType="contact"
  entityId={contact.id}
  entityName={`${contact.firstName} ${contact.lastName}`}
/>
```

### Hour 8: Simple Reminders List & Notifications

#### Basic Reminders Page
```typescript
// pages/Reminders.tsx
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export const Reminders: React.FC = () => {
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    fetchReminders();

    // Simple polling for due reminders
    const interval = setInterval(checkDueReminders, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  const fetchReminders = async () => {
    try {
      const response = await api.get('/reminders');
      setReminders(response.data.reminders);
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    }
  };

  const checkDueReminders = async () => {
    try {
      const response = await api.get('/reminders/check');
      const dueReminders = response.data.reminders;

      dueReminders.forEach(reminder => {
        if (Notification.permission === 'granted') {
          new Notification(reminder.title, {
            body: `Reminder for ${reminder.entityName}`,
            icon: '/favicon.ico'
          });
        }
      });
    } catch (error) {
      console.error('Failed to check reminders:', error);
    }
  };

  const toggleComplete = async (id: string) => {
    try {
      await api.put(`/reminders/${id}`);
      fetchReminders();
    } catch (error) {
      console.error('Failed to update reminder:', error);
    }
  };

  // Request notification permission on load
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Reminders</h1>
      <div className="space-y-3">
        {reminders.map((reminder: any) => (
          <div key={reminder.id} className="border p-4 rounded flex items-center justify-between">
            <div>
              <h3 className="font-medium">{reminder.title}</h3>
              <p className="text-sm text-gray-600">
                {new Date(reminder.remindAt).toLocaleString()} • {reminder.entityName}
              </p>
            </div>
            <button
              onClick={() => toggleComplete(reminder.id)}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm"
            >
              Complete
            </button>
          </div>
        ))}
        {reminders.length === 0 && (
          <p className="text-gray-500">No pending reminders</p>
        )}
      </div>
    </div>
  );
};
```

## Quick Integration Steps

1. **Add route to server.js**:
```javascript
app.use('/api/reminders', require('./routes/reminders'));
```

2. **Add to navigation** (if desired):
```typescript
// Add to main navigation
{ name: 'Reminders', href: '/reminders', icon: BellIcon }
```

3. **Add API helper**:
```typescript
// In services/api.ts, add:
export const remindersAPI = {
  getAll: () => api.get('/reminders'),
  create: (data: any) => api.post('/reminders', data),
  update: (id: string) => api.put(`/reminders/${id}`),
  delete: (id: string) => api.delete(`/reminders/${id}`),
  checkDue: () => api.get('/reminders/check')
};
```

## Testing Checklist (15 minutes)

- [ ] Create reminder from contact page
- [ ] View reminders list
- [ ] Mark reminder complete
- [ ] Browser notification appears for due reminder
- [ ] Delete reminder works

## What's NOT Included (For Future)
- Email notifications
- Recurring reminders
- Advanced filtering
- Bulk operations
- Templates
- Calendar view
- Mobile optimization

This 1-day scope gives you a functional reminder system that users can immediately start using, with the ability to expand features later!