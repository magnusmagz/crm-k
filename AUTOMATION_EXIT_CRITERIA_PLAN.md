# Automation Stop/Exit Criteria Feature Plan

## Overview
This document outlines the implementation plan for adding stop/exit criteria to the CRM automation system. This feature will allow automations to terminate based on specific conditions, goals being met, or manual triggers.

## Current State Analysis

### Existing Infrastructure
- **Enrollment System**: Tracks automation enrollments with statuses (active, completed, failed, unenrolled)
- **Manual Unenrollment**: API endpoint exists for manual unenrollment
- **Multi-step Workflows**: Support for complex automation flows
- **Condition Evaluation**: Basic condition checking for enrollment

### Gap Analysis
- No automated exit conditions
- No goal-based termination
- No conditional branching to exit paths
- No "stop automation" action type
- No UI for configuring exit criteria

## Feature Requirements

### 1. Exit Trigger Types

#### A. Goal-Based Exits
- **Deal Value Goal**: Exit when deal reaches specific value
- **Tag Achievement**: Exit when contact receives specific tag(s)
- **Field Value Match**: Exit when field equals/contains specific value
- **Custom Field Goals**: Exit based on custom field criteria

#### B. Condition-Based Exits
- **Time-Based**: Exit after X days/hours in automation
- **Engagement Metrics**: Exit based on email opens/clicks
- **Activity Count**: Exit after X activities/touches
- **Negative Conditions**: Exit if condition is NOT met

#### C. Action-Based Exits
- **Explicit Stop Action**: "Stop Automation" action type
- **Branch to Exit**: Conditional branches that lead to exit
- **External Trigger**: API call or webhook to stop

#### D. Safety Exits
- **Max Duration**: Prevent automations running indefinitely
- **Error Threshold**: Exit after X consecutive errors
- **Bounce/Unsubscribe**: Auto-exit on email bounce or unsubscribe

### 2. Implementation Architecture

#### Database Schema Changes

```sql
-- Add to automations table
ALTER TABLE automations ADD COLUMN exit_criteria JSONB DEFAULT '{}';
ALTER TABLE automations ADD COLUMN max_duration_days INTEGER;
ALTER TABLE automations ADD COLUMN safety_exit_enabled BOOLEAN DEFAULT true;

-- Add to automation_enrollments table
ALTER TABLE automation_enrollments ADD COLUMN exit_reason VARCHAR(255);
ALTER TABLE automation_enrollments ADD COLUMN exited_at TIMESTAMP;

-- New table for exit conditions
CREATE TABLE automation_exit_conditions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  automation_id UUID REFERENCES automations(id),
  condition_type VARCHAR(50), -- 'goal', 'time', 'condition', 'safety'
  condition_config JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Exit Criteria JSON Structure

```json
{
  "goals": [
    {
      "type": "field_value",
      "field": "dealValue",
      "operator": "greater_than",
      "value": 10000,
      "description": "Exit when deal value exceeds $10,000"
    }
  ],
  "conditions": [
    {
      "type": "time_in_automation",
      "days": 30,
      "description": "Exit after 30 days"
    },
    {
      "type": "tag_applied",
      "tags": ["customer", "closed-won"],
      "match": "any",
      "description": "Exit when contact becomes customer"
    }
  ],
  "safety": {
    "max_duration_days": 90,
    "max_errors": 5,
    "exit_on_unsubscribe": true,
    "exit_on_bounce": true
  }
}
```

### 3. Backend Implementation

#### A. New Action Types
```javascript
// In automationEngineV2.js
case 'stop_automation':
  await this.exitEnrollment(enrollment, 'manual_stop', action.config.reason);
  break;

case 'conditional_exit':
  if (await this.evaluateCondition(action.config.condition, entity)) {
    await this.exitEnrollment(enrollment, 'condition_met', action.config.reason);
  }
  break;
```

#### B. Exit Criteria Evaluator
```javascript
class ExitCriteriaEvaluator {
  async checkExitCriteria(enrollment, automation, entity) {
    // Check goal-based exits
    const goals = await this.evaluateGoals(automation.exitCriteria.goals, entity);
    if (goals.shouldExit) {
      return { shouldExit: true, reason: goals.reason };
    }

    // Check time-based exits
    const timeCheck = await this.evaluateTimeConditions(enrollment, automation);
    if (timeCheck.shouldExit) {
      return { shouldExit: true, reason: timeCheck.reason };
    }

    // Check safety exits
    const safetyCheck = await this.evaluateSafetyConditions(enrollment, automation);
    if (safetyCheck.shouldExit) {
      return { shouldExit: true, reason: safetyCheck.reason };
    }

    return { shouldExit: false };
  }
}
```

#### C. Integration Points
1. **Before Step Execution**: Check exit criteria before each step
2. **After Action Execution**: Check if action triggered exit condition
3. **Scheduled Job**: Daily check for time-based exits
4. **Event Listeners**: Listen for unsubscribe/bounce events

### 4. Frontend Implementation

#### A. Automation Builder UI

##### Exit Criteria Tab
```tsx
<Tabs>
  <Tab label="Triggers" />
  <Tab label="Actions" />
  <Tab label="Exit Criteria" /> {/* New tab */}
</Tabs>
```

##### Exit Criteria Components
1. **GoalBuilder**: Configure goal-based exits
2. **TimeExitConfig**: Set time-based limits
3. **SafetyExitToggle**: Enable/disable safety features
4. **ExitConditionBuilder**: Complex condition builder

#### B. Visual Indicators
- Exit paths in workflow diagram
- Exit criteria badges on automation cards
- Exit reason in enrollment history

### 5. API Endpoints

#### New Endpoints
```
POST   /api/automations/:id/exit-criteria     - Update exit criteria
GET    /api/automations/:id/exit-criteria     - Get exit criteria
POST   /api/automations/:id/test-exit         - Test exit conditions
GET    /api/automations/:id/exit-stats        - Exit statistics
```

#### Modified Endpoints
```
GET    /api/automations/:id/enrollments       - Include exit_reason
POST   /api/automations/:id/unenroll          - Support reason parameter
```

### 6. Use Cases & Examples

#### Use Case 1: Sales Qualification
- **Goal**: Exit when lead score > 100
- **Safety**: Max 14 days in nurture
- **Action**: Move to sales automation

#### Use Case 2: Customer Onboarding
- **Goal**: Exit when setup complete
- **Condition**: All onboarding tasks checked
- **Safety**: Max 30 days

#### Use Case 3: Re-engagement Campaign
- **Goal**: Exit on any email engagement
- **Time**: Max 60 days
- **Action**: Tag as "re-engaged"

### 7. Implementation Phases

#### Phase 1: Core Infrastructure (Week 1)
- Database schema changes
- Basic exit action type
- Backend exit evaluation logic
- API endpoints

#### Phase 2: Goal-Based Exits (Week 2)
- Goal condition evaluator
- Field value goals
- Tag-based goals
- UI for goal configuration

#### Phase 3: Advanced Conditions (Week 3)
- Time-based exits
- Complex condition builder
- Safety exits
- Email event integration

#### Phase 4: UI/UX & Polish (Week 4)
- Complete UI implementation
- Visual workflow indicators
- Testing & debugging
- Documentation

### 8. Testing Strategy

#### Unit Tests
- Exit condition evaluation
- Goal checking logic
- Time calculations
- Safety thresholds

#### Integration Tests
- Full automation flow with exits
- Multiple exit criteria interaction
- Event-triggered exits
- API endpoint testing

#### E2E Tests
- UI configuration flow
- Automation execution with exits
- Exit statistics accuracy

### 9. Migration Strategy

#### For Existing Automations
1. Default safety exits enabled (90 days max)
2. No breaking changes to current automations
3. Gradual rollout with feature flag
4. Migration tool for bulk updates

### 10. Success Metrics

- **Adoption**: % of automations using exit criteria
- **Efficiency**: Average automation duration reduction
- **Safety**: Reduction in "stuck" enrollments
- **User Satisfaction**: Exit configuration ease

### 11. Future Enhancements

1. **AI-Suggested Exits**: ML-based exit recommendations
2. **Exit Analytics**: Detailed exit reason reporting
3. **Branching Exits**: Different paths based on exit reason
4. **Exit Webhooks**: Notify external systems on exit
5. **Re-enrollment Rules**: Conditions for re-entering after exit

## Technical Considerations

### Performance
- Index exit_criteria JSONB fields
- Batch process time-based exits
- Cache frequently checked conditions

### Scalability
- Async exit evaluation for large volumes
- Distributed exit checking
- Efficient condition evaluation

### Security
- Validate exit criteria configuration
- Audit trail for exits
- Permission checks for manual exits

## Rollback Plan

1. Feature flag to disable exit checking
2. Keep existing unenroll functionality
3. Database migrations are non-destructive
4. Gradual rollout by user segment