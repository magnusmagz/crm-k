# Multi-Tenant Architecture Plan
*No Billing Implementation - Pure Multi-Tenant CRM*

## 🏛️ System Hierarchy

```
Super Admin (Platform Owner)
    └── Organizations (Companies)
        ├── Branding (CRM Name & Color)
        ├── Organization Admins
        ├── Users (Company Employees)
        ├── Contacts (Company's Customers)
        └── Round Robin Rules
```

## 📊 Database Schema Changes

### 1. Users Table - Add Super Admin Flag
```sql
ALTER TABLE users ADD COLUMN "isSuperAdmin" BOOLEAN DEFAULT false;
```

### 2. Organizations Table - Add Branding
```sql
ALTER TABLE organizations 
ADD COLUMN "crm_name" VARCHAR(255),
ADD COLUMN "primary_color" VARCHAR(7) DEFAULT '#6366f1',
ADD COLUMN "created_by" UUID,
ADD COLUMN "is_active" BOOLEAN DEFAULT true;
```

### 3. Platform Audit Log (New Table)
```sql
CREATE TABLE platform_audit_log (
  id UUID PRIMARY KEY,
  super_admin_id UUID REFERENCES users(id),
  action VARCHAR(255),
  target_type VARCHAR(50),
  target_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE
);
```

## 🚀 Implementation Phases

### Phase 1: Super Admin Foundation (Week 1)
- [ ] Add `isSuperAdmin` column to users table
- [ ] Create super admin middleware for authentication
- [ ] Build super admin dashboard
- [ ] Create organizations management page
- [ ] Implement organization CRUD operations
- [ ] Add global user view across all organizations

### Phase 2: Branding & Customization (Week 2)
- [ ] Add `crm_name` and `primary_color` to organizations
- [ ] Create Theme Context in React
- [ ] Implement dynamic CSS variables for theming
- [ ] Store theme preferences in localStorage
- [ ] Apply organization theme on login
- [ ] Update header to show custom CRM name

### Phase 3: Enhanced Management (Week 3)
- [ ] Organization admins can create/manage users
- [ ] Super admin impersonation feature
- [ ] Comprehensive activity logging
- [ ] Organization suspension/activation
- [ ] Audit trail for all super admin actions

## 💻 Project Structure

### Backend Routes
```
/api/super-admin/
├── organizations/        # CRUD operations for organizations
│   ├── GET    /         # List all organizations
│   ├── POST   /         # Create new organization
│   ├── GET    /:id      # Get organization details
│   ├── PUT    /:id      # Update organization
│   └── DELETE /:id      # Suspend organization
├── users/               # Global user management
│   ├── GET    /         # List all users across platform
│   └── GET    /search   # Search users
├── analytics/           # Platform-wide metrics
└── impersonate/:userId  # Support access feature

/api/organization/
├── settings/            # Organization-specific settings
├── branding/           # Theme and branding updates
└── users/              # Organization user management (existing)
```

### Frontend Components
```
/frontend/src/
├── pages/
│   ├── SuperAdmin/
│   │   ├── Dashboard.tsx           # Super admin overview
│   │   ├── Organizations.tsx       # Manage all organizations
│   │   ├── CreateOrganization.tsx  # New org wizard
│   │   └── GlobalUsers.tsx         # All platform users
│   ├── OrganizationSettings.tsx    # Org admin settings
│   └── UserManagement.tsx          # Existing user management
├── contexts/
│   ├── AuthContext.tsx             # Existing auth
│   └── ThemeContext.tsx            # New theme system
└── components/
    └── ThemedLayout.tsx            # Dynamic themed wrapper
```

## 🎨 Branding System

### Organization Customization Options
```typescript
interface OrganizationBranding {
  crmName: string;        // e.g., "Sales Hub", "Acme CRM"
  primaryColor: string;   // Hex color for primary theme
  organizationName: string; // Company name
}
```

### CSS Variables Applied
```css
:root {
  --color-primary: ${primaryColor};
  --color-primary-dark: ${darken(primaryColor, 0.1)};
  --color-primary-light: ${lighten(primaryColor, 0.1)};
  --color-primary-bg: ${primaryColor}10;
}
```

### Theme Application Flow
1. User logs in
2. Fetch organization branding
3. Store in localStorage and Context
4. Apply CSS variables dynamically
5. Update document title with CRM name

## 🔐 Permission Hierarchy

```javascript
const PERMISSION_LEVELS = {
  SUPER_ADMIN: {
    level: 0,
    capabilities: [
      'view_all_organizations',
      'create_organization',
      'suspend_organization',
      'view_all_users',
      'impersonate_user',
      'platform_settings'
    ]
  },
  ORG_ADMIN: {
    level: 1,
    capabilities: [
      'manage_organization_settings',
      'manage_organization_users',
      'view_organization_data',
      'configure_branding',
      'manage_round_robin'
    ]
  },
  LOAN_OFFICER: {
    level: 2,
    capabilities: [
      'view_assigned_contacts',
      'manage_assigned_contacts',
      'use_round_robin',
      'view_team_data'
    ]
  },
  USER: {
    level: 3,
    capabilities: [
      'view_assigned_contacts',
      'basic_crm_features'
    ]
  }
}
```

## 📋 Super Admin Features

### 1. Organizations Dashboard
- **Table View:**
  - Organization name
  - CRM name
  - User count
  - Contact count
  - Created date
  - Status (active/suspended)
  - Actions (edit, suspend, impersonate)

### 2. Create Organization Wizard
- **Step 1:** Basic Information
  - Company name
  - CRM display name
  - Primary color selection
- **Step 2:** First Admin User
  - Admin email
  - Admin name
  - Send welcome email
- **Step 3:** Confirmation
  - Review settings
  - Create organization

### 3. Global User Management
- View all users across organizations
- Filter by organization
- Search by email/name
- Quick actions:
  - Reset password
  - Suspend/activate
  - Change organization
  - View activity

### 4. Impersonation Feature
- Login as any user for support
- Clear indication when impersonating
- Activity logged
- Auto-timeout after 1 hour

## 🛠️ Organization Admin Features

### Settings Page (Organization Admins Only)
- **Branding Tab:**
  - Update CRM name
  - Change primary color
  - Preview changes
- **Organization Tab:**
  - Company information
  - Contact details
- **Users Tab:**
  - Existing user management
  - Create new users
  - Set roles and permissions
- **Statistics Tab:**
  - Total users
  - Total contacts
  - Activity metrics

## 🔄 Data Isolation Strategy

### Middleware Enforcement
```javascript
// Every request includes organization context
middleware.enforceOrganization = (req, res, next) => {
  if (req.user.isSuperAdmin) {
    // Super admin can access any org
    req.organizationId = req.params.orgId || req.body.organizationId;
  } else {
    // Regular users locked to their org
    req.organizationId = req.user.organizationId;
  }
  next();
};
```

### Query Scoping
```javascript
// All database queries automatically filtered
Contact.findAll({
  where: {
    organizationId: req.organizationId,
    ...otherConditions
  }
});
```

## 🚦 Migration Steps

### 1. Database Migration
```sql
-- Make yourself super admin
UPDATE users SET "isSuperAdmin" = true 
WHERE email = 'maggie@4msquared.com';

-- Set branding for existing organization
UPDATE organizations 
SET crm_name = 'CRM Killer', 
    primary_color = '#6366f1',
    created_by = (SELECT id FROM users WHERE email = 'maggie@4msquared.com')
WHERE name = 'Sales Co.';

-- Add new columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS "isSuperAdmin" BOOLEAN DEFAULT false;

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS "crm_name" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "primary_color" VARCHAR(7) DEFAULT '#6366f1',
ADD COLUMN IF NOT EXISTS "created_by" UUID,
ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT true;
```

### 2. Code Migration
1. Update authentication to check `isSuperAdmin`
2. Add super admin routes
3. Create theme context
4. Update header component
5. Add organization settings

## 🎯 MVP Features Checklist

### What's Included (No Billing)
- ✅ Super admin dashboard
- ✅ Create unlimited organizations
- ✅ Custom branding per organization
- ✅ Organization admin user management
- ✅ Complete data isolation
- ✅ Activity logging and audit trail
- ✅ Organization suspension
- ✅ User impersonation for support
- ✅ Dynamic theming system

### What's Excluded (For Now)
- ❌ Payment processing
- ❌ Plan tiers and limits
- ❌ Usage quotas
- ❌ Billing dashboard
- ❌ Subscription management
- ❌ Invoice generation
- ❌ Payment methods
- ❌ Usage-based pricing

## 📝 Implementation Tasks

### Immediate (Day 1-2)
1. Add database columns
2. Create super admin middleware
3. Setup super admin routes
4. Create basic organizations list

### Short Term (Week 1)
1. Build organization CRUD
2. Implement theme context
3. Create super admin dashboard
4. Add global users view

### Medium Term (Week 2-3)
1. Organization creation wizard
2. Branding customization UI
3. Impersonation feature
4. Audit logging system

## 🔒 Security Considerations

### Critical Security Measures
1. **Organization Isolation**
   - Always filter by organizationId
   - Validate ownership on every request
   - Prevent cross-tenant data access

2. **Super Admin Protection**
   - Separate authentication flow
   - Log all super admin actions
   - Consider IP restrictions
   - Add 2FA in future

3. **Impersonation Safety**
   - Clear visual indicator
   - Time-limited sessions
   - Comprehensive audit log
   - Read-only mode option

## 📈 Success Metrics

### Platform Health
- Number of organizations
- Active users per organization
- Daily active users
- Contact creation rate

### Technical Metrics
- Response times per organization
- Database query performance
- Error rates by organization
- Storage usage per organization

## 🚀 Future Enhancements

### Phase 4 (Future)
- White-label options (custom domains)
- API access per organization
- SSO integration
- Advanced analytics
- Email template customization
- Custom fields per organization
- Webhook integrations
- Data import/export tools

### Phase 5 (When Needed)
- Billing integration (Stripe)
- Usage-based pricing
- Plan management
- Invoice generation
- Payment method management

## 📚 Technical Notes

### Theme Context Implementation
```typescript
const ThemeContext = React.createContext<{
  theme: OrganizationTheme;
  updateTheme: (theme: Partial<OrganizationTheme>) => void;
}>({
  theme: defaultTheme,
  updateTheme: () => {}
});

// Applied at app root
<ThemeProvider>
  <App />
</ThemeProvider>
```

### Dynamic CSS Variables
```typescript
useEffect(() => {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', theme.primaryColor);
  document.title = `${theme.crmName} | ${currentPage}`;
}, [theme]);
```

## ✅ Definition of Done

### Phase 1 Complete When:
- [ ] Super admin can login and see dashboard
- [ ] Can view all organizations
- [ ] Can create new organization
- [ ] Can view all users

### Phase 2 Complete When:
- [ ] Organizations have custom CRM names
- [ ] Organizations have custom colors
- [ ] Theme applies on login
- [ ] Settings page allows customization

### Phase 3 Complete When:
- [ ] Full audit logging implemented
- [ ] Impersonation feature working
- [ ] Organization suspension works
- [ ] All permissions enforced

---

*Last Updated: January 2025*
*Status: Planning Phase*
*Owner: Super Admin Team*