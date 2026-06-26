/**
 * Tests for dispute PII sanitizer.
 * Plan 106-01 Task 1 — TDD RED phase.
 */
import { describe, it, expect } from 'vitest';
import { sanitizeDescriptionForAi } from '../pii-sanitizer';

describe('sanitizeDescriptionForAi', () => {
  it('strips "Unit 42" → "[ADDRESS]"', () => {
    const input = 'The neighbor in Unit 42 is causing noise.';
    const result = sanitizeDescriptionForAi(input);
    expect(result).not.toContain('Unit 42');
    expect(result).toContain('[ADDRESS]');
  });

  it('strips "House 12" → "[ADDRESS]"', () => {
    const input = 'The resident at House 12 plays loud music.';
    const result = sanitizeDescriptionForAi(input);
    expect(result).not.toContain('House 12');
    expect(result).toContain('[ADDRESS]');
  });

  it('strips "Apt 3B" → "[ADDRESS]"', () => {
    const input = 'In Apt 3B there is a dog barking constantly.';
    const result = sanitizeDescriptionForAi(input);
    expect(result).not.toContain('Apt 3B');
    expect(result).toContain('[ADDRESS]');
  });

  it('strips "Mr. van der Merwe" → "[NAME]"', () => {
    const input = 'Mr. van der Merwe has been parking illegally.';
    const result = sanitizeDescriptionForAi(input);
    expect(result).not.toContain('van der Merwe');
    expect(result).toContain('[NAME]');
  });

  it('strips "Dr Smith" → "[NAME]"', () => {
    const input = 'Dr Smith complained about the fence.';
    const result = sanitizeDescriptionForAi(input);
    expect(result).not.toContain('Smith');
    expect(result).toContain('[NAME]');
  });

  it('strips "Mrs Jones" → "[NAME]"', () => {
    const input = 'Mrs Jones says the tree is overhanging.';
    const result = sanitizeDescriptionForAi(input);
    expect(result).not.toContain('Jones');
    expect(result).toContain('[NAME]');
  });

  it('strips "083 123 4567" → "[PHONE]"', () => {
    const input = 'Call me at 083 123 4567 if there are issues.';
    const result = sanitizeDescriptionForAi(input);
    expect(result).not.toContain('083 123 4567');
    expect(result).toContain('[PHONE]');
  });

  it('strips "+27831234567" → "[PHONE]"', () => {
    const input = 'Contact +27831234567 for follow-up.';
    const result = sanitizeDescriptionForAi(input);
    expect(result).not.toContain('+27831234567');
    expect(result).toContain('[PHONE]');
  });

  it('strips "test@example.com" → "[EMAIL]"', () => {
    const input = 'Email test@example.com for documentation.';
    const result = sanitizeDescriptionForAi(input);
    expect(result).not.toContain('test@example.com');
    expect(result).toContain('[EMAIL]');
  });

  it('strips "user.name+tag@domain.co.za" → "[EMAIL]"', () => {
    const input = 'My email is user.name+tag@domain.co.za for the record.';
    const result = sanitizeDescriptionForAi(input);
    expect(result).not.toContain('user.name+tag@domain.co.za');
    expect(result).toContain('[EMAIL]');
  });

  it('does not modify clean text', () => {
    const input = 'There is a noise complaint about the community hall.';
    const result = sanitizeDescriptionForAi(input);
    expect(result).toBe(input);
  });

  it('handles empty string', () => {
    const result = sanitizeDescriptionForAi('');
    expect(result).toBe('');
  });

  it('strips multiple PII types from composite text', () => {
    const input = 'Mr. Johnson at Unit 5 called 0831234567, email johnson@test.com for details.';
    const result = sanitizeDescriptionForAi(input);
    expect(result).toContain('[NAME]');
    expect(result).toContain('[ADDRESS]');
    expect(result).toContain('[PHONE]');
    expect(result).toContain('[EMAIL]');
    expect(result).not.toContain('Johnson');
    expect(result).not.toContain('Unit 5');
    expect(result).not.toContain('0831234567');
    expect(result).not.toContain('johnson@test.com');
  });
});
