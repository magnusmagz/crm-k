// Direct test of route order in contacts.js
const express = require('express');
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Route Order in contacts.js');
console.log('=====================================\n');

// Read the contacts.js file
const contactsPath = path.join(__dirname, 'routes', 'contacts.js');
const fileContent = fs.readFileSync(contactsPath, 'utf8');

// Find all route definitions
const routeRegex = /router\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g;
const routes = [];
let match;
let lineNumber = 0;

const lines = fileContent.split('\n');
lines.forEach((line, index) => {
  if (line.includes('router.get(') || line.includes('router.post(') || 
      line.includes('router.put(') || line.includes('router.delete(')) {
    const methodMatch = line.match(/router\.(\w+)\(['"]([^'"]+)['"]/);
    if (methodMatch) {
      routes.push({
        line: index + 1,
        method: methodMatch[1].toUpperCase(),
        path: methodMatch[2],
        isDynamic: methodMatch[2].includes(':')
      });
    }
  }
});

console.log('Found routes in order of definition:\n');

let foundDuplicates = false;
let foundExport = false;
let foundDynamicId = false;
let duplicatesLine = 0;
let exportLine = 0;
let dynamicIdLine = 0;

routes.forEach((route, index) => {
  const marker = route.isDynamic ? '⚠️  DYNAMIC' : '✓  STATIC ';
  console.log(`${String(index + 1).padStart(2)}. Line ${String(route.line).padStart(4)}: ${marker} ${route.method.padEnd(6)} ${route.path}`);
  
  if (route.path === '/duplicates') {
    foundDuplicates = true;
    duplicatesLine = route.line;
  }
  if (route.path === '/export') {
    foundExport = true;
    exportLine = route.line;
  }
  if (route.path === '/:id' && !foundDynamicId) {
    foundDynamicId = true;
    dynamicIdLine = route.line;
  }
});

console.log('\n📊 Analysis:');
console.log('------------');

if (!foundDuplicates) {
  console.log('❌ /duplicates route NOT FOUND!');
} else if (!foundExport) {
  console.log('❌ /export route NOT FOUND!');
} else if (!foundDynamicId) {
  console.log('❌ /:id route NOT FOUND!');
} else {
  // Check order
  if (duplicatesLine < dynamicIdLine && exportLine < dynamicIdLine) {
    console.log('✅ Route order is CORRECT!');
    console.log(`   - /duplicates at line ${duplicatesLine}`);
    console.log(`   - /export at line ${exportLine}`);
    console.log(`   - /:id at line ${dynamicIdLine}`);
    console.log('\n✅ Static routes come before dynamic routes');
  } else {
    console.log('❌ Route order is WRONG!');
    if (duplicatesLine > dynamicIdLine) {
      console.log(`   - /duplicates (line ${duplicatesLine}) comes AFTER /:id (line ${dynamicIdLine})`);
    }
    if (exportLine > dynamicIdLine) {
      console.log(`   - /export (line ${exportLine}) comes AFTER /:id (line ${dynamicIdLine})`);
    }
    console.log('\n⚠️  This will cause Express to match "duplicates" and "export" as IDs!');
  }
}

// Test actual Express route matching
console.log('\n🧪 Testing Express Route Matching:');
console.log('----------------------------------');

const testRouter = express.Router();
const matchedRoutes = [];

// Mock middleware
const mockAuth = (req, res, next) => next();

// Register routes in the same order as the file
routes.forEach(route => {
  const method = route.method.toLowerCase();
  testRouter[method](route.path, mockAuth, (req, res) => {
    matchedRoutes.push({
      method: route.method,
      path: route.path,
      params: req.params
    });
    res.json({ matched: route.path });
  });
});

// Test URLs
const testUrls = [
  '/duplicates',
  '/export',
  '/123e4567-e89b-12d3-a456-426614174000',
  '/some-random-id'
];

console.log('\nTesting URL matching:');
testUrls.forEach(url => {
  // Find which route would match
  let matched = null;
  
  routes.forEach(route => {
    const pathRegex = route.path
      .replace(/:[^/]+/g, '([^/]+)')
      .replace(/\//g, '\\/');
    const regex = new RegExp(`^${pathRegex}$`);
    
    if (regex.test(url)) {
      if (!matched) {
        matched = route;
      }
    }
  });
  
  if (matched) {
    const expectedRoute = matched.isDynamic ? '/:id' : matched.path;
    const isCorrect = 
      (url === '/duplicates' && matched.path === '/duplicates') ||
      (url === '/export' && matched.path === '/export') ||
      (url !== '/duplicates' && url !== '/export' && matched.path === '/:id');
    
    console.log(`  ${url} → ${expectedRoute} ${isCorrect ? '✅' : '❌'}`);
  } else {
    console.log(`  ${url} → NO MATCH ❌`);
  }
});

console.log('\n📝 Recommendation:');
console.log('-----------------');
if (foundDynamicId && foundDuplicates && foundExport) {
  if (duplicatesLine < dynamicIdLine && exportLine < dynamicIdLine) {
    console.log('Route order appears correct locally.');
    console.log('If still getting errors on Heroku:');
    console.log('1. Make sure the file is committed: git add backend/routes/contacts.js');
    console.log('2. Push to Heroku: git push heroku main');
    console.log('3. Restart dynos: heroku restart');
    console.log('4. Check Heroku file: heroku run cat backend/routes/contacts.js');
  } else {
    console.log('Routes need to be reordered!');
    console.log('Move /duplicates and /export routes BEFORE /:id route');
  }
}