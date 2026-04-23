/**
 * MailerSend client wrapper for transactional emails.
 * Uses Node.js spawn to execute curl - execSync has issues with header handling.
 */

import { spawn } from 'child_process';
import { ENV } from 'varlock/env';
import { createLogger } from '@/lib/logger';

const emailLogger = createLogger('email');

const API_KEY = ENV.MAILERSEND_API_KEY;
const FROM_EMAIL = ENV.MAILERSEND_FROM_EMAIL;
const FROM_NAME = ENV.MAILERSEND_FROM_NAME;

const API_HOST = 'api.mailersend.com';
const API_PATH = '/v1/email';

/**
 * Send an email via MailerSend API.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  if (!API_KEY) {
    emailLogger.warn('MAILERSEND_API_KEY not configured');
    return { success: false, error: 'No API key configured' };
  }

  const recipients = Array.isArray(to) ? to : [to];

  const payload = JSON.stringify({
    from: { email: FROM_EMAIL, name: FROM_NAME },
    to: recipients.map(email => ({ email })),
    subject,
    html,
  });

  return new Promise(resolve => {
    const delimiter = '---HTTP_STATUS---';
    const args = [
      '-s',
      '-w',
      delimiter + '%{http_code}',
      '-X',
      'POST',
      '-H',
      'Content-Type: application/json',
      '-H',
      `Authorization: Bearer ${API_KEY}`,
      '-d',
      payload,
      `https://${API_HOST}${API_PATH}`,
    ];

    const proc = spawn('curl', args);
    let result = '';

    proc.stdout.on('data', data => {
      result += data.toString();
    });

    proc.on('close', () => {
      const statusIdx = result.lastIndexOf(delimiter);
      if (statusIdx >= 0) {
        const httpCode = parseInt(result.substring(statusIdx + delimiter.length).trim(), 10);
        const body = result.substring(0, statusIdx);

        if (httpCode >= 200 && httpCode < 300) {
          emailLogger.info({ recipients, httpCode }, 'Email sent');
          resolve({ success: true, status: httpCode });
        } else {
          emailLogger.error({ httpCode, body }, 'Email send failed');
          resolve({ success: false, error: body });
        }
      } else {
        emailLogger.error('Failed to parse MailerSend response');
        resolve({ success: false, error: 'Failed to parse response' });
      }
    });

    proc.on('error', err => {
      emailLogger.error({ err }, 'curl spawn error');
      resolve({ success: false, error: err.message });
    });
  });
}
