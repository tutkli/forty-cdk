import { unicodeDigitValue } from './unicode-digit';

describe('unicodeDigitValue', () => {
  it.each([
    ['0', 0],
    ['1', 1],
    ['2', 2],
    ['3', 3],
    ['4', 4],
    ['5', 5],
    ['6', 6],
    ['7', 7],
    ['8', 8],
    ['9', 9],
  ])('maps ASCII %s to %i', (char, expected) => {
    expect(unicodeDigitValue(char)).toBe(expected);
  });

  it.each([
    ['arab', '٠', '٥', '٩'],
    ['arabext', '۰', '۵', '۹'],
    ['deva', '०', '५', '९'],
    ['beng', '০', '৫', '৯'],
    ['thai', '๐', '๕', '๙'],
    ['fullwidth', '０', '５', '９'],
  ])('maps %s digits 0/5/9 to their values', (_system, zero, five, nine) => {
    expect(unicodeDigitValue(zero)).toBe(0);
    expect(unicodeDigitValue(five)).toBe(5);
    expect(unicodeDigitValue(nine)).toBe(9);
  });

  it.each([['a'], ['A'], ['/'], ['.'], [' '], ['-'], [''], ['Enter'], ['ArrowUp'], ['12']])(
    'returns null for non-digit key %o',
    (key) => {
      expect(unicodeDigitValue(key)).toBeNull();
    },
  );
});
