/**
 * MailerSend client wrapper for transactional emails.
 * Handles email sending with proper configuration and error handling.
 */

import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';

const API_KEY = process.env.MAILERSEND_API_KEY;
const FROM_EMAIL = process.env.MAILERSEND_FROM_EMAIL || 'noreply@soralia.co.za';
const FROM_NAME = process.env.MAILERSEND_FROM_NAME || 'Soralia Village';

// Validate API key is present
if (!API_KEY) {
  console.warn('[Email] MAILERSEND_API_KEY not configured - emails will not be sent');
}

const mailerSend = new MailerSend({
  apiKey: API_KEY || '',
});

export const sentFrom = new Sender(FROM_EMAIL, FROM_NAME);

/**
 * Send an email via MailerSend.
 *
 * @param params - Email parameters
 * @param params.to - Recipient email address(es)
 * @param params.subject - Email subject line
 * @param params.html - HTML body content
 * @param params.text - Plain text body (optional, auto-generated from HTML if not provided)
 * @param params.replyTo - Reply-to email address (optional)
 * @returns Promise resolving to the email send response
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}) {
  // If no API key configured, log and skip (for development)
  if (!API_KEY) {
    console.log('[Email] Skipping send - MAILERSEND_API_KEY not configured');
    console.log('[Email] Would have sent:', { to, subject });
    return { success: true, skipped: true };
  }

  const recipients = Array.isArray(to)
    ? to.map(email => new Recipient(email))
    : [new Recipient(to)];

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setSubject(subject)
    .setHtml(html)
    .setText(text || html.replace(/<[^>]*>/g, ''));

  if (replyTo) {
    emailParams.setReplyTo(new Sender(replyTo));
  }

  try {
    const response = await mailerSend.email.send(emailParams);
    return response;
  } catch (error) {
    console.error('[Email] Failed to send email:', error);
    throw error;
  }
}

export type { EmailParams, Sender, Recipient };
