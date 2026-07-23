import { localeSeparators, parseLocaleNumber, type LocaleSeparators } from './locale-number';

const EN: LocaleSeparators = { group: ',', decimal: '.', groupSizes: [3] };
const DE: LocaleSeparators = { group: '.', decimal: ',', groupSizes: [3] };

describe('localeSeparators', () => {
  it('derives comma group / dot decimal for en-US', () => {
    expect(localeSeparators('en-US')).toEqual({ group: ',', decimal: '.', groupSizes: [3] });
  });

  it('derives dot group / comma decimal for de-DE', () => {
    expect(localeSeparators('de-DE')).toEqual({ group: '.', decimal: ',', groupSizes: [3] });
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

  it('derives uniform 3-digit grouping sizes for en-US', () => {
    expect(localeSeparators('en-US').groupSizes).toEqual([3]);
  });

  it('derives Indic lakh grouping sizes [3, 2] for en-IN', () => {
    expect(localeSeparators('en-IN').groupSizes).toEqual([3, 2]);
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

  it('parses Indic lakh-grouped output the library itself produced (#1162)', () => {
    const inSeparators = localeSeparators('en-IN');
    const formatted = new Intl.NumberFormat('en-IN').format(1234567);
    expect(formatted).toBe('12,34,567');
    expect(parseLocaleNumber(formatted, inSeparators)).toBe(1234567);
  });

  it('rejects 3-digit grouping in a lakh-grouping locale', () => {
    const inSeparators = localeSeparators('en-IN');
    expect(parseLocaleNumber('1,234,567', inSeparators)).toBeNull();
  });

  describe('spaced-literal formatOptions in a space-grouping locale (#1174)', () => {
    const fr = localeSeparators('fr-FR');

    it('parses a percent display whose trailing % is space-separated', () => {
      const display = new Intl.NumberFormat('fr-FR', { style: 'percent' }).format(0.51);
      expect(parseLocaleNumber(display, fr)).toBe(51);
    });

    it('parses a trailing-currency display whose symbol is space-separated', () => {
      const display = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
      }).format(6);
      expect(parseLocaleNumber(display, fr)).toBe(6);
    });

    it('normalizes only digit-flanked spaces, so grouping and a trailing literal coexist', () => {
      const display = new Intl.NumberFormat('fr-FR', { style: 'percent' }).format(12.34);
      expect(parseLocaleNumber(display, fr)).toBe(1234);
    });

    it('still normalizes a legitimately space-grouped integer', () => {
      const display = new Intl.NumberFormat('fr-FR').format(1234567);
      expect(parseLocaleNumber(display, fr)).toBe(1234567);
    });
  });

  describe('lenient grouping (mid-edit)', () => {
    it('accepts an over-long trailing group by stripping separators (#1162)', () => {
      expect(parseLocaleNumber('1,2345', EN, { lenientGrouping: true })).toBe(12345);
    });

    it('accepts otherwise-misgrouped digits while typing', () => {
      expect(parseLocaleNumber('1,2,3', EN, { lenientGrouping: true })).toBe(123);
    });

    it('still rejects genuinely non-numeric text in lenient mode', () => {
      expect(parseLocaleNumber('1,2e3', EN, { lenientGrouping: true })).toBeNull();
      expect(parseLocaleNumber('1.2.3', EN, { lenientGrouping: true })).toBeNull();
    });
  });

  describe('lenient numpad-dot promotion in non-dot-decimal locales (#1383)', () => {
    const FR = localeSeparators('fr-FR');

    it('leaves a numpad dot as the decimal in a dot-decimal locale (en-US)', () => {
      expect(parseLocaleNumber('1.5', EN, { lenientGrouping: true })).toBe(1.5);
    });

    it('promotes a lone numpad dot to the decimal separator in de-DE', () => {
      expect(parseLocaleNumber('1.5', DE, { lenientGrouping: true })).toBe(1.5);
    });

    it('promotes a lone numpad dot to the decimal separator in fr-FR', () => {
      expect(parseLocaleNumber('1.5', FR, { lenientGrouping: true })).toBe(1.5);
    });

    it('keeps a dot as a group separator when its trailing run is a legal group size (de-DE)', () => {
      expect(parseLocaleNumber('1.234', DE, { lenientGrouping: true })).toBe(1234);
    });

    it('treats a dot as decimal when its trailing run is not a legal group size (de-DE)', () => {
      expect(parseLocaleNumber('12.34', DE, { lenientGrouping: true })).toBe(12.34);
    });

    it('keeps grouping and a numpad decimal coexisting in de-DE', () => {
      expect(parseLocaleNumber('1.234,5', DE, { lenientGrouping: true })).toBe(1234.5);
    });

    it('promotes a numpad dot alongside space grouping in fr-FR', () => {
      expect(parseLocaleNumber('1 234.5', FR, { lenientGrouping: true })).toBe(1234.5);
    });

    it('does not touch the strict path — a de-DE dot stays a group separator', () => {
      expect(parseLocaleNumber('1.5', DE)).toBeNull();
      expect(parseLocaleNumber('1.234', DE)).toBe(1234);
    });
  });
});
