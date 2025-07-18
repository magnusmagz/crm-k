# CRM Killer - Own Your Customer Data

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

Stop paying monthly fees for a CRM you'll never own. Build your own custom CRM system with modern tools and take control of your customer data.

## Features

- **Complete Data Ownership**: Your data, your rules, your system
- **Contact Management**: Full CRUD operations with custom fields
- **Custom Fields**: Define unlimited custom fields for your specific needs
- **User Authentication**: Secure login with JWT tokens
- **Search & Filtering**: Find contacts quickly with advanced search
- **Responsive Design**: Works on desktop, tablet, and mobile
- **One-Click Deploy**: Get started in minutes with Heroku

## Tech Stack

- **Backend**: Node.js, Express, PostgreSQL, Sequelize
- **Frontend**: React, TypeScript, Tailwind CSS
- **Authentication**: JWT, bcrypt
- **Deployment**: Heroku-ready with one-click deploy

## Quick Start

### Deploy to Heroku (Recommended)

1. Click the "Deploy to Heroku" button above
2. Create a Heroku account if you don't have one
3. Fill in the app name and click "Deploy app"
4. Wait for the deployment to complete
5. Click "View" to open your CRM
6. Create your admin account and start using your CRM!

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/crm-killer.git
cd crm-killer
```

2. Install dependencies:
```bash
npm install
cd frontend && npm install
cd ..
```

3. Set up PostgreSQL database and create `.env` file:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Run database migrations:
```bash
npx sequelize-cli db:migrate
```

5. Start the development server:
```bash
npm run dev
```

The backend will run on http://localhost:5000 and frontend on http://localhost:3000

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `SESSION_SECRET`: Secret key for sessions
- `PORT`: Server port (default: 5000)
- `CLIENT_URL`: Frontend URL for CORS

## Features in Detail

### Contact Management
- Add, edit, delete, and view contacts
- Search by name, email, phone, or custom fields
- Tag contacts for easy organization
- Add notes to track interactions

### Custom Fields
- Create fields of various types: text, number, date, dropdown, checkbox, URL
- Set fields as required or optional
- Reorder fields to your preference
- Fields automatically appear in contact forms

### User Authentication
- Secure registration and login
- Password reset functionality
- Profile management
- Session management with auto-logout

## Cost Comparison

Traditional CRM costs:
- Salesforce: $150/user/month
- HubSpot: $450/month (3 users)
- Your CRM: $16/month total on Heroku

## Contributing

Pull requests are welcome! Please read our contributing guidelines first.

## License

MIT License - feel free to use this for your business!

## Support

- Documentation: [docs/README.md](docs/README.md)
- Issues: [GitHub Issues](https://github.com/yourusername/crm-killer/issues)
- Email: support@example.com

---

Built with ❤️ to free businesses from CRM vendor lock-in