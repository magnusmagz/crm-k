#!/usr/bin/env node
/**
 * UX Standards Checker
 * Scans the codebase for UX standards violations
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Define prohibited patterns and their replacements
const UX_VIOLATIONS = [
  {
    pattern: /bg-blue-6\d{2}/g,
    replacement: 'bg-primary',
    message: 'Use bg-primary instead of blue backgrounds'
  },
  {
    pattern: /hover:bg-blue-7\d{2}/g,
    replacement: 'hover:bg-primary-dark',
    message: 'Use hover:bg-primary-dark instead of blue hover states'
  },
  {
    pattern: /text-blue-6\d{2}/g,
    replacement: 'text-primary',
    message: 'Use text-primary instead of blue text'
  },
  {
    pattern: /border-blue-[56]\d{2}/g,
    replacement: 'border-primary',
    message: 'Use border-primary instead of blue borders'
  },
  {
    pattern: /focus:ring-blue-[56]\d{2}/g,
    replacement: 'focus:ring-primary',
    message: 'Use focus:ring-primary instead of blue focus rings'
  },
  {
    pattern: /px-3 py-2(?=.*className.*input|.*className.*select)/g,
    replacement: 'px-4 py-3',
    message: 'Use standard form element padding px-4 py-3'
  }
];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const violations = [];
  
  UX_VIOLATIONS.forEach(({ pattern, replacement, message }, index) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      violations.push({
        file: filePath,
        line: lineNumber,
        column: match.index - content.lastIndexOf('\n', match.index - 1),
        violation: match[0],
        replacement,
        message,
        ruleId: `ux-standards-${index + 1}`
      });
    }
  });
  
  return violations;
}

function main() {
  console.log('🎨 Running UX Standards Check...\n');
  
  // Get all TypeScript and TSX files
  const files = glob.sync('frontend/src/**/*.{ts,tsx}', {
    cwd: path.join(__dirname, '..')
  });
  
  let totalViolations = 0;
  const violationsByFile = {};
  
  files.forEach(file => {
    const fullPath = path.join(__dirname, '..', file);
    const violations = checkFile(fullPath);
    
    if (violations.length > 0) {
      violationsByFile[file] = violations;
      totalViolations += violations.length;
    }
  });
  
  // Report results
  if (totalViolations === 0) {
    console.log('✅ No UX standards violations found!');
    process.exit(0);
  }
  
  console.log(`❌ Found ${totalViolations} UX standards violations:\n`);
  
  Object.entries(violationsByFile).forEach(([file, violations]) => {
    console.log(`📁 ${file}:`);
    violations.forEach(v => {
      console.log(`  ${v.line}:${v.column} - ${v.message}`);
      console.log(`    Found: "${v.violation}"`);
      console.log(`    Replace with: "${v.replacement}"`);
      console.log(`    Rule: ${v.ruleId}\n`);
    });
  });
  
  console.log(`\n📚 See UX_STANDARDS.md for complete guidelines`);
  console.log(`\n🔧 To auto-fix some issues, run: npm run fix-ux-standards`);
  
  process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = { checkFile, UX_VIOLATIONS };