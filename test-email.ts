import { sendEmail } from './src/shared/api/email/resend';

async function testEmail() {
  console.log('[DEBUG] Starting email test...');
  try {
    const result = await sendEmail({
      to: 'netbonesforever@proton.me',
      subject: 'Test Email Verification',
      html: '<p>Testing email utility...</p>',
    });
    console.log('[DEBUG] Email test result:', result);
  } catch (error) {
    console.error('[DEBUG] Email test failed with error:', error);
  }
}

testEmail();
