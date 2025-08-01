# Contact Export Feature Plan (10k or less)

## Overview
This document outlines the implementation plan for a contact export feature that allows users to export up to 10,000 contacts with customizable field selection.

## Technical Architecture

### Backend Implementation

#### 1. Export Endpoint
- **Route**: `GET /api/contacts/export`
- **Authentication**: Required (authMiddleware)
- **Query Parameters**:
  - `fields`: Comma-separated list of fields to export
  - `search`: Search query (optional)
  - `tags`: Filter by tags (optional)
  - `format`: Export format (default: 'csv')

#### 2. Field Selection
- Standard fields: firstName, lastName, email, phone, company, position, tags, notes, createdAt, updatedAt
- Custom fields: Dynamically included based on user's custom field definitions
- Field mapping for CSV headers (e.g., firstName → "First Name")

#### 3. Export Logic
```javascript
// Pseudo-code structure
1. Validate request and field selection
2. Build query with filters
3. Fetch contacts (limit 10,000)
4. Include custom fields data
5. Transform to CSV format
6. Return CSV file with proper headers
```

### Frontend Implementation

#### 1. ContactExport Component
- Modal dialog for export configuration
- Field selection with checkboxes
- Preview of selected fields
- Export button with loading state

#### 2. UI Features
- Select all/deselect all functionality
- Grouped fields (Standard vs Custom)
- Current filters display
- Row count estimate

#### 3. Integration Points
- Add export button to Contacts page header
- Use existing search/filter context
- Download file directly in browser

## Implementation Steps

### Phase 1: Backend (Day 1)
1. Create export endpoint in contacts.js
2. Implement field selection validation
3. Add CSV generation using existing csvExporter utility
4. Test with various field combinations

### Phase 2: Frontend (Day 2)
1. Create ContactExport component
2. Implement field selection UI
3. Add export button to Contacts page
4. Connect to backend endpoint

### Phase 3: Polish & Testing (Day 3)
1. Add loading states and error handling
2. Implement field grouping in UI
3. Test with custom fields
4. Add export confirmation

## API Design

### Request
```
GET /api/contacts/export?fields=firstName,lastName,email,customFields.industry&search=tech&format=csv
```

### Response
```
Content-Type: text/csv
Content-Disposition: attachment; filename="contacts-export-2025-08-01.csv"

First Name,Last Name,Email,Industry
John,Doe,john@example.com,Technology
Jane,Smith,jane@example.com,Healthcare
```

## UI Mockup

```
┌─────────────────────────────────────┐
│ Export Contacts                   X │
├─────────────────────────────────────┤
│ Select fields to export:            │
│                                     │
│ Standard Fields:                    │
│ ☑ First Name    ☑ Last Name       │
│ ☑ Email         ☐ Phone           │
│ ☐ Company       ☐ Position        │
│ ☐ Tags          ☐ Notes           │
│                                     │
│ Custom Fields:                      │
│ ☐ Industry      ☐ Lead Source     │
│ ☐ Deal Size     ☐ Last Contact    │
│                                     │
│ [Select All] [Clear All]            │
│                                     │
│ Current Filters:                    │
│ • Search: "tech"                    │
│ • Tags: prospect, customer          │
│                                     │
│ Estimated rows: 1,234               │
│                                     │
│ [Cancel]              [Export CSV]  │
└─────────────────────────────────────┘
```

## Security Considerations
- User can only export their own contacts
- Field-level permissions respected
- Rate limiting: Max 10 exports per minute
- CSV injection prevention

## Future Enhancements (Not in scope)
- Export templates (save field selections)
- Additional formats (Excel, JSON)
- Scheduled exports
- Large export handling (>10k rows)
- Export history/audit log

## Success Metrics
- Export completes in <5 seconds for 10k rows
- Users can select any combination of fields
- Custom fields properly included
- No memory issues on server