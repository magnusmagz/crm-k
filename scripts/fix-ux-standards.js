#!/usr/bin/env node
/**
 * UX Standards Auto-Fixer
 * Automatically fixes common UX standards violations
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { UX_VIOLATIONS } = require('./check-ux-standards');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let fixCount = 0;
  
  UX_VIOLATIONS.forEach(({ pattern, replacement }) => {
    const matches = content.match(pattern);
    if (matches) {
      content = content.replace(pattern, replacement);
      fixCount += matches.length;
    }
  });
  
  if (fixCount > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed ${fixCount} violations in ${filePath}`);
  }
  
  return fixCount;
}

function main() {
  console.log('🔧 Auto-fixing UX Standards violations...\n');
  
  // Get all TypeScript and TSX files
  const files = glob.sync('frontend/src/**/*.{ts,tsx}', {
    cwd: path.join(__dirname, '..')
  });
  
  let totalFixes = 0;
  let filesFixed = 0;
  
  files.forEach(file => {
    const fullPath = path.join(__dirname, '..', file);
    const fixes = fixFile(fullPath);
    
    if (fixes > 0) {
      totalFixes += fixes;
      filesFixed++;
    }
  });
  
  if (totalFixes === 0) {
    console.log('✨ No auto-fixable violations found!');
  } else {
    console.log(`\n🎉 Fixed ${totalFixes} violations across ${filesFixed} files`);
    console.log('\n📝 Run the build to ensure everything works correctly');
    console.log('🧪 Consider running tests to verify functionality');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixFile };