// Test to understand the tag configuration format

// Test case 1: V1 engine format
const v1Config = {
  tags: 'tag3'  // or tags: ['tag3']
};

// Test case 2: V2 engine format  
const v2Config = {
  tag: 'tag3'
};

console.log('Testing tag configurations:');
console.log('\nV1 Engine (automationEngine.js) expects:');
console.log('config.tags =', v1Config.tags);
console.log('Array.isArray(tags):', Array.isArray(v1Config.tags));
console.log('Result would be:', Array.isArray(v1Config.tags) ? v1Config.tags : [v1Config.tags]);

console.log('\nV2 Engine (automationEngineV2.js) expects:');
console.log('config.tag =', v2Config.tag);
console.log('Would fail if:', !v2Config.tag);

console.log('\nThe issue: If the UI saves { tags: "tag3" }, V2 engine looks for config.tag and gets undefined!');