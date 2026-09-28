import { ValidationError } from './validation.js';

export function validateSubscription(input) {
  if (!input || typeof input !== 'object' || input.website) {
    throw new ValidationError('Unable to accept this subscription.');
  }
  if (input.consent !== true) {
    throw new ValidationError('Please agree to receive new-product updates.');
  }
  if (!Array.isArray(input.channels) || !input.channels.length ||
      input.channels.some(channel => !['email', 'whatsapp'].includes(channel))) {
    throw new ValidationError('Choose email, WhatsApp, or both.');
  }
  const subscriptions = [];
  if (input.channels.includes('email')) {
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ValidationError('Please enter a valid email address.');
    }
    subscriptions.push({ channel: 'email', destination: email });
  }
  if (input.channels.includes('whatsapp')) {
    const raw = typeof input.phone === 'string' ? input.phone.trim() : '';
    const phone = raw.replace(/[ ()-]/g, '');
    if (raw.length > 25 || !/^\+[1-9]\d{9,14}$/.test(phone)) {
      throw new ValidationError('Enter your WhatsApp number with country code, for example +91 98765 43210.');
    }
    subscriptions.push({ channel: 'whatsapp', destination: phone });
  }
  return subscriptions;
}
