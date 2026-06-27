interface BookingConfirmationParams {
  serviceName: string;
  providerName: string;
  date: string;
  time: string;
  price: string;
  serviceImage?: string;
  listingUrl: string;
}

export function getBookingConfirmationHtml(params: BookingConfirmationParams): string {
  const imageHtml = params.serviceImage
    ? `<img src="${params.serviceImage}" alt="${params.serviceName}" style="max-width:100%;border-radius:8px;margin-bottom:16px;" />`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed – Soralia Village</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F3F4F6; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
    <div style="text-align: center; padding: 24px 0;">
      <h1 style="color: #4F46E5; font-size: 24px; margin: 0;">Soralia Village</h1>
    </div>

    <div style="background-color: #FFFFFF; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      ${imageHtml}
      <h2 style="color: #111827; font-size: 20px; margin: 0 0 8px 0;">Booking Confirmed!</h2>
      <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
        Your booking with <strong>${params.providerName}</strong> has been confirmed.
      </p>

      <div style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <table style="width:100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 12px; color: #6B7280; font-size: 14px;">Service</td>
            <td style="padding: 8px 12px; color: #111827; font-size: 14px; font-weight: 600;">${params.serviceName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; color: #6B7280; font-size: 14px;">Provider</td>
            <td style="padding: 8px 12px; color: #111827; font-size: 14px;">${params.providerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; color: #6B7280; font-size: 14px;">Date</td>
            <td style="padding: 8px 12px; color: #111827; font-size: 14px;">${params.date}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; color: #6B7280; font-size: 14px;">Time</td>
            <td style="padding: 8px 12px; color: #111827; font-size: 14px;">${params.time}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; color: #6B7280; font-size: 14px;">Price</td>
            <td style="padding: 8px 12px; color: #111827; font-size: 14px; font-weight: 600;">${params.price}</td>
          </tr>
        </table>
      </div>

      <a href="${params.listingUrl}" style="display: inline-block; background-color: #4F46E5; color: #FFFFFF; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">View Booking</a>
    </div>

    <div style="text-align: center; padding: 24px 0; color: #9CA3AF; font-size: 12px;">
      <p>This is an automated message from Soralia Village. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`;
}

interface InquiryReceivedParams {
  serviceName: string;
  providerName: string;
  inquirerName: string;
  message?: string;
  listingUrl: string;
}

export function getInquiryReceivedHtml(params: InquiryReceivedParams): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Inquiry – Soralia Village</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F3F4F6; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
    <div style="text-align: center; padding: 24px 0;">
      <h1 style="color: #4F46E5; font-size: 24px; margin: 0;">Soralia Village</h1>
    </div>

    <div style="background-color: #FFFFFF; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h2 style="color: #111827; font-size: 20px; margin: 0 0 8px 0;">New Inquiry Received</h2>
      <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
        <strong>${params.inquirerName}</strong> has sent an inquiry about your service <strong>"${params.serviceName}"</strong>.
      </p>

      ${
        params.message
          ? `<div style="background-color: #F9FAFB; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="color: #374151; font-size: 14px; line-height: 1.5; margin: 0; font-style: italic;">"${params.message}"</p>
      </div>`
          : ''
      }

      <a href="${params.listingUrl}" style="display: inline-block; background-color: #4F46E5; color: #FFFFFF; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">View Inquiry</a>
    </div>

    <div style="text-align: center; padding: 24px 0; color: #9CA3AF; font-size: 12px;">
      <p>This is an automated message from Soralia Village. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`;
}

interface PaymentReceivedParams {
  serviceName: string;
  amount: string;
  transactionId: string;
  listingUrl: string;
}

export function getPaymentReceivedHtml(params: PaymentReceivedParams): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Received – Soralia Village</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F3F4F6; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
    <div style="text-align: center; padding: 24px 0;">
      <h1 style="color: #4F46E5; font-size: 24px; margin: 0;">Soralia Village</h1>
    </div>

    <div style="background-color: #FFFFFF; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h2 style="color: #111827; font-size: 20px; margin: 0 0 8px 0;">Payment Received</h2>
      <p style="color: #374151; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
        A payment of <strong>${params.amount}</strong> has been received for <strong>"${params.serviceName}"</strong>.
      </p>

      <div style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <table style="width:100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 12px; color: #6B7280; font-size: 14px;">Service</td>
            <td style="padding: 8px 12px; color: #111827; font-size: 14px; font-weight: 600;">${params.serviceName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; color: #6B7280; font-size: 14px;">Amount</td>
            <td style="padding: 8px 12px; color: #111827; font-size: 14px; font-weight: 600;">${params.amount}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; color: #6B7280; font-size: 14px;">Transaction ID</td>
            <td style="padding: 8px 12px; color: #111827; font-size: 14px;">${params.transactionId}</td>
          </tr>
        </table>
      </div>

      <a href="${params.listingUrl}" style="display: inline-block; background-color: #4F46E5; color: #FFFFFF; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">View Listing</a>
    </div>

    <div style="text-align: center; padding: 24px 0; color: #9CA3AF; font-size: 12px;">
      <p>This is an automated message from Soralia Village. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`;
}
