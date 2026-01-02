// Nhost serverless function to summarise newsletters for parents.
//
// This function receives a newsletter body (the raw content) and optional subject
// and uses the internal AI helper to generate a concise, parent-friendly summary.
// The result includes a paragraph summary and bullet points for key actions.
// Clients or other server functions (cron jobs) can invoke this API to
// summarise school newsletters before presenting them to parents.

import { invokeAdvancedAI } from './_shared/invokeAdvancedAI.js';

export default async function summarizeNewsletter(req, res) {
  if (req.method && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { newsletter, subject } = req.body || {};
    if (!newsletter) {
      return res.status(400).json({ error: 'Missing newsletter content' });
    }

    const prompt = `You are Teachmo, a warm and supportive AI assistant.\n\n` +
      `Your task is to summarise school newsletters for busy parents.\n\n` +
      (subject ? `Newsletter subject: ${subject}\n\n` : '') +
      `Newsletter content:\n${newsletter}\n\n` +
      `Please provide:\n` +
      `1. A concise summary in one paragraph (no more than 100 words) that captures the key points.\n` +
      `2. Three bullet points highlighting any important dates, actions, or events mentioned.\n\n` +
      `Avoid judgemental language and do not include advertisements or promotional content. Use inclusive language.`;

    const aiResponse = await invokeAdvancedAI(prompt, {
      maxTokens: 512,
      temperature: 0.5,
    });

    const content = aiResponse?.content ? aiResponse.content.trim() : '';

    return res.status(200).json({ summary: content });
  } catch (err) {
    console.error('Error summarising newsletter', err);
    return res.status(500).json({ error: 'Failed to summarise newsletter' });
  }
}
