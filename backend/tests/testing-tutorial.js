/**
 * 🎓 AUTOMATED TESTING TUTORIAL
 * 
 * This file teaches you the basics of automated testing
 * using simple examples that don't require a database
 */

// Let's start with a simple function to test
function addNumbers(a, b) {
  return a + b;
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function calculateDealValue(baseValue, discount = 0) {
  if (discount < 0 || discount > 100) {
    throw new Error('Discount must be between 0 and 100');
  }
  return baseValue - (baseValue * discount / 100);
}

// Now let's write tests for these functions!

console.log('🧪 WELCOME TO AUTOMATED TESTING!\n');
console.log('Tests are just code that checks if your code works correctly.\n');

// Test 1: Basic Addition
console.log('TEST 1: Testing the addNumbers function');
console.log('--------------------------------------');

// This is a test - we check if our function gives the expected result
const result1 = addNumbers(2, 3);
const expected1 = 5;

if (result1 === expected1) {
  console.log('✅ PASS: 2 + 3 = 5');
} else {
  console.log(`❌ FAIL: Expected ${expected1} but got ${result1}`);
}

// Let's test edge cases
const result2 = addNumbers(-5, 10);
const expected2 = 5;

if (result2 === expected2) {
  console.log('✅ PASS: -5 + 10 = 5 (negative numbers work!)');
} else {
  console.log(`❌ FAIL: Expected ${expected2} but got ${result2}`);
}

// Test 2: Email Validation
console.log('\n\nTEST 2: Testing email validation');
console.log('--------------------------------------');

// Test valid emails
const validEmails = [
  'user@example.com',
  'john.doe@company.org',
  'test123@test.co.uk'
];

console.log('Testing valid emails:');
validEmails.forEach(email => {
  if (isValidEmail(email)) {
    console.log(`✅ PASS: "${email}" is correctly identified as valid`);
  } else {
    console.log(`❌ FAIL: "${email}" should be valid but was rejected`);
  }
});

// Test invalid emails
const invalidEmails = [
  'notanemail',
  '@example.com',
  'user@',
  'user @example.com'
];

console.log('\nTesting invalid emails:');
invalidEmails.forEach(email => {
  if (!isValidEmail(email)) {
    console.log(`✅ PASS: "${email}" is correctly identified as invalid`);
  } else {
    console.log(`❌ FAIL: "${email}" should be invalid but was accepted`);
  }
});

// Test 3: Deal Value Calculation
console.log('\n\nTEST 3: Testing deal value calculation');
console.log('--------------------------------------');

// Test normal discount
const dealValue1 = calculateDealValue(1000, 10);
if (dealValue1 === 900) {
  console.log('✅ PASS: $1000 with 10% discount = $900');
} else {
  console.log(`❌ FAIL: Expected $900 but got $${dealValue1}`);
}

// Test no discount
const dealValue2 = calculateDealValue(500);
if (dealValue2 === 500) {
  console.log('✅ PASS: $500 with no discount = $500');
} else {
  console.log(`❌ FAIL: Expected $500 but got $${dealValue2}`);
}

// Test error handling
console.log('\nTesting error handling:');
try {
  calculateDealValue(1000, 150); // Invalid discount
  console.log('❌ FAIL: Should have thrown an error for 150% discount');
} catch (error) {
  console.log('✅ PASS: Correctly threw error for invalid discount');
}

// EXPLAINING TEST PATTERNS
console.log('\n\n📚 KEY TESTING CONCEPTS:');
console.log('========================\n');

console.log('1️⃣  ARRANGE - ACT - ASSERT Pattern:');
console.log('   - ARRANGE: Set up your test data');
console.log('   - ACT: Run the function you\'re testing');
console.log('   - ASSERT: Check if the result is what you expected\n');

console.log('2️⃣  Test Different Scenarios:');
console.log('   - Normal cases (happy path)');
console.log('   - Edge cases (boundaries, special values)');
console.log('   - Error cases (what should fail)\n');

console.log('3️⃣  Each Test Should Be Independent:');
console.log('   - Tests shouldn\'t depend on each other');
console.log('   - Each test sets up its own data\n');

console.log('4️⃣  Good Test Names Describe What They Test:');
console.log('   - "should add two positive numbers"');
console.log('   - "should reject invalid email format"');
console.log('   - "should throw error for discount over 100%"\n');

// Simulating CRM-specific tests
console.log('\n\n🏢 CRM-SPECIFIC TEST EXAMPLES:');
console.log('================================\n');

// Mock automation condition checker
function checkAutomationCondition(contact, condition) {
  switch (condition.operator) {
    case 'equals':
      return contact[condition.field] === condition.value;
    case 'contains':
      return contact[condition.field]?.includes(condition.value) || false;
    case 'has_tag':
      return contact.tags?.includes(condition.value) || false;
    default:
      return false;
  }
}

// Test automation conditions
console.log('Testing automation condition logic:');

const testContact = {
  firstName: 'John',
  lastName: 'Doe',
  company: 'Acme Corp',
  tags: ['customer', 'vip']
};

// Test 1: Company equals condition
const condition1 = { field: 'company', operator: 'equals', value: 'Acme Corp' };
if (checkAutomationCondition(testContact, condition1)) {
  console.log('✅ PASS: Company equals condition works');
} else {
  console.log('❌ FAIL: Company equals condition failed');
}

// Test 2: Has tag condition
const condition2 = { field: 'tags', operator: 'has_tag', value: 'vip' };
if (checkAutomationCondition(testContact, condition2)) {
  console.log('✅ PASS: Has tag condition works');
} else {
  console.log('❌ FAIL: Has tag condition failed');
}

// Test 3: Negative test - should not match
const condition3 = { field: 'company', operator: 'equals', value: 'Wrong Company' };
if (!checkAutomationCondition(testContact, condition3)) {
  console.log('✅ PASS: Correctly rejected non-matching condition');
} else {
  console.log('❌ FAIL: Should not have matched wrong company');
}

console.log('\n\n✨ BENEFITS OF AUTOMATED TESTING:');
console.log('==================================\n');
console.log('🚀 Fast - Run hundreds of tests in seconds');
console.log('🛡️  Reliable - Same tests run exactly the same way every time');
console.log('🔄 Repeatable - Run tests after every change');
console.log('📝 Documentation - Tests show how your code should work');
console.log('💪 Confidence - Know your code works before deploying');
console.log('🐛 Early Bug Detection - Catch issues before users do');

console.log('\n\n🎯 NEXT STEPS:');
console.log('==============\n');
console.log('1. Run this file: node backend/tests/testing-tutorial.js');
console.log('2. Try modifying the tests to make them fail');
console.log('3. Fix the code to make tests pass again');
console.log('4. Write your own test for a new function');
console.log('5. When ready, run the full test suite with: npm test\n');