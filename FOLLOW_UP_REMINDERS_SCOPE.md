# Follow-Up Reminders System - Scope Document

## Overview
Add a comprehensive follow-up reminder system to the CRM that allows users to set, manage, and receive notifications for various types of follow-up activities with contacts and deals.

## Core Features

### 1. Reminder Creation
- **Quick Reminder**: Set follow-up reminder directly from contact/deal cards
- **Advanced Reminder**: Detailed reminder creation with custom options
- **Bulk Reminders**: Set reminders for multiple contacts/deals at once
- **Template Reminders**: Pre-defined reminder templates for common scenarios

### 2. Reminder Types
- **Contact Follow-ups**: General contact touch-base reminders
- **Deal Follow-ups**: Sales pipeline advancement reminders
- **Meeting Follow-ups**: Post-meeting action item reminders
- **Email Follow-ups**: Email response follow-up reminders
- **Custom Follow-ups**: User-defined reminder types

### 3. Reminder Scheduling
- **Date & Time**: Specific date and time scheduling
- **Relative Scheduling**: "In 3 days", "Next week", "In 2 hours"
- **Recurring Reminders**: Daily, weekly, monthly patterns
- **Business Hours**: Respect user's working hours
- **Timezone Support**: Handle multiple timezones for global teams

### 4. Notification Channels
- **In-App Notifications**: Browser notifications and dashboard alerts
- **Email Notifications**: Configurable email reminders
- **SMS Notifications** (future): Text message alerts
- **Slack Integration** (future): Team channel notifications

### 5. Reminder Management
- **Dashboard View**: Central reminder management interface
- **Calendar View**: Visual calendar layout of all reminders
- **List View**: Sortable/filterable list of reminders
- **Snooze Function**: Postpone reminders by predefined intervals
- **Mark Complete**: Complete reminders and track completion

## Technical Implementation

### Database Schema

#### `reminders` Table
```sql
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Reminder Content
  title VARCHAR(255) NOT NULL,
  description TEXT,
  reminder_type VARCHAR(50) NOT NULL, -- 'contact', 'deal', 'meeting', 'email', 'custom'
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'

  -- Related Entities
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,

  -- Scheduling
  remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Status & Completion
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'snoozed', 'cancelled'
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES users(id),

  -- Recurrence
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern JSONB, -- {type: 'daily|weekly|monthly', interval: 1, end_date: '...'}
  parent_reminder_id UUID REFERENCES reminders(id),

  -- Notifications
  notification_channels JSONB DEFAULT '["in_app"]', -- ['in_app', 'email', 'sms']
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMP WITH TIME ZONE,

  -- Snooze
  snooze_count INTEGER DEFAULT 0,
  last_snoozed_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT valid_reminder_type CHECK (reminder_type IN ('contact', 'deal', 'meeting', 'email', 'custom')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'snoozed', 'cancelled'))
);

-- Indexes
CREATE INDEX idx_reminders_user_remind_at ON reminders(user_id, remind_at);
CREATE INDEX idx_reminders_status ON reminders(status);
CREATE INDEX idx_reminders_contact ON reminders(contact_id);
CREATE INDEX idx_reminders_deal ON reminders(deal_id);
CREATE INDEX idx_reminders_pending_notifications ON reminders(status, remind_at) WHERE notification_sent = FALSE;
```

#### `reminder_templates` Table
```sql
CREATE TABLE reminder_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  description TEXT,
  reminder_type VARCHAR(50) NOT NULL,
  title_template VARCHAR(255) NOT NULL,
  description_template TEXT,
  default_delay_minutes INTEGER DEFAULT 1440, -- 24 hours
  default_priority VARCHAR(20) DEFAULT 'medium',
  is_public BOOLEAN DEFAULT FALSE, -- Available to all org users

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### API Endpoints

#### Reminder CRUD Operations
```
GET    /api/reminders                 # List user's reminders with filtering
POST   /api/reminders                 # Create new reminder
GET    /api/reminders/:id             # Get specific reminder
PUT    /api/reminders/:id             # Update reminder
DELETE /api/reminders/:id             # Delete reminder

POST   /api/reminders/:id/complete    # Mark reminder as completed
POST   /api/reminders/:id/snooze      # Snooze reminder
POST   /api/reminders/bulk-create     # Create multiple reminders
POST   /api/reminders/bulk-update     # Update multiple reminders
```

#### Template Operations
```
GET    /api/reminder-templates        # List available templates
POST   /api/reminder-templates        # Create template
PUT    /api/reminder-templates/:id    # Update template
DELETE /api/reminder-templates/:id    # Delete template
```

#### Dashboard & Analytics
```
GET    /api/reminders/dashboard       # Dashboard summary data
GET    /api/reminders/calendar        # Calendar view data
GET    /api/reminders/overdue         # Get overdue reminders
GET    /api/reminders/upcoming        # Get upcoming reminders
```

### Frontend Components

#### Core Components
- **ReminderForm**: Create/edit reminder form
- **ReminderCard**: Individual reminder display card
- **ReminderList**: List view of reminders
- **ReminderCalendar**: Calendar view component
- **ReminderDashboard**: Main reminder management interface
- **QuickReminderModal**: Fast reminder creation modal
- **ReminderNotification**: In-app notification component

#### Integration Components
- **ContactReminderWidget**: Reminder section in contact detail
- **DealReminderWidget**: Reminder section in deal detail
- **ReminderDropdown**: Quick action dropdown from entity cards
- **BulkReminderModal**: Bulk reminder creation interface

### Background Services

#### Notification Service
```javascript
// services/reminderNotificationService.js
class ReminderNotificationService {
  async checkPendingReminders()
  async sendNotification(reminder, channels)
  async processRecurringReminders()
  async cleanupCompletedReminders()
}
```

#### Scheduling Service
```javascript
// services/reminderScheduler.js
class ReminderScheduler {
  async scheduleReminder(reminder)
  async rescheduleReminder(reminderId, newTime)
  async cancelReminder(reminderId)
  async createRecurringInstances(parentReminder)
}
```

## User Experience Flow

### 1. Quick Reminder Creation
1. User clicks "Set Reminder" button on contact/deal card
2. Quick modal appears with:
   - Reminder title (auto-populated)
   - Date/time picker with smart defaults
   - Quick duration buttons (1 hour, 1 day, 1 week)
   - Optional notes field
3. User sets time and clicks "Create Reminder"
4. Confirmation toast appears
5. Reminder appears in user's reminder list

### 2. Advanced Reminder Creation
1. User navigates to Reminders section
2. Clicks "New Reminder" button
3. Full form appears with:
   - Entity selection (contact/deal/custom)
   - Reminder details (title, description, priority)
   - Scheduling options (date, time, recurrence)
   - Notification preferences
   - Template selection option
4. User fills form and submits
5. Redirect to reminder list with new reminder highlighted

### 3. Reminder Notification & Action
1. System sends notification at scheduled time
2. User receives notification via configured channels
3. Notification includes:
   - Reminder title and description
   - Related contact/deal information
   - Quick action buttons (Complete, Snooze, View)
4. User can act directly from notification or navigate to full reminder

### 4. Reminder Management
1. User navigates to Reminders dashboard
2. Views reminders in preferred layout (list/calendar)
3. Can filter by status, type, priority, date range
4. Bulk actions available for multiple reminders
5. Drill down to individual reminders for detailed management

## Configuration & Settings

### User Preferences
- Default reminder duration
- Preferred notification channels
- Working hours for reminder scheduling
- Timezone settings
- Auto-complete reminders when related entity is updated

### Organization Settings
- Shared reminder templates
- Default notification channels
- Reminder retention policy
- Integration settings (Slack, email providers)

## Validation Rules

### Reminder Creation
- `remind_at` must be in the future
- `title` is required and max 255 characters
- `reminder_type` must be valid enum value
- User must have access to referenced contact/deal
- Recurring reminders must have valid pattern

### Notification Rules
- Respect user's notification preferences
- Don't send notifications outside working hours (unless urgent)
- Limit notification frequency for snoozed reminders
- Include unsubscribe option in email notifications

## Security Considerations

### Data Access
- Users can only access their own reminders
- Organization admins can view team reminders (optional setting)
- Proper row-level security on all reminder data

### Notification Security
- Email notifications include secure links with tokens
- No sensitive data in SMS notifications
- Rate limiting on notification endpoints

## Performance Considerations

### Database Optimization
- Efficient indexing for common queries
- Partition reminders table by date if volume is high
- Archive completed reminders older than configurable period

### Background Processing
- Use job queue for notification processing
- Batch notification sending to reduce load
- Implement exponential backoff for failed notifications

## Testing Strategy

### Unit Tests
- Reminder CRUD operations
- Notification service logic
- Scheduling service logic
- Validation rules

### Integration Tests
- End-to-end reminder creation flow
- Notification delivery testing
- Recurring reminder generation
- Cross-entity reminder relationships

### Performance Tests
- Bulk reminder creation
- Notification processing under load
- Database query performance with large datasets

## Timeline Estimate

### Phase 1: Core Functionality (3-4 weeks)
- Database schema and migrations
- Basic CRUD API endpoints
- Simple reminder creation UI
- In-app notifications only

### Phase 2: Enhanced Features (2-3 weeks)
- Email notifications
- Recurring reminders
- Reminder templates
- Calendar view

### Phase 3: Advanced Features (2-3 weeks)
- Bulk operations
- Advanced filtering and search
- Dashboard analytics
- Mobile optimization

### Phase 4: Integrations (1-2 weeks)
- Slack notifications
- SMS notifications (if desired)
- Third-party calendar integration

## Success Metrics

### User Engagement
- Number of reminders created per user per week
- Reminder completion rate
- Time between reminder creation and completion
- User retention after reminder feature launch

### System Performance
- Notification delivery success rate
- Average notification delivery time
- Database query performance metrics
- Background job processing times

## Future Enhancements

### AI-Powered Features
- Smart reminder suggestions based on user behavior
- Optimal timing recommendations
- Auto-categorization of reminder types

### Advanced Integrations
- Calendar app synchronization
- CRM automation triggers
- Third-party task management tools

### Team Collaboration
- Shared team reminders
- Reminder delegation
- Team reminder analytics

This comprehensive follow-up reminder system will significantly enhance user productivity and ensure important tasks don't fall through the cracks, making the CRM a more powerful tool for relationship management and sales process optimization.