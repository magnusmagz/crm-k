#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Define replacements for remaining grey elements
const replacements = [
  // Active/selected states - use primary color
  { from: /bg-gray-800(?!\d)/g, to: 'bg-primary' },
  { from: /bg-gray-900(?!\d)/g, to: 'bg-primary-dark' },
  { from: /border-gray-800(?!\d)/g, to: 'border-primary' },
  { from: /border-gray-900(?!\d)/g, to: 'border-primary-dark' },
  { from: /text-gray-800(?!\d)/g, to: 'text-primary' },
  { from: /text-gray-900(?!\d)/g, to: 'text-primary-dark' },
  
  // Focus states
  { from: /focus:ring-gray-800(?!\d)/g, to: 'focus:ring-primary' },
  { from: /focus:ring-gray-900(?!\d)/g, to: 'focus:ring-primary-dark' },
  { from: /focus:border-gray-800(?!\d)/g, to: 'focus:border-primary' },
  { from: /focus:border-gray-900(?!\d)/g, to: 'focus:border-primary-dark' },
  
  // Hover states
  { from: /hover:bg-gray-900(?!\d)/g, to: 'hover:bg-primary-dark' },
  { from: /hover:bg-gray-800(?!\d)/g, to: 'hover:bg-primary-dark' },
  
  // Ring states
  { from: /ring-gray-800(?!\d)/g, to: 'ring-primary' },
  { from: /ring-2 ring-gray-800(?!\d)/g, to: 'ring-2 ring-primary' },
];

// Files to update
const filesToUpdate = [
  'src/pages/CustomFields.tsx',
  'src/pages/ContactDetail.tsx',
  'src/components/StageManager.tsx',
  'src/components/Pagination.tsx',
  'src/components/MobilePipeline.tsx',
  'src/components/DealForm.tsx',
  'src/components/CustomFieldInput.tsx',
  'src/components/ContactForm.tsx',
  'src/components/automation/TriggerSelector.tsx',
  'src/components/automation/EntityDebugView.tsx',
  'src/components/automation/DebugView.tsx',
  'src/components/automation/AutomationDebugModal.tsx',
  'src/components/ui/FormField.tsx',
  'src/components/AccessibleButton.tsx',
  'src/components/DraggableFAB.tsx',
];

function updateFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping ${filePath} - file not found`);
    return 0;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let changeCount = 0;
  
  replacements.forEach(({ from, to }) => {
    const matches = content.match(from);
    if (matches) {
      changeCount += matches.length;
      content = content.replace(from, to);
    }
  });
  
  if (changeCount > 0) {
    fs.writeFileSync(fullPath, content);
    console.log(`Updated ${filePath} - ${changeCount} replacements`);
  } else {
    console.log(`No changes in ${filePath}`);
  }
  
  return changeCount;
}

console.log('Updating remaining grey colors to theme colors...\n');

let totalChanges = 0;
filesToUpdate.forEach(file => {
  totalChanges += updateFile(file);
});

console.log(`\nTotal replacements: ${totalChanges}`);
console.log('Done!');