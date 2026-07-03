import { localeSeparators, parseLocaleNumber, type LocaleSeparators } from './locale-number';

const EN: LocaleSeparators = { group: ',', decimal: '.' };
const DE: LocaleSeparators = { group: '.', decimal: ',' };

describe('localeSeparators', () => {
  it('derives comma group / dot decimal for en-US', () => {
    expect(localeSeparators('en-US')).toEqual({ group: ',', decimal: '.' });
  });

  it('derives dot group / comma decimal for de-DE', () => {
    expect(localeSeparators('de-DE')).toEqual({ group: '.', decimal: ',' });
  });

  it('derives a narrow no-break space group for fr-FR', () => {
    const { group, decimal } = localeSeparators('fr-FR');
    expect(/^[    ]$/.test(group)).toBe(true);
    expect(decimal).toBe(',');
  });

  it('falls back to comma / dot for an undefined locale', () => {
    const { group, decimal } = localeSeparators(undefined);
    expect(typeof group).toBe('string');
    expect(typeof decimal).toBe('string');
  });
});

describe('parseLocaleNumber', () => {
  it('parses a plain integer', () => {
    expect(parseLocaleNumber('42', EN)).toBe(42);
  });

  it('parses a plain decimal', () => {
    expect(parseLocaleNumber('3.14', EN)).toBe(3.14);
  });

  it('parses a signed value', () => {
    expect(parseLocaleNumber('-7', EN)).toBe(-7);
    expect(parseLocaleNumber('+7', EN)).toBe(7);
  });

  it('parses a negative formatted with U+2212 MINUS SIGN', () => {
    expect(parseLocaleNumber('−7', EN)).toBe(-7);
    expect(parseLocaleNumber('−3.14', EN)).toBe(-3.14);
  });

  it('parses a grouped negative formatted with U+2212 MINUS SIGN', () => {
    expect(parseLocaleNumber('−1,234', EN)).toBe(-1234);
  });

  it('parses a negative formatted with U+FF0D FULLWIDTH HYPHEN-MINUS', () => {
    expect(parseLocaleNumber('－7', EN)).toBe(-7);
  });

  it('round-trips a library-formatted negative in an sv-SE-style locale', () => {
    const sv = localeSeparators('sv-SE');
    const formatted = new Intl.NumberFormat('sv-SE').format(-1234.5);
    expect(parseLocaleNumber(formatted, sv)).toBe(-1234.5);
  });

  it('returns null for empty / whitespace-only text', () => {
    expect(parseLocaleNumber('', EN)).toBeNull();
    expect(parseLocaleNumber('   ', EN)).toBeNull();
  });

  it('returns null for non-numeric text', () => {
    expect(parseLocaleNumber('abc', EN)).toBeNull();
  });

  it('parses a decimal in a comma-decimal locale', () => {
    expect(parseLocaleNumber('1.234,5', DE)).toBe(1234.5);
  });

  it('parses a correctly grouped integer', () => {
    expect(parseLocaleNumber('1,234,567', EN)).toBe(1234567);
  });

  it('rejects a misgrouped integer instead of collapsing it', () => {
    expect(parseLocaleNumber('1,2,3', EN)).toBeNull();
  });

  it('rejects a group separator in the fractional part', () => {
    expect(parseLocaleNumber('1.23,4', EN)).toBeNull();
  });

  it('rejects exponent notation rather than silently parsing it', () => {
    expect(parseLocaleNumber('2e3', EN)).toBeNull();
    expect(parseLocaleNumber('1e5', EN)).toBeNull();
  });

  it('rejects multiple signs', () => {
    expect(parseLocaleNumber('+-5', EN)).toBeNull();
  });

  it('rejects multiple decimals', () => {
    expect(parseLocaleNumber('1.2.3', EN)).toBeNull();
  });

  it('strips currency and percent noise around a value', () => {
    expect(parseLocaleNumber('$1,234.50', EN)).toBe(1234.5);
    expect(parseLocaleNumber('50%', EN)).toBe(50);
  });

  it('parses a space-grouped integer typed with ASCII spaces in an NBSP-grouping locale', () => {
    const frSeparators = localeSeparators('fr-FR');
    expect(parseLocaleNumber('1 234 567', frSeparators)).toBe(1234567);
  });
});
