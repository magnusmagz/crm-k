/**
 * 🎮 TRY IT YOURSELF - INTERACTIVE TESTING
 * 
 * This file lets you experiment with tests
 * Try breaking them and fixing them!
 */

// Simple CRM functions to test
function calculateCommission(dealValue, rate = 0.1) {
  // TODO: Fix this function - it has a bug!
  return dealValue * rate;
}

function shouldContactBeVIP(contact) {
  // VIP if: deal value > $10,000 OR has 'enterprise' tag
  if (contact.totalDealValue > 10000) return true;
  if (contact.tags && contact.tags.includes('enterprise')) return true;
  return false;
}

function validatePhoneNumber(phone) {
  // Should accept: (123) 456-7890, 123-456-7890, 1234567890
  const cleaned = phone.replace(/[^\d]/g, '');
  return cleaned.length === 10;
}

// 🧪 YOUR TESTS START HERE
console.log('🎮 INTERACTIVE TESTING - TRY IT YOURSELF!\n');

// Test 1: Commission Calculation
console.log('TEST 1: Commission Calculation');
console.log('------------------------------');

// TODO: This test is failing! Can you fix the calculateCommission function?
const commission1 = calculateCommission(1000, 0.15);
console.log(`Input: $1000 sale, 15% commission`);
console.log(`Expected: $150`);
console.log(`Actual: $${commission1}`);
if (commission1 === 150) {
  console.log('✅ PASS\n');
} else {
  console.log('❌ FAIL - The function needs to handle percentage correctly!\n');
}

// Test 2: VIP Contact Detection
console.log('TEST 2: VIP Contact Detection');
console.log('-----------------------------');

const contacts = [
  { name: 'Small Fish', totalDealValue: 5000, tags: [] },
  { name: 'Big Whale', totalDealValue: 50000, tags: [] },
  { name: 'Enterprise Client', totalDealValue: 3000, tags: ['enterprise'] },
  { name: 'Regular Joe', totalDealValue: 2000, tags: ['customer'] }
];

contacts.forEach(contact => {
  const isVIP = shouldContactBeVIP(contact);
  const shouldBeVIP = contact.totalDealValue > 10000 || 
                      (contact.tags && contact.tags.includes('enterprise'));
  
  console.log(`${contact.name}: ${isVIP ? 'VIP' : 'Regular'}`);
  if (isVIP === shouldBeVIP) {
    console.log(`✅ Correctly identified`);
  } else {
    console.log(`❌ Wrong classification`);
  }
});

// Test 3: Phone Validation
console.log('\n\nTEST 3: Phone Number Validation');
console.log('--------------------------------');

const phoneNumbers = [
  '(123) 456-7890',
  '123-456-7890',
  '1234567890',
  '123-45-67890',  // This should fail - wrong format
  '12345',         // Too short
  '12345678901'    // Too long
];

phoneNumbers.forEach(phone => {
  const isValid = validatePhoneNumber(phone);
  console.log(`"${phone}": ${isValid ? '✅ Valid' : '❌ Invalid'}`);
});

// 🎯 CHALLENGE SECTION
console.log('\n\n🎯 TESTING CHALLENGES:');
console.log('======================\n');

console.log('CHALLENGE 1: Fix the calculateCommission function');
console.log('Hint: The rate is already a decimal (0.15 = 15%)\n');

console.log('CHALLENGE 2: Add a new test case');
console.log('Create a function that checks if a deal is "hot":');
console.log('- Hot if: value > $5000 AND stage is "Negotiation" or "Proposal"');
console.log('- Write the function and test it!\n');

console.log('CHALLENGE 3: Test edge cases');
console.log('What happens if:');
console.log('- calculateCommission gets negative values?');
console.log('- shouldContactBeVIP gets null/undefined?');
console.log('- validatePhoneNumber gets empty string?\n');

// Example solution starter for Challenge 2
console.log('📝 CHALLENGE 2 STARTER CODE:');
console.log('```javascript');
console.log('function isDealHot(deal) {');
console.log('  // YOUR CODE HERE');
console.log('}');
console.log('');
console.log('// Test it');
console.log('const hotDeal = { value: 10000, stage: "Negotiation" };');
console.log('const coldDeal = { value: 1000, stage: "Lead" };');
console.log('console.log(isDealHot(hotDeal)); // Should be true');
console.log('console.log(isDealHot(coldDeal)); // Should be false');
console.log('```\n');

// Tips
console.log('💡 TESTING TIPS:');
console.log('================');
console.log('1. Start with the "happy path" - normal, expected inputs');
console.log('2. Then test edge cases - empty, null, huge numbers, etc.');
console.log('3. Test error cases - what should make it fail?');
console.log('4. Each test should test ONE thing');
console.log('5. Test names should describe what they test');
console.log('6. If a test is hard to write, the code might need refactoring\n');

console.log('🚀 Now try modifying this file and re-running it!');
console.log('   Change the functions, break the tests, fix them again.');
console.log('   This is how you learn testing - by doing!\n');