import { resolveConfigClass } from './resolve-config-class';

describe('resolveConfigClass', () => {
  it('returns null when neither class nor classList is set', () => {
    expect(resolveConfigClass({})).toBeNull();
  });

  it('returns a single class verbatim', () => {
    expect(resolveConfigClass({ class: 'ds-toast' })).toBe('ds-toast');
  });

  it('splits a multi-token class string', () => {
    expect(resolveConfigClass({ class: 'ds-toast ds-toast--compact' })).toBe(
      'ds-toast ds-toast--compact',
    );
  });

  it('accepts classList as a space-separated string', () => {
    expect(resolveConfigClass({ classList: 'a b c' })).toBe('a b c');
  });

  it('accepts classList as an array', () => {
    expect(resolveConfigClass({ classList: ['a', 'b', 'c'] })).toBe('a b c');
  });

  it('splits multi-token entries inside a classList array', () => {
    expect(resolveConfigClass({ classList: ['a b', 'c'] })).toBe('a b c');
  });

  it('merges class and classList', () => {
    expect(resolveConfigClass({ class: 'a', classList: ['b', 'c'] })).toBe('a b c');
  });

  it('de-duplicates tokens across class and classList, preserving first-seen order', () => {
    expect(resolveConfigClass({ class: 'a b', classList: ['b', 'c', 'a'] })).toBe('a b c');
  });

  it('drops empty tokens from leading / trailing / repeated whitespace', () => {
    expect(resolveConfigClass({ class: '  a   b  ' })).toBe('a b');
  });

  it('returns null for a whitespace-only class', () => {
    expect(resolveConfigClass({ class: '   ' })).toBeNull();
  });

  it('returns null for an empty class string', () => {
    expect(resolveConfigClass({ class: '' })).toBeNull();
  });

  it('returns null for an empty classList array', () => {
    expect(resolveConfigClass({ classList: [] })).toBeNull();
  });

  it('ignores empty entries inside a classList array', () => {
    expect(resolveConfigClass({ classList: ['', 'a', '  '] })).toBe('a');
  });
});
