import type { Request, Response } from 'express';

export default async (req: Request, res: Response) => {
  // STRICT MVP: Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { targetPhone, promptText } = req.body;

  if (!targetPhone || !promptText) {
    return res.status(400).json({ error: 'Missing phone number or prompt text' });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromPhone) {
    console.warn('⚠️ Twilio credentials missing. Simulating SMS send for local development.');
    console.log(`📱 [SIMULATED SMS to ${targetPhone}]: ${promptText}`);
    return res.status(200).json({ success: true, simulated: true });
  }

  try {
    // Standard Twilio REST API call (No heavy SDK required for MVP)
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const params = new URLSearchParams({
      To: targetPhone,
      From: fromPhone,
      Body: promptText
    });

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    const data = await response.json();
    return res.status(200).json({ success: true, messageId: data.sid });
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return res.status(500).json({ error: 'Failed to send prompt' });
  }
};
