# Mobile Import/Export Features Hidden

The following import/export features have been hidden on mobile devices using the `desktop-only` CSS class:

## 1. Import Buttons
- **Contacts Page**: "Import CSV" button (hidden on mobile)
- **Pipeline Page**: "Import CSV" button (hidden on mobile)

## 2. Download Features
- **Deal Import Modal**: "Download Skipped Records" button (hidden on mobile)
- **Contact Import Modal**: "Download Skipped Records" button (hidden on mobile)

## 3. Debug/Developer Tools
- **Pipeline Page**: Debug Deal dropdown selector (hidden on mobile)

## Rationale
- Import/export operations are typically bulk operations better suited for desktop
- CSV file handling is more complex on mobile devices
- File downloads on mobile can be problematic depending on the device
- These features require file system access which varies greatly across mobile devices
- Mobile users typically focus on individual record management rather than bulk operations

## User Experience
Mobile users can still:
- Add individual contacts and deals through forms
- Use the quick contact form via the FAB
- Edit and manage individual records
- View all their data

This approach maintains core CRM functionality on mobile while removing features that are better suited for desktop environments.