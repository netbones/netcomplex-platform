/**
 * Resend client wrapper for transactional emails.
 * Uses the official Resend Node.js SDK.
 * @see https://resend.com/docs/send-with-nextjs
 */

import { Resend } from 'resend';
import { ENV } from 'varlock/env';
import { createLogger } from '@/lib/logger';

const emailLogger = createLogger('email');

const resend = new Resend(ENV.RESEND_API_KEY);

const FROM_EMAIL = ENV.RESEND_FROM_EMAIL;
const FROM_NAME = ENV.RESEND_FROM_NAME;

interface SendEmailResult {
  success: boolean;
  error?: string;
  id?: string;
}

/**
 * Send an email via Resend API.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  if (!ENV.RESEND_API_KEY) {
    emailLogger.warn('RESEND_API_KEY not configured');
    return { success: false, error: 'No API key configured' };
  }

  const recipients = Array.isArray(to) ? to : [to];
  const from = `${FROM_NAME} <${FROM_EMAIL}>`;

  const { data, error } = await resend.emails.send({
    from,
    to: recipients,
    subject,
    html,
  });

  if (error) {
    emailLogger.error({ error, recipients }, 'Email send failed');
    return { success: false, error: error.message };
  }

  emailLogger.info({ recipients, id: data?.id }, 'Email sent');
  return { success: true, id: data?.id };
}
