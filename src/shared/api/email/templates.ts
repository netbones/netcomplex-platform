/**
 * Email templates for Soralia Village.
 * Provides HTML email templates with consistent styling.
 */

export const templates = {
  /**
   * Email verification sent on signup or when verification is required.
   * Includes a verification link.
   */
  verifyEmail: {
    subject: 'Verify your Soralia Village email',
    getHtml: (name: string, verificationUrl: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #4F46E5; margin: 0;">Soralia Village</h1>
  </div>
  
  <h2 style="color: #1f2937;">Verify your email address</h2>
  
  <p style="margin: 20px 0;">Hi${name ? `, ${escapeHtml(name)}` : ''}!</p>
  
  <p style="margin: 20px 0;">Thank you for signing up to Soralia Village. Please verify your email address by clicking the button below:</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${verificationUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a>
  </div>
  
  <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <p style="margin: 0; color: #92400e; font-size: 14px;">
      <strong>⚠️ Important:</strong> This link expires in 1 hour for security reasons.
    </p>
  </div>
  
  <p style="color: #6b7280; font-size: 14px;">If you didn't create an account with Soralia Village, please ignore this email.</p>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    &copy; ${new Date().getFullYear()} Soralia Village. All rights reserved.
  </p>
</body>
</html>
`,
  },

  /**
   * Welcome email sent on user signup.
   * Includes greeting and next steps for the user.
   */
  welcome: {
    subject: 'Welcome to Soralia Village!',
    getHtml: (name: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Soralia Village</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #4F46E5; margin: 0;">Soralia Village</h1>
  </div>
  
  <h2 style="color: #1f2937;">Welcome, ${escapeHtml(name)}!</h2>
  
  <p style="margin: 20px 0;">Your account has been created successfully. You can now access the community portal and connect with your neighbors.</p>
  
  <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #1f2937;">What you can do next:</h3>
    <ul style="margin: 0; padding-left: 20px;">
      <li>Complete your profile</li>
      <li>Browse the community directory</li>
      <li>Join groups and discussions</li>
      <li>Book community facilities</li>
      <li>Submit maintenance requests</li>
    </ul>
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="https://soralia.co.za/login" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Login to Portal</a>
  </div>
  
  <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
    If you have any questions, please contact the community management team.
  </p>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    &copy; ${new Date().getFullYear()} Soralia Village. All rights reserved.
  </p>
</body>
</html>
`,
  },

  /**
   * Password reset email sent when user requests a password reset.
   * Includes a reset link that expires in 1 hour.
   */
  passwordReset: {
    subject: 'Reset your Soralia Village password',
    getHtml: (resetUrl: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #4F46E5; margin: 0;">Soralia Village</h1>
  </div>
  
  <h2 style="color: #1f2937;">Password Reset Request</h2>
  
  <p style="margin: 20px 0;">You requested to reset your password. Click the button below to create a new password:</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${resetUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
  </div>
  
  <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <p style="margin: 0; color: #92400e; font-size: 14px;">
      <strong>⚠️ Important:</strong> This link expires in 1 hour for security reasons.
    </p>
  </div>
  
  <p style="color: #6b7280; font-size: 14px;">If you didn't request this password reset, please ignore this email. Your account security is important to us.</p>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    &copy; ${new Date().getFullYear()} Soralia Village. All rights reserved.
  </p>
</body>
</html>
`,
  },

  /**
   * Generic notification email sent when user enables email notifications.
   * Used for various system notifications.
   */
  emailNotification: {
    subject: 'New notification from Soralia Village',
    getHtml: (title: string, message: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #4F46E5; margin: 0;">Soralia Village</h1>
  </div>
  
  <h2 style="color: #1f2937;">${escapeHtml(title)}</h2>
  
  <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <p style="margin: 0;">${escapeHtml(message)}</p>
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="https://soralia.co.za/notifications" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Notifications</a>
  </div>
  
  <p style="color: #6b7280; font-size: 14px;">
    You received this email because you have email notifications enabled. 
    You can change this setting in your account preferences.
  </p>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    &copy; ${new Date().getFullYear()} Soralia Village. All rights reserved.
  </p>
</body>
</html>
`,
  },

  /**
   * Security alert email sent when a signup attempt is made with an existing email.
   */
  securityAlert: {
    subject: 'Security Alert: Sign-up attempt with your email',
    getHtml: (email: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Alert</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #4F46E5; margin: 0;">Soralia Village</h1>
  </div>
  
  <h2 style="color: #dc2626;">Security Alert</h2>
  
  <p style="margin: 20px 0;">Hello,</p>
  
  <p style="margin: 20px 0;">A sign-up attempt was recently made for Soralia Village using your email address (<strong>${escapeHtml(email)}</strong>). Since you already have an account, this attempt was blocked.</p>
  
  <p style="margin: 20px 0;">If this was you, you can simply log in to your existing account. If this wasn't you, someone may have tried to use your email address to create a duplicate account. Your account remains secure, and no action is required.</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="https://soralia.co.za/login" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Login to your account</a>
  </div>
  
  <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
    For your security, we recommend never sharing your password and enabling two-factor authentication if you haven't already.
  </p>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    &copy; ${new Date().getFullYear()} Soralia Village. All rights reserved.
  </p>
</body>
</html>
`,
  },
} as const;

/**
 * Type representing the available email template keys.
 */
export type TemplateKey = keyof typeof templates;

/**
 * Helper function to escape HTML special characters in user-provided content.
 */
function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, char => htmlEscapes[char] || char);
}

/**
 * Convenience function to get template by key.
 */
export function getTemplate<K extends TemplateKey>(key: K): { subject: string; html: string } {
  const template = templates[key];
  // Return placeholder - caller should use specific template methods
  return {
    subject: template.subject,
    html: '',
  };
}
