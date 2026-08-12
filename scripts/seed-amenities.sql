-- Seed data for amenities (Soralia Village tenant)
-- Table: "Amenity" (camelCase columns, matching Prisma schema)

-- Tennis Court
INSERT INTO "Amenity" ("id", "tenantId", "name", "description", "icon", "photoUrl", "hoursOpen", "hoursClose", "bookable", "contactEnabled", "contactPhone", "maxOccupancy", "slotDurationMins", "rulesText", "waitlistEnabled", "sortOrder", "active", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '0a0ed28d-6d2a-42d7-907f-fd6ea3d998da',
  'Tennis court',
  'Full-sized tennis court with floodlights for evening play.',
  'tennis',
  NULL,
  '06:00',
  '21:30',
  true,
  true,
  '+27123456789',
  4,
  60,
  'Bring your own racket and balls. Court shoes required.',
  false,
  0,
  true,
  NOW(),
  NOW()
);

-- Pool Deck
INSERT INTO "Amenity" ("id", "tenantId", "name", "description", "icon", "photoUrl", "hoursOpen", "hoursClose", "bookable", "contactEnabled", "contactPhone", "maxOccupancy", "slotDurationMins", "rulesText", "waitlistEnabled", "sortOrder", "active", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '0a0ed28d-6d2a-42d7-907f-fd6ea3d998da',
  'Pool deck',
  'Communal swimming pool with sun loungers and umbrellas.',
  'swimming',
  NULL,
  '08:00',
  '18:00',
  true,
  true,
  '+27123456789',
  20,
  60,
  'No glass containers. Children under 12 must be accompanied by an adult.',
  false,
  1,
  true,
  NOW(),
  NOW()
);

-- Visitor Parking (non-bookable)
INSERT INTO "Amenity" ("id", "tenantId", "name", "description", "icon", "photoUrl", "hoursOpen", "hoursClose", "bookable", "contactEnabled", "contactPhone", "maxOccupancy", "slotDurationMins", "rulesText", "waitlistEnabled", "sortOrder", "active", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '0a0ed28d-6d2a-42d7-907f-fd6ea3d998da',
  'Visitor parking',
  'Dedicated visitor parking bays near the entrance.',
  'parking',
  NULL,
  NULL,
  NULL,
  false,
  true,
  '+27123456789',
  NULL,
  NULL,
  'Visitors must register at security. Maximum 24-hour stay.',
  false,
  2,
  true,
  NOW(),
  NOW()
);

-- Braai Area
INSERT INTO "Amenity" ("id", "tenantId", "name", "description", "icon", "photoUrl", "hoursOpen", "hoursClose", "bookable", "contactEnabled", "contactPhone", "maxOccupancy", "slotDurationMins", "rulesText", "waitlistEnabled", "sortOrder", "active", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '0a0ed28d-6d2a-42d7-907f-fd6ea3d998da',
  'Braai area',
  'Communal braai facilities with seating and shade.',
  'fire',
  NULL,
  '10:00',
  '22:00',
  true,
  true,
  '+27123456789',
  12,
  180,
  'Clean grill after use. No fires during fire season. Extinguish coals completely.',
  true,
  3,
  true,
  NOW(),
  NOW()
);
