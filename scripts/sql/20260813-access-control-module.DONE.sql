-- Seed platform module for Access Control (run once on existing DBs)
INSERT INTO "PlatformModule" (id, key, label, "defaultEnabled", "minTier")
VALUES (gen_random_uuid()::text, 'accessControl', 'Access Control', true, 'STANDARD')
ON CONFLICT (key) DO NOTHING;
