# Automation Debugging Guide

This guide helps debug failed automations for specific contacts or deals.

## Quick Start: Debug Contact Automation Failure

For contact ID: `73ad755e-887e-4fc2-91c8-2f368d44cc1b`

### 1. Using the API Endpoints

```bash
# Get debug logs for the contact
GET /api/automations/debug/entity/contact/73ad755e-887e-4fc2-91c8-2f368d44cc1b

# This returns:
# - All automation enrollments for this contact
# - Recent debug logs (if debug mode is enabled)
# - Current enrollment status
```

### 2. Using the Debug Scripts

```bash
# Run the contact automation debugger
node utils/debugContactAutomation.js 73ad755e-887e-4fc2-91c8-2f368d44cc1b <userId>

# Run the comprehensive failure analyzer
node utils/automationFailureAnalyzer.js contact 73ad755e-887e-4fc2-91c8-2f368d44cc1b <userId>
```

### 3. Enable Debug Mode

To get detailed execution logs, set the environment variable:
```bash
AUTOMATION_DEBUG=true
```

## Common Failure Reasons

### 1. **Conditions Not Met**
- The automation's conditions evaluated to false
- Check the `conditionsEvaluated` field in logs
- Common issues:
  - Field values don't match expected values
  - Empty fields when checking "is not empty"
  - Tag conditions not matching

### 2. **Enrollment Failures**
- Entity failed to enroll in the automation
- Check `AutomationEnrollment` table for status
- Common issues:
  - Automation was inactive when triggered
  - Entity already enrolled (duplicate prevention)
  - System errors during enrollment

### 3. **Action Execution Failures**
- One or more actions failed to execute
- Check `actionsExecuted` array in logs
- Common issues:
  - Invalid field names in update actions
  - Missing required data
  - Permission issues

### 4. **Stuck Enrollments**
- Enrollment is active but `nextStepAt` is in the past
- The automation engine hasn't processed the next step
- Solution: Manually process the enrollment

## Step-by-Step Debugging Process

### Step 1: Check Automation Logs
```sql
-- Find logs for a specific contact
SELECT * FROM automation_logs 
WHERE user_id = '<userId>'
AND (
  trigger_data->>'contactId' = '73ad755e-887e-4fc2-91c8-2f368d44cc1b'
  OR trigger_data->'contact'->>'id' = '73ad755e-887e-4fc2-91c8-2f368d44cc1b'
)
ORDER BY executed_at DESC;
```

### Step 2: Check Enrollments
```sql
-- Find all enrollments for the contact
SELECT * FROM automation_enrollments
WHERE entity_type = 'contact'
AND entity_id = '73ad755e-887e-4fc2-91c8-2f368d44cc1b'
ORDER BY created_at DESC;
```

### Step 3: Analyze Failed Enrollments
Look for enrollments with:
- `status = 'failed'` - Check metadata for error details
- `status = 'active'` but `next_step_at < NOW()` - Stuck enrollment

### Step 4: Manual Recovery

#### Process Stuck Enrollment
```bash
# Using API
POST /api/automations/enrollment/{enrollmentId}/process

# This will:
# 1. Attempt to process the next step
# 2. Return debug logs
# 3. Update enrollment status
```

#### Re-enroll Contact
```bash
# If automation should have triggered but didn't
POST /api/automations/{automationId}/enroll
{
  "entityType": "contact",
  "entityIds": ["73ad755e-887e-4fc2-91c8-2f368d44cc1b"]
}
```

## Automation Engine Architecture

### Single-Step Automations (Legacy)
- Processed by `automationEngine.js`
- Execute all actions immediately
- Log results to `automation_logs` table

### Multi-Step Automations
- Processed by `automationEngineV2.js`
- Create enrollments in `automation_enrollments` table
- Process steps based on delays
- Support branching logic

## Debug Output Interpretation

### Enrollment Status
- `active` - Currently processing
- `completed` - Successfully finished
- `failed` - Error occurred (check metadata)
- `unenrolled` - Manually removed

### Log Status
- `success` - All actions executed
- `failed` - One or more actions failed
- `skipped` - Conditions not met

### Common Error Messages
- "Entity not found" - Contact/deal deleted or doesn't exist
- "Automation not active" - Automation was disabled
- "Condition evaluation failed" - Error in condition logic
- "Action execution failed" - Error in action handler

## Troubleshooting Checklist

- [ ] Check if automation is active
- [ ] Verify trigger type matches the event
- [ ] Review conditions and current entity values
- [ ] Check for existing enrollments
- [ ] Look for error messages in logs
- [ ] Enable debug mode for detailed logs
- [ ] Manually process stuck enrollments
- [ ] Re-enroll if necessary

## Support Scripts Location

- `/utils/debugContactAutomation.js` - Debug specific contact
- `/utils/automationFailureAnalyzer.js` - Comprehensive failure analysis
- `/utils/debugAutomationAPI.js` - API-based debugging
- `/services/automationDebugger.js` - Core debug service

## Environment Variables

- `AUTOMATION_DEBUG=true` - Enable detailed logging
- `NODE_ENV=development` - Show stack traces in API responses