const express = require('express');
const router = express.Router();

router.post('/twilio', (req, res) => {
  console.log('Twilio webhook received:', req.body);
  res.json({ success: true });
});

router.post('/automation/:id', (req, res) => {
  console.log('Automation webhook received for business:', req.params.id);
  res.json({ success: true });
});

router.post('/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  console.log('Stripe webhook received!');
  // Logic to handle subscription events goes here
  res.json({ received: true });
});

module.exports = router;
