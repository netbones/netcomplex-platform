import { pgEnum } from 'drizzle-orm/pg-core';

export const invoiceStatusEnum = pgEnum('InvoiceStatus', ['PENDING', 'PAID', 'VOID']);