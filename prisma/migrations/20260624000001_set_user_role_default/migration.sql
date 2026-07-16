-- Set USER as the default role for new users.
-- Split from 20260624000000_add_user_role_and_seat_lifecycle because PostgreSQL
-- requires a new enum value (added via ALTER TYPE ADD VALUE) to be committed
-- before it can be referenced. Keeping both in one migration breaks the
-- shadow-database replay with P3006 ("unsafe use of new value").
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'USER';
