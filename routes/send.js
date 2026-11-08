const express = require('express');
const router = express.Router();
const { timingSafeEqual } = require('node:crypto');

function authorized(req, secret) {
  if (!secret) return true;
  const supplied = Buffer.from(req.get('x-api-key') || '', 'utf8');
  const expected = Buffer.from(secret, 'utf8');
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

router.post('/send-request', async (req, res) => {
  const { DB, SMS_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = req.env;
  if (!authorized(req, SMS_API_KEY)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const { businessId, customerName, customerPhone, message } = req.body;

  try {
    // Send using Twilio's HTTPS API, without relying on Node-specific SDK transport.
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      throw new Error('Twilio configuration is incomplete');
    }
    const params = new URLSearchParams();
    if (message != null) params.set('Body', message);
    params.set('From', TWILIO_PHONE_NUMBER);
    if (customerPhone != null) params.set('To', customerPhone);
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(TWILIO_ACCOUNT_SID)}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });
    const twilioResponse = await response.json();
    if (!response.ok) throw new Error(twilioResponse.message || 'Twilio request failed');

    // The SMS has already been sent if this insert fails.
    await DB.prepare(
      'INSERT INTO requests (business_id, customer_name, customer_phone, message_sent, status) VALUES (?, ?, ?, ?, ?)'
    ).bind(businessId ?? null, customerName ?? null, customerPhone ?? null, message ?? null, 'sent').run();

    res.json({ 
      success: true, 
      messageId: twilioResponse.sid 
    });
  } catch (error) {
    console.error('Error sending request:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
