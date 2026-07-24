const DECIMAL_DIGIT = /^\p{Nd}$/u;

/**
 * Maps a single Unicode decimal digit character (General_Category `Nd`) to its
 * numeric value `0`–`9`, regardless of numbering system — ASCII `'0'`–`'9'`,
 * Arabic-Indic, Devanagari, Bengali, Thai, fullwidth, and so on. Returns `null`
 * for anything that is not exactly one decimal digit, including multi-character
 * keys (`'Enter'`, `'ArrowUp'`), the empty string, and non-digit characters.
 */
export function unicodeDigitValue(char: string): number | null {
  if (!DECIMAL_DIGIT.test(char)) {
    return null;
  }
  const code = char.codePointAt(0)!;
  if (code >= 0x30 && code <= 0x39) {
    return code - 0x30;
  }
  let value = 0;
  for (let c = code - 1; value < 9 && DECIMAL_DIGIT.test(String.fromCodePoint(c)); c--) {
    value++;
  }
  return value;
}
