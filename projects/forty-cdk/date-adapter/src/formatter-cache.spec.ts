import { createFormatterCache } from './formatter-cache';

describe('createFormatterCache', () => {
  it('returns the same Intl.DateTimeFormat instance for identical locale and options', () => {
    const cache = createFormatterCache();
    expect(cache('en-US', { month: 'long' })).toBe(cache('en-US', { month: 'long' }));
  });

  it('returns a different instance for a different locale', () => {
    const cache = createFormatterCache();
    const options: Intl.DateTimeFormatOptions = { month: 'long' };
    expect(cache('en-US', options)).not.toBe(cache('fr-FR', options));
  });

  it('returns a different instance for different options', () => {
    const cache = createFormatterCache();
    expect(cache('en-US', { month: 'long' })).not.toBe(cache('en-US', { month: '2-digit' }));
  });

  it('formats in the Gregorian calendar unless the options name another', () => {
    const cache = createFormatterCache();

    expect(cache('th-TH', { year: 'numeric' }).resolvedOptions().calendar).toBe('gregory');
    expect(cache('fa-IR', { month: 'long' }).resolvedOptions().calendar).toBe('gregory');
    expect(
      cache('th-TH', { year: 'numeric', calendar: 'buddhist' }).resolvedOptions().calendar,
    ).toBe('buddhist');
  });

  it('treats an omitted locale as its own stable key', () => {
    const cache = createFormatterCache();
    const options: Intl.DateTimeFormatOptions = { month: 'long' };
    expect(cache(undefined, options)).toBe(cache(undefined, options));
  });
});
