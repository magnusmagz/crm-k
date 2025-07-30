#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Mapping of old classes to new theme-aware classes
const replacements = {
  // Background colors
  'bg-gray-800': 'bg-primary',
  'bg-gray-900': 'bg-primary-dark',
  'hover:bg-gray-800': 'hover:bg-primary',
  'hover:bg-gray-900': 'hover:bg-primary-dark',
  
  // Text colors
  'text-gray-800': 'text-primary',
  'text-gray-900': 'text-primary-dark',
  'hover:text-gray-800': 'hover:text-primary',
  'hover:text-gray-900': 'hover:text-primary-dark',
  
  // Border colors
  'border-gray-800': 'border-primary',
  'border-gray-900': 'border-primary-dark',
  'focus:border-gray-800': 'focus:border-primary',
  'focus:border-gray-900': 'focus:border-primary-dark',
  
  // Ring colors
  'ring-gray-800': 'ring-primary',
  'ring-gray-900': 'ring-primary-dark',
  'focus:ring-gray-800': 'focus:ring-primary',
  'focus:ring-gray-900': 'focus:ring-primary-dark',
  
  // Divider and other variations
  'divide-gray-800': 'divide-primary',
  'divide-gray-900': 'divide-primary-dark',
};

// Files to process
const srcDir = path.join(__dirname, '../src');
const files = glob.sync(`${srcDir}/**/*.{tsx,ts,jsx,js}`, {
  ignore: ['**/node_modules/**', '**/build/**', '**/dist/**']
});

console.log(`Found ${files.length} files to process`);

let totalReplacements = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;
  let fileReplacements = 0;
  
  // Process each replacement
  Object.entries(replacements).forEach(([oldClass, newClass]) => {
    // Match class names in className attributes (handles both single and double quotes)
    const classNameRegex = new RegExp(`(className=["'][^"']*)(\\b${oldClass}\\b)([^"']*["'])`, 'g');
    const matches = content.match(classNameRegex);
    
    if (matches) {
      content = content.replace(classNameRegex, `$1${newClass}$3`);
      modified = true;
      fileReplacements += matches.length;
    }
  });
  
  if (modified) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file} (${fileReplacements} replacements)`);
    totalReplacements += fileReplacements;
  }
});

console.log(`\nTotal replacements: ${totalReplacements}`);
console.log('Theme color update complete!');