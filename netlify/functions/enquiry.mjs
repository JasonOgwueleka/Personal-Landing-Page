// Enquiry form handler.
//
// Runs on Netlify's servers, not in the browser, so the Resend API key stays
// private. The browser posts JSON here; this sends the email through Resend.
//
// Required environment variable (set in Netlify, never in the repo):
//   RESEND_API_KEY   your Resend API key
// Optional:
//   ENQUIRY_FROM     sender address (default: Resend's test sender)
//   ENQUIRY_TO       recipient (default: jasonogwueleka@gmail.com)

const MAX = { name: 100, email: 254, company: 100, type: 60, message: 2000, website: 200 };

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

// Strip CR/LF so nothing typed in a field can forge extra email headers.
const clean = (value, limit) =>
  String(value ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, limit);

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not set');
    return json(500, { error: 'Email is not configured yet.' });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid request.' });
  }

  // Honeypot: real people never fill this hidden field, bots usually do.
  // Answer 200 so the bot believes it worked and doesn't retry.
  if (clean(body._gotcha, 50)) return json(200, { ok: true });

  const name = clean(body.name, MAX.name);
  const email = clean(body.email, MAX.email);
  const company = clean(body.company, MAX.company);
  const type = clean(body['partnership-type'], MAX.type);
  const website = clean(body.website, MAX.website);
  const message = String(body.message ?? '').trim().slice(0, MAX.message);

  if (!name || !email || !type || !message) return json(400, { error: 'Please fill in every required field.' });
  if (!isEmail(email)) return json(400, { error: 'Please enter a valid email address.' });

  const text = [
    `Name:    ${name}`,
    `Email:   ${email}`,
    `Company: ${company || '—'}`,
    `Type:    ${type}`,
    `Website: ${website || '—'}`,
    '',
    'Message:',
    message,
  ].join('\n');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.ENQUIRY_FROM || 'Enquiries <onboarding@resend.dev>',
        to: [process.env.ENQUIRY_TO || 'jasonogwueleka@gmail.com'],
        reply_to: email,
        subject: `Enquiry from ${name} — ${type}`,
        text,
      }),
    });

    if (!response.ok) {
      console.error('Resend error', response.status, await response.text());
      return json(502, { error: 'Could not send the message. Please try again.' });
    }

    return json(200, { ok: true });
  } catch (err) {
    console.error('Resend request failed', err);
    return json(502, { error: 'Could not send the message. Please try again.' });
  }
};
