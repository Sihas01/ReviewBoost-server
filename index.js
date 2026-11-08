const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

function createApp(env) {
  const app = express();

  // Middleware
  app.use(cors());
  app.use((req, res, next) => {
    if (req.originalUrl === '/api/webhook/stripe') {
      next();
    } else {
      bodyParser.json()(req, res, next);
    }
  });

  // Make Workers bindings available to routes.
  app.use((req, res, next) => {
    req.env = env;
    next();
  });

  // Routes
  const sendRoutes = require('./routes/send');
  const billingRoutes = require('./routes/billing');
  const webhookRoutes = require('./routes/webhooks');
  const reviewRoutes = require('./routes/reviews');

  app.use('/api', sendRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api/webhook', webhookRoutes);
  app.use('/api/reviews', reviewRoutes);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', demoMode: req.env.DEMO_MODE === 'true' });
  });

  app.get('/', (req, res) => {
    res.send('ReviewBoost API is running');
  });

  return app;
}

module.exports = createApp;
