# Duplicate Detection & Merge Feature

## Overview
This feature allows users to search for duplicate contacts and merge them together, consolidating data and maintaining data integrity.

## Features Implemented

### 1. Backend API Endpoints

#### Search Duplicates Endpoint
- **URL**: `GET /api/contacts/duplicates`
- **Query Parameters**: 
  - `search` (required, min 2 characters)
- **Returns**: Array of contacts with deal counts
- **Search Logic**:
  - Email exact match (case-insensitive)
  - Email partial match
  - Full name fuzzy match
  - First name or last name partial match

#### Merge Contacts Endpoint
- **URL**: `POST /api/contacts/merge`
- **Body**:
  ```json
  {
    "masterId": 123,
    "mergeIds": [456, 789]
  }
  ```
- **Merge Logic**:
  - Master contact retains all existing data
  - Empty fields filled from merge contacts
  - Notes concatenated with separator
  - Tags combined (unique)
  - Custom fields merged (non-destructive)
  - Deals and notes reassigned to master
  - Merged contacts deleted

### 2. Frontend Components

#### Duplicate Search Page (`/duplicates`)
- Search input with debouncing
- Real-time results display
- Contact selection with checkboxes
- Master contact designation
- Merge confirmation
- Success/error messaging

#### Access Points
- Direct URL: `/duplicates`
- Link from Contacts page: "Find Duplicates" button
- Desktop navigation menu (not in mobile nav due to space constraints)

## User Flow

1. User navigates to Duplicates page from Contacts
2. Enters search query (name or email)
3. System displays matching contacts with deal counts
4. User selects 2+ contacts to merge
5. User designates one as master
6. User confirms merge
7. System merges data and shows success message

## Technical Details

### Database Changes
- No schema changes required
- Uses existing models: Contact, Deal, Note
- Transactional merge for data integrity

### API Integration
The duplicate endpoints integrate with the existing contact API structure:
```javascript
// Search for duplicates
const response = await api.get('/contacts/duplicates?search=john.doe@email.com');

// Merge contacts
const mergeResponse = await api.post('/contacts/merge', {
  masterId: 123,
  mergeIds: [456, 789]
});
```

### Validation Rules
- Search query must be at least 2 characters
- Master ID cannot be in merge IDs array
- All contacts must belong to the authenticated user
- At least 2 contacts required for merge

## Deployment Steps

1. **Backend Deployment**:
   - Deploy updated `backend/routes/contacts.js`
   - Ensure Note model is imported in contacts router
   - No database migrations required

2. **Frontend Deployment**:
   - Deploy new `DuplicateContacts.tsx` page
   - Update `App.tsx` with new route
   - Update `Contacts.tsx` with Find Duplicates link
   - Build frontend: `cd frontend && npm run build`

3. **Testing**:
   - Run `node backend/test-duplicate-endpoints.js` with valid AUTH_TOKEN
   - Test search functionality with various queries
   - Test merge with different scenarios

## Security Considerations

- All operations scoped to authenticated user's data
- Transaction-based merge prevents partial updates
- Proper validation of all inputs
- No cross-user data access possible

## Performance Notes

- Search limited to 50 results for performance
- Debounced search input (500ms) to reduce API calls
- Efficient queries with proper indexing on email field
- Batch operations for related data updates

## Future Enhancements

1. Bulk duplicate detection (find all duplicates at once)
2. Automated merge suggestions based on similarity scores
3. Merge preview showing exactly what will change
4. Undo functionality for recent merges
5. Duplicate prevention during contact creation
6. Export duplicate report to CSV