import { describe, expect, it } from 'vitest';

import { formatCents, parseToCents } from '@/utils/money';

// Intl inserts a non-breaking space between the symbol and the amount
// depending on ICU version — normalize it so assertions don't depend on
// that environment detail.
function normalizeSpaces(value: string): string {
  return value.replace(/\s/g, ' ');
}

describe('formatCents', () => {
  it('formats 350 cents as €3.50', () => {
    expect(normalizeSpaces(formatCents(350))).toBe('€ 3,50');
  });

  it('formats 1299 cents as €12.99', () => {
    expect(normalizeSpaces(formatCents(1299))).toBe('€ 12,99');
  });

  it('formats 0 cents as a genuine €0.00, not a blank string', () => {
    expect(normalizeSpaces(formatCents(0))).toBe('€ 0,00');
  });
});

describe('parseToCents', () => {
  it('parses a comma-decimal amount', () => {
    expect(parseToCents('3,50')).toBe(350);
  });

  it('parses a dot-decimal amount', () => {
    expect(parseToCents('12.99')).toBe(1299);
  });

  it('rounds fractional cents from float imprecision', () => {
    expect(parseToCents('0.1')).toBe(10);
  });

  it('returns null for empty input', () => {
    expect(parseToCents('  ')).toBeNull();
  });

  it('returns null for a negative amount', () => {
    expect(parseToCents('-5')).toBeNull();
  });

  it('returns null for non-numeric input', () => {
    expect(parseToCents('abc')).toBeNull();
  });
});
