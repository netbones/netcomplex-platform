/**
 * Sanitise dispute description for AI intake (POPIA compliance).
 * Strips surnames, unit numbers, phone numbers, and email addresses
 * before sending text to external AI providers.
 *
 * @param description - Raw dispute description from user input
 * @returns Sanitised description safe for AI processing
 */
export function sanitizeDescriptionForAi(description: string): string {
  let sanitised = description;

  // Pattern 1: Strip unit/house numbers
  // Matches: "Unit 42", "House 12", "Apartment 3B", "Suite 100", "Apt 7C", "Flat 8", "#180"
  sanitised = sanitised.replace(
    /\b(Unit|House|Apartment|Suite|Apt|Flat|#)\s*[0-9A-Za-z-]+\b/gi,
    '[ADDRESS]'
  );

  // Pattern 2: Strip common name prefixes (Mr/Mrs/Ms/Miss/Dr/Prof) followed by optional
  // lowercase connector words (van, der, den, etc.) and a capitalised surname.
  // Handles: "Mr. van der Merwe", "Dr Smith", "Mrs Jones", "Ms. Ndlovu", "Prof Botha"
  sanitised = sanitised.replace(
    /\b(?:Mr|Mrs|Ms|Miss|Dr|Prof)\.?\s+(?:[a-z]+\s+)*[A-Z][a-z]+\b/g,
    '[NAME]'
  );

  // Pattern 3: Strip South African phone numbers
  // Format 1: local with spaces — "083 123 4567"
  sanitised = sanitised.replace(/\b0\d{2}\s+\d{3}\s+\d{4}\b/g, '[PHONE]');
  // Format 2: international with spaces — "+27 83 123 4567"
  sanitised = sanitised.replace(/\+\s*27\s+\d{2}\s+\d{3}\s+\d{4}\b/g, '[PHONE]');
  // Format 3: plain digits without spaces — "+27831234567" or "0831234567"
  sanitised = sanitised.replace(/(?:\+27|0)\d{9}(?!\d)/g, '[PHONE]');

  // Pattern 4: Strip email addresses
  // Matches standard email patterns like "test@example.com", "user.name+tag@domain.co.za"
  sanitised = sanitised.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[EMAIL]');

  return sanitised;
}
