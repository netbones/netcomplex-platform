import { pgEnum } from 'drizzle-orm/pg-core';

export const paymentGatewayEnum = pgEnum('PaymentGateway', ['PAYSTACK', 'PAYPAL']);