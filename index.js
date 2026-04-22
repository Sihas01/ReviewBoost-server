require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3001;

// Supabase Initialization
const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_KEY
);

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Make supabase available to routes
app.use((req, res, next) => {
  req.supabase = supabase;
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

app.get('/', (req, res) => {
  res.send('ReviewBoost API is running');
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
