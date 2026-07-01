import { pgEnum } from 'drizzle-orm/pg-core';

export const walletStatusEnum = pgEnum('WalletStatus', ['ACTIVE', 'FROZEN', 'CLOSED']);