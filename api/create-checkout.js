// api/create-checkout.js
// Creates a Stripe Checkout session for $3.99/month subscription

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  const { currency = 'gbp' } = req.body || {};
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).end();

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency:   currency,
          unit_amount: 499,           // £4.99 / $4.99 / €4.99 in smallest unit
          recurring: { interval: 'month' },
          product_data: {
            name:        'Dreamweave — Monthly',
            description: 'Unlimited AI bedtime stories for your children.',
          },
        },
        quantity: 1,
      }],
      // Stripe automatically converts to local currency for customers
      // e.g. a UK customer will see ~£3.15, EU customer ~€3.70
      automatic_tax:         { enabled: true },
      allow_promotion_codes: true,
      success_url: `${process.env.APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.APP_URL}`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: err.message });
  }
}
