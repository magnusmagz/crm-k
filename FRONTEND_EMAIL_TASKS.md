# Frontend Email Implementation Tasks

## Overview
Build email UI components that integrate with the backend email API.

## Component Structure
```
frontend/src/
├── components/
│   └── email/
│       ├── EmailModal.tsx
│       ├── EmailHistory.tsx
│       └── EmailButton.tsx
├── services/
│   └── emailAPI.ts
└── pages/
    └── ContactDetail.tsx (modify existing)
```

## Task 1: Email API Service
File: `frontend/src/services/emailAPI.ts`

```typescript
interface SendEmailData {
  contactId: number;
  subject: string;
  message: string;
}

interface EmailRecord {
  id: number;
  subject: string;
  message: string;
  status: string;
  sentAt: string;
  openedAt: string | null;
  bouncedAt: string | null;
}

export const emailAPI = {
  send: async (data: SendEmailData) => {
    // POST to /api/emails/send
  },
  
  getHistory: async (contactId: number): Promise<EmailRecord[]> => {
    // GET from /api/emails/contact/:contactId
  }
};
```

## Task 2: Email Modal Component
- Simple modal with subject and message fields
- Send button with loading state
- Error handling with toast notifications
- Close on success

## Task 3: Email History Component  
- List of sent emails with timestamps
- Show email status (sent, opened, bounced)
- Expandable to show full message
- Empty state when no emails

## Task 4: Integration with ContactDetail
- Add "Send Email" button
- Show email history section
- Modal state management

## Styling
- Use existing Tailwind classes
- Match current app design patterns
- Mobile responsive

## State Management
- Local component state (no Redux needed)
- Loading states for all async operations
- Error handling with user-friendly messages