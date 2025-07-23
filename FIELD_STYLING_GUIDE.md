# Field Styling Guide

## Standard Field Treatment

All form fields in the CRM should follow this consistent styling pattern for a comfortable, professional look:

### Input Fields
```jsx
<div>
  <label htmlFor="field-id" className="block text-sm font-medium text-gray-700">
    Field Label
  </label>
  <input
    type="text"
    id="field-id"
    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
    value={value}
    onChange={handleChange}
  />
</div>
```

### Select Fields
```jsx
<div>
  <label htmlFor="field-id" className="block text-sm font-medium text-gray-700">
    Field Label
  </label>
  <select
    id="field-id"
    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
    value={value}
    onChange={handleChange}
  >
    <option value="">Select an option</option>
    <option value="option1">Option 1</option>
  </select>
</div>
```

### Textarea Fields
```jsx
<div>
  <label htmlFor="field-id" className="block text-sm font-medium text-gray-700">
    Field Label
  </label>
  <textarea
    id="field-id"
    rows={3}
    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
    value={value}
    onChange={handleChange}
  />
</div>
```

## Key Styling Classes

- **Label**: `block text-sm font-medium text-gray-700`
- **Input/Select/Textarea**: `mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm`
- **Field Container**: Usually wrapped in a `<div>` with appropriate spacing
- **Form Sections**: Use `space-y-4` or `space-y-6` for consistent vertical spacing

## Layout Patterns

### Inline Fields (2 columns)
```jsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
  <div>
    <!-- First field -->
  </div>
  <div>
    <!-- Second field -->
  </div>
</div>
```

### Card/Panel Container
```jsx
<div className="bg-white shadow sm:rounded-lg">
  <div className="px-4 py-5 sm:p-6">
    <div className="space-y-4">
      <!-- Fields go here -->
    </div>
  </div>
</div>
```

## Examples in the Codebase

- Contact Form: `/frontend/src/components/ContactForm.tsx`
- Deal Form: `/frontend/src/components/DealForm.tsx`
- Custom Fields: `/frontend/src/pages/CustomFields.tsx`
- Profile Page: `/frontend/src/pages/Profile.tsx`

## Notes

- Always use Tailwind CSS classes for consistency
- Maintain the indigo color scheme for focus states
- Use proper semantic HTML (labels, IDs, etc.)
- Include appropriate spacing between fields
- Consider mobile responsiveness with `sm:` modifiers