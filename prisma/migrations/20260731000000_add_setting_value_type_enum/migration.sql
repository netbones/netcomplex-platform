-- CreateEnum
CREATE TYPE "SettingValueType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON');

-- AlterTable
ALTER TABLE "Setting" ADD COLUMN "type" "SettingValueType" NOT NULL DEFAULT 'STRING';
