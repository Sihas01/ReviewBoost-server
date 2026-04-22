const express = require('express');
const router = express.Router();
const twilio = require('twilio');

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID, 
  process.env.TWILIO_AUTH_TOKEN
);

router.post('/send-request', async (req, res) => {
  const { businessId, customerName, customerPhone, message } = req.body;
  const supabase = req.supabase;

  try {
    // 1. Send SMS via Twilio
    const twilioResponse = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: customerPhone,
    });

    // 2. Log to Supabase
    const { data, error } = await supabase
      .from('requests')
      .insert([
        {
          business_id: businessId,
          customer_name: customerName,
          customer_phone: customerPhone,
          message_sent: message,
          status: 'sent'
        }
      ]);

    if (error) throw error;

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
