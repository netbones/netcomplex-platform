export const templates = {
  verifyEmail: {
    subject: (tenantName = 'Netcomplex') => `Verify your ${escapeHtml(tenantName)} email`,
    getHtml: (name: string, verificationUrl: string, tenantName = 'Netcomplex') => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #4F46E5; margin: 0;">${escapeHtml(tenantName)}</h1>
  </div>

  <h2 style="color: #1f2937;">Verify your email address</h2>

  <p style="margin: 20px 0;">Hi${name ? `, ${escapeHtml(name)}` : ''}!</p>

  <p style="margin: 20px 0;">Thank you for signing up to ${escapeHtml(tenantName)}. Please verify your email address by clicking the button below:</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${verificationUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a>
  </div>

  <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <p style="margin: 0; color: #92400e; font-size: 14px;">
      <strong>\u26a0\ufe0f Important:</strong> This link expires in 1 hour for security reasons.
    </p>
  </div>

  <p style="color: #6b7280; font-size: 14px;">If you didn't create an account with ${escapeHtml(tenantName)}, please ignore this email.</p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    &copy; ${new Date().getFullYear()} ${escapeHtml(tenantName)}. All rights reserved.
  </p>
</body>
</html>
`,
  },

  welcome: {
    subject: (tenantName = 'Netcomplex') => `Welcome to ${escapeHtml(tenantName)}!`,
    getHtml: (name: string, tenantName = 'Netcomplex') => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${escapeHtml(tenantName)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #4F46E5; margin: 0;">${escapeHtml(tenantName)}</h1>
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
    &copy; ${new Date().getFullYear()} ${escapeHtml(tenantName)}. All rights reserved.
  </p>
</body>
</html>
`,
  },

  passwordReset: {
    subject: (tenantName = 'Netcomplex') => `Reset your ${escapeHtml(tenantName)} password`,
    getHtml: (resetUrl: string, tenantName = 'Netcomplex') => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #4F46E5; margin: 0;">${escapeHtml(tenantName)}</h1>
  </div>

  <h2 style="color: #1f2937;">Password Reset Request</h2>

  <p style="margin: 20px 0;">You requested to reset your password. Click the button below to create a new password:</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${resetUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
  </div>

  <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <p style="margin: 0; color: #92400e; font-size: 14px;">
      <strong>\u26a0\ufe0f Important:</strong> This link expires in 1 hour for security reasons.
    </p>
  </div>

  <p style="color: #6b7280; font-size: 14px;">If you didn't request this password reset, please ignore this email. Your account security is important to us.</p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    &copy; ${new Date().getFullYear()} ${escapeHtml(tenantName)}. All rights reserved.
  </p>
</body>
</html>
`,
  },

  emailNotification: {
    subject: (tenantName = 'Netcomplex') => `New notification from ${escapeHtml(tenantName)}`,
    getHtml: (title: string, message: string, tenantName = 'Netcomplex') => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #4F46E5; margin: 0;">${escapeHtml(tenantName)}</h1>
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
    &copy; ${new Date().getFullYear()} ${escapeHtml(tenantName)}. All rights reserved.
  </p>
</body>
</html>
`,
  },

  securityAlert: {
    subject: 'Security Alert: Sign-up attempt with your email',
    getHtml: (email: string, tenantName = 'Netcomplex') => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Alert</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #4F46E5; margin: 0;">${escapeHtml(tenantName)}</h1>
  </div>

  <h2 style="color: #dc2626;">Security Alert</h2>

  <p style="margin: 20px 0;">Hello,</p>

  <p style="margin: 20px 0;">A sign-up attempt was recently made for ${escapeHtml(tenantName)} using your email address (<strong>${escapeHtml(email)}</strong>). Since you already have an account, this attempt was blocked.</p>

  <p style="margin: 20px 0;">If this was you, you can simply log in to your existing account. If this wasn't you, someone may have tried to use your email address to create a duplicate account. Your account remains secure, and no action is required.</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="https://soralia.co.za/login" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Login to your account</a>
  </div>

  <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
    For your security, we recommend never sharing your password and enabling two-factor authentication if you haven't already.
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    &copy; ${new Date().getFullYear()} ${escapeHtml(tenantName)}. All rights reserved.
  </p>
</body>
</html>
`,
  },

  passwordResetOtp: {
    subject: (tenantName = 'Netcomplex') => `Your ${escapeHtml(tenantName)} password reset code`,
    getHtml: (otp: string, tenantName = 'Netcomplex') => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #4F46E5; margin: 0;">${escapeHtml(tenantName)}</h1>
  </div>

  <h2 style="color: #1f2937;">Password Reset Code</h2>

  <p style="margin: 20px 0;">You requested to reset your password. Use the code below to verify your identity:</p>

  <div style="text-align: center; margin: 30px 0;">
    <span style="background: #F3F4F6; color: #1F2937; font-size: 32px; font-weight: bold; font-family: 'Courier New', monospace; padding: 16px 24px; border-radius: 8px; letter-spacing: 8px; display: inline-block; border: 2px dashed #D1D5DB;">
      ${escapeHtml(otp)}
    </span>
  </div>

  <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <p style="margin: 0; color: #92400e; font-size: 14px;">
      <strong>\u26a0\ufe0f Important:</strong> This code expires in 5 minutes.
    </p>
  </div>

  <p style="color: #6b7280; font-size: 14px;">If you didn't request this password reset, please ignore this email. Your account security is important to us.</p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    &copy; ${new Date().getFullYear()} ${escapeHtml(tenantName)}. All rights reserved.
  </p>
</body>
</html>
`,
  },

  teamInvitation: {
    subject: (tenantName = 'Netcomplex') =>
      `You have been invited to join ${escapeHtml(tenantName)}`,
    getHtml: (
      inviteeName: string,
      inviterName: string,
      communityName: string,
      acceptUrl: string,
      role: string,
      tenantName = 'Netcomplex'
    ) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #4F46E5; margin: 0;">${escapeHtml(tenantName)}</h1>
  </div>

  <h2 style="color: #1f2937;">You've been invited to join ${escapeHtml(communityName)}</h2>

  <p style="margin: 20px 0;">Hi${inviteeName ? `, ${escapeHtml(inviteeName)}` : ''}!</p>

  <p style="margin: 20px 0;"><strong>${escapeHtml(inviterName)}</strong> has invited you to join <strong>${escapeHtml(communityName)}</strong> as a <strong>${escapeHtml(role)}</strong>.</p>

  <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #1f2937;">What you can do as a ${escapeHtml(role)}:</h3>
    <ul style="margin: 0; padding-left: 20px;">
      <li>Access the community portal</li>
      <li>Connect with community members</li>
      <li>View community announcements and events</li>
      ${role === 'ADMIN' || role === 'BOARD' || role === 'MANAGER' ? '<li>Manage community settings and content</li>' : ''}
    </ul>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${acceptUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a>
  </div>

  <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <p style="margin: 0; color: #92400e; font-size: 14px;">
      <strong>\u26a0\ufe0f Important:</strong> This invitation expires in 7 days.
    </p>
  </div>

  <p style="color: #6b7280; font-size: 14px;">If you didn't expect this invitation, please ignore this email.</p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    &copy; ${new Date().getFullYear()} ${escapeHtml(tenantName)}. All rights reserved.
  </p>
</body>
</html>
`,
  },
} as const;

export type TemplateKey = keyof typeof templates;

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
