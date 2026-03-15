// api/verify-payment.js
// Called after Stripe redirects to /success — verifies subscription and issues token

import Stripe from 'stripe';
import crypto from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).end();

  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Missing session ID' });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    // Check subscription is active
    const sub = session.subscription;
    if (!sub || !['active','trialing'].includes(sub.status)) {
      return res.status(402).json({ error: 'Subscription not active' });
    }

    // Generate token from subscription ID — same sub always gets same token
    const token = 'dw_sub_' + crypto
      .createHmac('sha256', process.env.TOKEN_SALT || 'dreamweave2025')
      .update(sub.id)
      .digest('hex')
      .slice(0, 32);

    return res.status(200).json({
      token,
      subscriptionId: sub.id,
      status:         sub.status,
      renewsAt:       new Date(sub.current_period_end * 1000).toISOString(),
      email:          session.customer_details?.email || '',
    });

  } catch (err) {
    console.error('Verify error:', err);
    return res.status(500).json({ error: err.message });
  }
}
