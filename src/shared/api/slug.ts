/**
 * Slug generation utilities for SEO-friendly URLs
 */

// Adjectives for random word slugs
const ADJECTIVES = [
  'brave',
  'calm',
  'eager',
  'gentle',
  'happy',
  'jolly',
  'kind',
  'lively',
  'merry',
  'nice',
  'proud',
  'quick',
  'smart',
  'sweet',
  'warm',
  'wise',
  'bold',
  'cool',
  'eager',
  'fair',
  'free',
  'good',
  'bold',
  'calm',
  'bright',
  'clean',
  'dry',
  'easy',
  'fast',
  'fine',
  'fresh',
  'gold',
  'green',
  'happy',
  'light',
  'new',
  'open',
  'peace',
  'quiet',
  'rich',
  'safe',
  'soft',
  'strong',
  'tall',
  'warm',
  'young',
  'clear',
  'happy',
];

// Nouns for random word slugs
const NOUNS = [
  'water',
  'sky',
  'sun',
  'moon',
  'star',
  'cloud',
  'tree',
  'flower',
  'forest',
  'mountain',
  'river',
  'ocean',
  'beach',
  'garden',
  'field',
  'bird',
  'fish',
  'lion',
  'bear',
  'wolf',
  'fox',
  'rabbit',
  'deer',
  'horse',
  'cat',
  'dog',
  'mouse',
  'butterfly',
  'dragonfly',
  'bee',
  'apple',
  'orange',
  'grape',
  'lemon',
  'peach',
  'plum',
  'cherry',
  'book',
  'song',
  'dance',
  'art',
  'rain',
  'snow',
  'wind',
  'fire',
  'stone',
  'leaf',
  'seed',
  'spring',
  'summer',
  'autumn',
  'winter',
];

/**
 * Generate a random word slug (e.g., "brave-blue-water")
 * @param parts - Number of words (default 3)
 * @returns SEO-friendly slug string
 */
export function generateWordSlug(parts: number = 3): string {
  const words: string[] = [];

  // First word is always an adjective
  const adj1 = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  words.push(adj1);

  // If 3+ parts, add color
  if (parts >= 3) {
    const colors = [
      'blue',
      'green',
      'red',
      'gold',
      'silver',
      'purple',
      'pink',
      'white',
      'black',
      'brown',
    ];
    words.push(colors[Math.floor(Math.random() * colors.length)]);
  }

  // Second word is always a noun
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  words.push(noun);

  // If more than 3 parts, add another adjective
  if (parts > 3) {
    const adj2 = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    words.push(adj2);
  }

  return words.join('-');
}

/**
 * Generate a name-based slug from a user's name (e.g., "sarah-johnson")
 * @param name - User's full name or first name
 * @param maxLength - Maximum length for the slug (default 50)
 * @returns URL-safe slug
 */
export function generateNameSlug(name: string, maxLength: number = 50): string {
  // Normalize: lowercase, replace spaces/special chars with hyphens
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars except hyphen
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens
    .replace(/^-|-$/g, ''); // Trim leading/trailing hyphens

  // Truncate if too long
  if (slug.length > maxLength) {
    return slug.substring(0, maxLength).replace(/-[^-]*$/, '');
  }

  return slug;
}

/**
 * Generate a name slug with random suffix (e.g., "sarah-johnson-k8m2")
 * @param name - User's full name
 * @returns Unique slug with random suffix
 */
export function generateUniqueNameSlug(name: string): string {
  const nameSlug = generateNameSlug(name);
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${nameSlug}-${suffix}`;
}

/**
 * Generate a hybrid slug (name + random word, e.g., "sarah-johnson-river")
 * @param name - User's name
 * @returns Hybrid slug
 */
export function generateHybridSlug(name: string): string {
  const nameSlug = generateNameSlug(name);
  const randomWord = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${nameSlug}-${randomWord}`;
}

/**
 * Main slug generator - returns best format for profile URLs
 * @param name - User's name (optional, for name-based slug)
 * @param useName - Whether to include name in slug (default true)
 * @returns SEO-friendly profile slug
 */
export function generateProfileSlug(name?: string): string {
  if (name && name.trim().length > 0) {
    return generateUniqueNameSlug(name);
  }
  // Fallback to random word slug
  return generateWordSlug(3);
}

/**
 * Check if a slug is valid format
 * @param slug - Slug to validate
 * @returns true if valid URL-safe slug
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}
