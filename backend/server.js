const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { sequelize } = require('./models');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const contactRoutes = require('./routes/contacts');
const contactImportRoutes = require('./routes/contacts-import');
const dealImportRoutes = require('./routes/deals-import');
const customFieldRoutes = require('./routes/customFields');
const stageRoutes = require('./routes/stages');
const dealRoutes = require('./routes/deals');
const automationRoutes = require('./routes/automations');
const emailRoutes = require('./routes/emails');
const webhookRoutes = require('./routes/webhooks');
const trackingRoutes = require('./routes/tracking');
const analyticsRoutes = require('./routes/analytics');
const { initializeAutomations } = require('./services/automationInitializer');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/contacts/import', contactImportRoutes);
app.use('/api/custom-fields', customFieldRoutes);
app.use('/api/stages', stageRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/deals/import', dealImportRoutes);
app.use('/api/automations', automationRoutes);
app.use('/api/deal-custom-fields', require('./routes/dealCustomFields'));
app.use('/api/emails', emailRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api', trackingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notes', require('./routes/notes'));
app.use('/api/timeline', require('./routes/timeline'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Database connection and server start
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync database models
    await sequelize.sync({ alter: true });
    console.log('Database synced successfully.');
    
    // Initialize automation system
    initializeAutomations();
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
}

// Only start the server if this file is run directly
if (require.main === module) {
  startServer();
}

// Export app for testing
module.exports = app;