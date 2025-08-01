# UX Standards Quick Reference

## 🎨 What Was Fixed
Fixed **40+ UX violations** across **13 components** by replacing hardcoded blue colors with primary design system colors.

## 📚 Documentation
- `UX_STANDARDS.md` - Complete guidelines and examples
- Color system rules and prohibited patterns
- Form elements and button standards

## 🛠 Tools Available

### Check for Violations
```bash
npm run check-ux-standards
# or
node scripts/check-ux-standards.js
```

### Auto-Fix Common Issues
```bash
npm run fix-ux-standards  
# or
node scripts/fix-ux-standards.js
```

### Build with Standards Check
```bash
npm run build  # Includes UX standards check
npm run build:no-check  # Skip standards check
```

## 🔧 Enforcement
- **Build Process**: UX standards checked before every build
- **Pre-commit Hook**: Prevents commits with violations
- **ESLint Rules**: Custom rules for prohibited patterns

## 🎯 Key Rules
- ✅ Use `bg-primary` instead of `bg-blue-600`
- ✅ Use `hover:bg-primary-dark` instead of `hover:bg-blue-700`  
- ✅ Use `text-primary` instead of `text-blue-600`
- ✅ Use `border-primary` instead of `border-blue-500`
- ✅ Use `focus:ring-primary` instead of `focus:ring-blue-500`
- ✅ Use `px-4 py-3` for form elements (not `px-3 py-2`)

## 🚨 Skip Protection (Emergency Only)
```bash
git commit --no-verify  # Skip pre-commit hook
```

This comprehensive system ensures consistent UX across your CRM application! 🎉