import { findTypeaheadMatch, foldTypeaheadText } from './match-options';

interface FakeOption {
  readonly text: string;
  readonly disabled?: boolean;
}

function match(
  options: readonly FakeOption[],
  query: { buffer: string; repeated?: boolean; anchorIndex?: number },
): FakeOption | null {
  return findTypeaheadMatch(
    options,
    {
      buffer: query.buffer,
      repeated: query.repeated ?? false,
      anchorIndex: query.anchorIndex ?? -1,
    },
    (o) => o.text,
    (o) => o.disabled === true,
  );
}

const FRUITS: readonly FakeOption[] = [
  { text: 'Apple' },
  { text: 'Apricot' },
  { text: 'Banana' },
  { text: 'Cherry' },
];

describe('findTypeaheadMatch', () => {
  it('returns null for an empty buffer', () => {
    expect(match(FRUITS, { buffer: '' })).toBeNull();
  });

  it('returns null for an empty option list', () => {
    expect(match([], { buffer: 'a' })).toBeNull();
  });

  it('prefix-matches case-insensitively from the top when unanchored', () => {
    expect(match(FRUITS, { buffer: 'ba' })).toBe(FRUITS[2]);
    expect(match(FRUITS, { buffer: 'BA' })).toBe(FRUITS[2]);
  });

  it('matches the first option for a multi-character prefix shared by several', () => {
    expect(match(FRUITS, { buffer: 'ap' })).toBe(FRUITS[0]);
  });

  it('trims the option text before matching', () => {
    const padded: readonly FakeOption[] = [{ text: '   Mango  ' }];
    expect(match(padded, { buffer: 'man' })).toBe(padded[0]);
  });

  it('skips disabled options', () => {
    const options: readonly FakeOption[] = [{ text: 'Apple', disabled: true }, { text: 'Apricot' }];
    expect(match(options, { buffer: 'ap' })).toBe(options[1]);
  });

  it('returns null when nothing matches', () => {
    expect(match(FRUITS, { buffer: 'z' })).toBeNull();
  });

  describe('repeated single-character cycling', () => {
    it('steps to the next same-initial option after the anchor', () => {
      expect(match(FRUITS, { buffer: 'aa', repeated: true, anchorIndex: 0 })).toBe(FRUITS[1]);
    });

    it('wraps around to the first same-initial option', () => {
      expect(match(FRUITS, { buffer: 'aa', repeated: true, anchorIndex: 1 })).toBe(FRUITS[0]);
    });

    it('starts at the top when unanchored', () => {
      expect(match(FRUITS, { buffer: 'a', repeated: true, anchorIndex: -1 })).toBe(FRUITS[0]);
    });

    it('skips disabled options while cycling', () => {
      const options: readonly FakeOption[] = [
        { text: 'Apple' },
        { text: 'Apricot', disabled: true },
        { text: 'Avocado' },
      ];
      expect(match(options, { buffer: 'aa', repeated: true, anchorIndex: 0 })).toBe(options[2]);
    });
  });

  describe('multi-character prefix anchoring', () => {
    it('keeps the current option when its text still matches the growing prefix', () => {
      expect(match(FRUITS, { buffer: 'apr', repeated: false, anchorIndex: 1 })).toBe(FRUITS[1]);
    });

    it('scans forward from the anchor (inclusive) and wraps', () => {
      const options: readonly FakeOption[] = [
        { text: 'Cherry' },
        { text: 'Apple' },
        { text: 'Apricot' },
      ];
      expect(match(options, { buffer: 'ap', repeated: false, anchorIndex: 2 })).toBe(options[2]);
    });
  });

  describe('diacritics-insensitive matching (issue #1145 item 9)', () => {
    const ACCENTED: readonly FakeOption[] = [{ text: 'Évora' }, { text: 'Madrid' }];

    it('matches an accented option from an unaccented query', () => {
      expect(match(ACCENTED, { buffer: 'e' })).toBe(ACCENTED[0]);
      expect(match(ACCENTED, { buffer: 'evora' })).toBe(ACCENTED[0]);
    });

    it('matches an unaccented option from an accented query', () => {
      const options: readonly FakeOption[] = [{ text: 'Evora' }];
      expect(match(options, { buffer: 'é' })).toBe(options[0]);
    });

    it('matches an accented option across an accent mismatch', () => {
      const options: readonly FakeOption[] = [{ text: 'Café' }, { text: 'Cabernet' }];
      expect(match(options, { buffer: 'cafe' })).toBe(options[0]);
      expect(match(options, { buffer: 'caf' })).toBe(options[0]);
    });
  });
});

describe('foldTypeaheadText', () => {
  it('strips diacritics and lowercases', () => {
    expect(foldTypeaheadText('Évora')).toBe('evora');
    expect(foldTypeaheadText('Café')).toBe('cafe');
    expect(foldTypeaheadText('Ñandú')).toBe('nandu');
    expect(foldTypeaheadText('ÜBER')).toBe('uber');
  });

  it('leaves unaccented text lowercased', () => {
    expect(foldTypeaheadText('Banana')).toBe('banana');
  });
});
