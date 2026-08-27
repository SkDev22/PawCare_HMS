import { env } from '../config/env';

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

// Talks to SendGrid's v3 REST API directly over fetch — no SDK dependency
// needed for a single "send one transactional email" call.
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  if (!env.SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY is not configured');
  }

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: env.SENDGRID_FROM_EMAIL },
      subject,
      content: [{ type: 'text/html', value: html }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`SendGrid request failed (${res.status}): ${body.slice(0, 300)}`);
  }
}
