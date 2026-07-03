/** State of the typeahead buffer at the moment a match is resolved. */
export interface TypeaheadMatchQuery {
  /** The accumulated typeahead buffer. Matched case- and diacritics-insensitively. */
  readonly buffer: string;
  /**
   * Whether the buffer is a single character pressed repeatedly (`"c"`,
   * `"cc"`, …), per `Typeahead.isRepeatedChar()`. When `true` the match cycles
   * to the next same-initial option after `anchorIndex`; when `false` it
   * prefix-matches from `anchorIndex` inclusive (or the top when unanchored).
   */
  readonly repeated: boolean;
  /**
   * Index of the currently-anchored option (the focused / active one), or `-1`
   * when nothing is anchored. The cycle starts just after it; the prefix scan
   * starts at it (clamped to `0`).
   */
  readonly anchorIndex: number;
}

/**
 * Folds text to a case- and diacritics-insensitive form for typeahead
 * matching: decomposes accented characters (`NFD`), strips the combining
 * diacritical marks, and lowercases, so `"e"` matches `"Évora"`. Shared by
 * `findTypeaheadMatch` and the Select / Combobox call sites that run their own
 * prefix matching, so Select, Listbox, and Combobox behave alike for accented
 * text.
 *
 * @param text Raw text to fold (an option label or the typed buffer).
 */
export function foldTypeaheadText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * The option-level typeahead match shared by Select and Listbox (DOM-focus and
 * virtualized paths). Scans `options` from the anchor, skipping disabled
 * options, and returns the first whose text starts with the query — matching
 * the WAI-ARIA APG typeahead behaviour:
 *
 * - A single character pressed repeatedly (`repeated`) cycles to the next
 *   same-initial option after the anchor and wraps around.
 * - A distinct multi-character prefix re-anchors on the current option
 *   (inclusive) so a growing prefix keeps it when it still matches.
 * - Both fall back to the top when nothing is anchored (`anchorIndex < 0`).
 *
 * Text and query are compared trimmed, case-insensitively, and
 * diacritics-insensitively (accents are folded via `foldTypeaheadText`).
 * Returns the matching option, or `null` when none matches (or the buffer is
 * empty).
 *
 * @typeParam H Option handle type.
 * @param options Live options to scan, in document order.
 * @param query Buffer state at the moment of the match.
 * @param getText Resolves an option's match text (e.g. its `textContent`).
 * @param isDisabled Whether an option is skipped.
 */
export function findTypeaheadMatch<H>(
  options: readonly H[],
  query: TypeaheadMatchQuery,
  getText: (option: H) => string,
  isDisabled: (option: H) => boolean,
): H | null {
  const buffer = foldTypeaheadText(query.buffer);
  if (!buffer || options.length === 0) {
    return null;
  }
  const needle = query.repeated ? buffer[0]! : buffer;
  const start = query.repeated ? query.anchorIndex + 1 : Math.max(query.anchorIndex, 0);
  for (let offset = 0; offset < options.length; offset++) {
    const option = options[(start + offset) % options.length]!;
    if (isDisabled(option)) {
      continue;
    }
    if (foldTypeaheadText(getText(option).trim()).startsWith(needle)) {
      return option;
    }
  }
  return null;
}
