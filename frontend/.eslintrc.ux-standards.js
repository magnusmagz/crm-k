// ESLint rules for UX Standards compliance
module.exports = {
  rules: {
    // Custom rule to prevent blue color usage in favor of primary colors
    'no-hardcoded-blue-colors': {
      create: function(context) {
        const prohibitedClasses = [
          'bg-blue-600', 'bg-blue-700', 'bg-blue-500',
          'text-blue-600', 'text-blue-700', 'text-blue-500',
          'border-blue-600', 'border-blue-700', 'border-blue-500',
          'focus:ring-blue-500', 'focus:ring-blue-600'
        ];
        
        return {
          Literal: function(node) {
            if (typeof node.value === 'string' && node.value.includes('className')) {
              const classValue = node.value;
              prohibitedClasses.forEach(prohibited => {
                if (classValue.includes(prohibited)) {
                  context.report({
                    node,
                    message: `Use primary color system instead of ${prohibited}. Replace with bg-primary, text-primary, etc.`
                  });
                }
              });
            }
          },
          JSXAttribute: function(node) {
            if (node.name && node.name.name === 'className' && node.value) {
              const classValue = node.value.value || (node.value.expression && node.value.expression.value);
              if (typeof classValue === 'string') {
                prohibitedClasses.forEach(prohibited => {
                  if (classValue.includes(prohibited)) {
                    context.report({
                      node,
                      message: `UX Standards violation: Use primary color system instead of ${prohibited}. See UX_STANDARDS.md for guidance.`
                    });
                  }
                });
              }
            }
          }
        };
      }
    }
  }
};