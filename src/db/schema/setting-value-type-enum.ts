import { pgEnum } from 'drizzle-orm/pg-core';

export const settingValueTypeEnum = pgEnum('SettingValueType', ['STRING', 'NUMBER', 'BOOLEAN', 'JSON']);