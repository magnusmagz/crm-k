# CRM Automations Feature Scope

## Overview
Build a flexible automation system that allows users to create "When X happens, then do Y" rules to automate repetitive tasks and ensure consistent processes across their CRM.

## Core Concept
Automations consist of three parts:
1. **Trigger** - The event that starts the automation
2. **Conditions** (optional) - Filters to determine if the automation should run
3. **Actions** - What happens when the automation runs

## Phase 1: MVP Triggers

### Contact Triggers
1. **Contact Created**
   - Fires when a new contact is added to the system
   - Available data: All contact fields

2. **Contact Updated**
   - Fires when any contact field is modified
   - Available data: All contact fields + changed fields list

### Deal Triggers
3. **Deal Created**
   - Fires when a new deal is created
   - Available data: All deal fields + associated contact

4. **Deal Updated**
   - Fires when any deal field is modified
   - Available data: All deal fields + changed fields list

5. **Deal Stage Changed**
   - Fires specifically when a deal moves between pipeline stages
   - Available data: Previous stage, new stage, all deal fields

## Phase 1: MVP Actions

### Contact Actions
1. **Update Contact Field**
   - Set or update any contact field
   - Add/remove tags
   - Update custom fields

2. **Add Tag to Contact**
   - Add one or more tags to the contact
   - Useful for segmentation and organization

### Deal Actions
3. **Update Deal Field**
   - Change deal value, expected close date, etc.
   - Update deal status
   - Modify custom fields

4. **Move Deal to Stage**
   - Automatically progress deals through the pipeline
   - Useful for standardizing sales process

### Utility Actions
5. **Create Task** (Placeholder for future)
   - Create a follow-up task assigned to the user
   - Set due date and priority

6. **Add to List** (Placeholder for future)
   - Add contact/deal to a predefined list
   - Useful for marketing campaigns or follow-up sequences

## Conditions System

### Condition Types
1. **Field Conditions**
   - Equals / Not equals
   - Contains / Does not contain
   - Is empty / Is not empty
   - Greater than / Less than (for numbers/dates)

2. **Tag Conditions**
   - Has tag / Does not have tag
   - Has any of tags / Has all of tags

3. **Stage Conditions** (for deals)
   - Moving from specific stage
   - Moving to specific stage
   - Has been in stage for X days

### Condition Logic
- Support AND/OR logic between conditions
- Group conditions for complex rules
- Example: "When deal stage changes to 'Closed Won' AND deal value is greater than $10,000"

## User Interface

### Automation Builder
1. **Visual Rule Builder**
   - Step-by-step wizard interface
   - Dropdown selectors for triggers and actions
   - Dynamic form fields based on selections

2. **Automation List View**
   - See all active automations
   - Enable/disable automations
   - View execution history
   - Edit existing automations

3. **Testing Interface**
   - Test automation with sample data
   - Preview what will happen before activating
   - Dry run mode for safety

## Technical Implementation

### Data Models

```javascript
Automation {
  id: UUID
  userId: UUID
  name: string
  description: string
  trigger: {
    type: enum ['contact_created', 'contact_updated', 'deal_created', 'deal_updated', 'deal_stage_changed']
    config: JSON // Trigger-specific configuration
  }
  conditions: [{
    type: string
    field: string
    operator: string
    value: any
    logic: 'AND' | 'OR'
  }]
  actions: [{
    type: string
    config: JSON // Action-specific configuration
  }]
  isActive: boolean
  executionCount: number
  lastExecutedAt: datetime
  createdAt: datetime
  updatedAt: datetime
}

AutomationLog {
  id: UUID
  automationId: UUID
  triggerType: string
  triggerData: JSON
  conditionsMet: boolean
  actionsExecuted: JSON
  status: enum ['success', 'failed', 'skipped']
  error: string
  executedAt: datetime
}
```

### Architecture

1. **Event System**
   - Emit events when triggers occur
   - Queue-based processing for reliability
   - Async execution to not block main operations

2. **Condition Evaluator**
   - Parse and evaluate complex conditions
   - Support for different data types
   - Efficient evaluation engine

3. **Action Executor**
   - Modular action system
   - Rollback capability for failed actions
   - Audit trail for all executions

## Example Automations

### 1. New Lead Qualification
**Trigger**: Contact Created
**Conditions**: Email domain is from Fortune 500 company
**Actions**: 
- Add tag "High Value Lead"
- Create deal with $50k value in "Qualified" stage

### 2. Deal Win Celebration
**Trigger**: Deal Stage Changed
**Conditions**: New stage is "Closed Won"
**Actions**:
- Update contact tag to "Customer"
- Update deal status to "won"

### 3. Pipeline Velocity
**Trigger**: Deal Updated
**Conditions**: Deal has been in "Proposal" stage for > 7 days
**Actions**:
- Add tag "Needs Follow-up" to deal
- Update deal field "Priority" to "High"

### 4. Contact Enrichment
**Trigger**: Contact Created
**Conditions**: Company field is not empty
**Actions**:
- Add tag based on company size
- Set custom field for industry vertical

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- Event emission system
- Basic automation engine
- Database models and API

### Phase 2: Basic Automations (Week 2)
- Contact created/updated triggers
- Update field actions
- Simple conditions (equals, contains)

### Phase 3: Advanced Features (Week 3)
- Deal triggers and actions
- Complex conditions with AND/OR
- Automation management UI

### Phase 4: Polish & Testing (Week 4)
- Execution history and logs
- Error handling and recovery
- Performance optimization

## Success Metrics

1. **Automation Adoption**
   - % of users creating at least 1 automation
   - Average automations per user
   - Most common automation types

2. **Execution Metrics**
   - Automations executed per day
   - Success rate vs failure rate
   - Average execution time

3. **Business Impact**
   - Time saved per user
   - Reduction in manual tasks
   - Improvement in data consistency

## Future Enhancements

1. **Advanced Triggers**
   - Time-based triggers (daily, weekly)
   - Webhook triggers from external systems
   - Bulk operation triggers

2. **Advanced Actions**
   - Send email/SMS (when available)
   - Call external APIs
   - Create calendar events
   - Generate documents

3. **Advanced Features**
   - Automation templates library
   - Conditional branching (if/then/else)
   - Loops and iterations
   - Variables and data transformation

## Security Considerations

1. **Automation Limits**
   - Max executions per hour/day
   - Prevent infinite loops
   - Resource usage caps

2. **Data Access**
   - Automations only access user's own data
   - Audit trail for all changes
   - Ability to undo automation actions

3. **Testing & Validation**
   - Sandbox mode for testing
   - Validation before saving
   - Dry run capabilities

## User Benefits

1. **Time Savings**
   - Eliminate repetitive manual tasks
   - Consistent process execution
   - Focus on high-value activities

2. **Data Quality**
   - Automatic data enrichment
   - Consistent tagging and categorization
   - Reduced human error

3. **Sales Process**
   - Standardize pipeline movement
   - Automatic lead qualification
   - Timely follow-up reminders

This automation system will transform the CRM from a passive data store into an active sales assistant that helps users work more efficiently and close more deals.