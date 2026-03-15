// api/create-checkout.js
const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const { currency = 'gbp', successUrl, cancelUrl } = req.body || {};
  const prices = { gbp: 499, usd: 499, eur: 499 };
  const appUrl = successUrl || process.env.APP_URL || 'https://dreamweaveapp.netlify.app';

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency,
          unit_amount: prices[currency] || 499,
          product_data: {
            name:        'Dreamweave — Lifetime Access',
            description: 'Unlimited AI bedtime stories for your children, forever.',
          },
        },
        quantity: 1,
      }],
      success_url: `${appUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  cancelUrl || appUrl,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
