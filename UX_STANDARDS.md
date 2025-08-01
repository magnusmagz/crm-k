# UX Standards and Design System Guidelines

## Color System

### Primary Colors
- `bg-primary` - Main brand color for primary actions
- `bg-primary-dark` - Darker shade for hover states
- `text-primary` - Primary text color
- `text-primary-dark` - Darker text variant
- `border-primary` - Primary border color
- `ring-primary` - Focus ring color

### Prohibited Colors
❌ **DO NOT USE:**
- `bg-blue-600`, `bg-blue-700` (Use `bg-primary`, `bg-primary-dark` instead)
- `text-blue-600`, `text-blue-700` (Use `text-primary`, `text-primary-dark` instead)
- `border-blue-500`, `border-blue-600` (Use `border-primary` instead)

## Button Standards

### Primary Buttons
```tsx
// ✅ Correct
<button className="bg-primary text-white rounded-lg hover:bg-primary-dark focus:ring-2 focus:ring-primary">
  Primary Action
</button>

// ❌ Incorrect
<button className="bg-blue-600 text-white rounded-lg hover:bg-blue-700">
  Primary Action
</button>
```

### Secondary Buttons
```tsx
// ✅ Correct
<button className="border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-primary">
  Secondary Action
</button>
```

### Button Sizes
- `btn-mobile` - Use for mobile-optimized buttons
- `px-4 py-3` - Standard button padding
- `px-6 py-2` - Compact button padding

## Form Elements

### Input Fields
```tsx
// ✅ Correct
<input className="px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary" />

// ❌ Incorrect
<input className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500" />
```

### Select Elements
```tsx
// ✅ Correct
<select className="px-4 py-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:border-primary">
```

## Loading States

### Spinners
```tsx
// ✅ Correct
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>

// ❌ Incorrect
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
```

### Progress Bars
```tsx
// ✅ Correct
<div className="bg-primary h-3 rounded-full"></div>

// ❌ Incorrect
<div className="bg-blue-600 h-3 rounded-full"></div>
```

## Status Colors

### Information/Active States
- Use `bg-primary` and `text-primary` for active states
- Use `bg-blue-50`, `text-blue-700` only for informational content (not interactive elements)

### Success States
- `bg-green-50`, `text-green-700`, `border-green-200`

### Warning States
- `bg-yellow-50`, `text-yellow-700`, `border-yellow-200`

### Error States
- `bg-red-50`, `text-red-700`, `border-red-200`

## Common Violations to Watch For

1. **Blue buttons instead of primary** - Always use `bg-primary`/`bg-primary-dark`
2. **Inconsistent focus states** - Always use `focus:ring-primary`
3. **Mixed padding on form elements** - Standardize on `px-4 py-3`
4. **Hard-coded blue colors** - Use design system colors only

## Automated Checking

This document should be enforced by:
1. ESLint rules for className patterns
2. Pre-commit hooks
3. Build-time validation
4. Regular audits of color usage

## Examples of Compliant Components

See these components for reference:
- `ContactForm.tsx` - Proper form styling
- `ContactComparisonModal.tsx` - Consistent button usage
- `GoalBasedExits.tsx` - Correct color system implementation