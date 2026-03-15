// api/story.js — Vercel serverless function
// Proxies Claude API calls so your API key stays secret

module.exports = async function handler(req, res) {
  // CORS — allow your domain only in production
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Access-Token');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  // Validate access token
  const token = req.headers['x-access-token'];
  if (!isValidToken(token)) {
    return res.status(401).json({ error: 'Invalid or missing access token. Please purchase access.' });
  }

  const { system, user, maxTokens } = req.body;
  if (!user) return res.status(400).json({ error: 'Missing prompt' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':         'application/json',
        'x-api-key':            process.env.ANTHROPIC_API_KEY,
        'anthropic-version':    '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: maxTokens || 4000,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}

function isValidToken(token) {
  if (!token) return false;

  // In FREE trial mode: tokens starting with "free_" are valid
  if (token.startsWith('free_')) return true;

  // Paid tokens: validate against your Stripe webhook-generated tokens
  // stored in your database or KV store
  // For simplest setup: Stripe webhook writes token to Vercel KV
  // For now: any token that matches your secret prefix is valid
  const SECRET = process.env.TOKEN_SECRET || 'dw_paid_';
  return token.startsWith(SECRET);
}
