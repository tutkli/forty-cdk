/** Group / decimal separators for a locale, as derived from `Intl`. */
export interface LocaleSeparators {
  /** The locale grouping (thousands) separator. */
  readonly group: string;
  /** The locale decimal separator. */
  readonly decimal: string;
}

/** Escapes a string for safe interpolation into a `RegExp` source. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The space variants a locale may emit as a group separator, or that a user
 * may type in their place: ASCII space (U+0020), no-break space (U+00A0),
 * narrow no-break space (U+202F, fr-FR), and thin space (U+2009). Normalized to
 * the locale's canonical group separator before grouping validation so a
 * user-typed ASCII space still parses against an NBSP-emitting locale.
 */
const SPACE_GROUP_VARIANTS = /[    ]/g;

/** Whether `separator` is one of the whitespace group-separator variants. */
function isSpaceSeparator(separator: string): boolean {
  return /^[    ]$/.test(separator);
}

/**
 * Minus-sign variants a locale may emit for a negative, or that a user may type
 * in their place, normalized to ASCII `-` before the numeric gates: U+2212 MINUS
 * SIGN (`Intl` formats negatives with it in sv / fi / nb / lt and others) and
 * U+FF0D FULLWIDTH HYPHEN-MINUS. Without this normalization the sign would be
 * stripped as noise and a library-formatted negative would silently flip
 * positive.
 */
const MINUS_VARIANTS = /[−－]/g;

/**
 * Group / decimal separators for a given locale, derived once via `Intl`.
 * Falls back to `,` group / `.` decimal for an unknown or undefined locale.
 */
export function localeSeparators(locale: string | undefined): LocaleSeparators {
  let group = ',';
  let decimal = '.';
  for (const part of new Intl.NumberFormat(locale).formatToParts(11111.1)) {
    if (part.type === 'group') {
      group = part.value;
    } else if (part.type === 'decimal') {
      decimal = part.value;
    }
  }
  return { group, decimal };
}

/**
 * Parse locale-formatted numeric `text` into a number, or `null` when it is not
 * a valid plain decimal for the given `separators`. The locale minus-sign
 * variants (U+2212 / U+FF0D) are normalized to ASCII `-`, the locale decimal
 * separator is normalized to `.`, group separators are validated for placement
 * then stripped, and the canonical form is validated against a strict numeric
 * regex (optional sign + digits + a single optional decimal) before `Number()`.
 *
 * Grouping placement is strict: a group separator may appear only in the
 * integer part and only at 3-digit boundaries, so a correctly grouped
 * `"1,234,567"` parses while a misgrouped `"1,2,3"` is rejected (`null`)
 * rather than silently collapsing to `123`.
 *
 * For locales that group with a space (the NBSP / NNBSP fr-style locales),
 * whitespace-space variants — including the plain ASCII space a user is most
 * likely to type — are normalized to the locale's canonical separator first,
 * so a correctly-spaced number parses regardless of which space was typed.
 *
 * Exponent notation is intentionally rejected — `2e3` is not valid spinbutton
 * input and silently parsing it to `2000` is surprising. So are malformed forms
 * such as multiple signs (`+-5`) or multiple decimals (`1.2.3`); all map to
 * `null`, the same outcome callers already treat as "keep the last valid value".
 */
export function parseLocaleNumber(text: string, separators: LocaleSeparators): number | null {
  const { group, decimal } = separators;
  // When the locale groups with a space (NBSP / NNBSP in fr-style locales),
  // normalize every whitespace-space variant the user might type — including a
  // plain ASCII space — to the canonical separator, so grouping validation
  // doesn't reject a correctly-spaced number just because the typed space
  // differs from the one `Intl` emits.
  const spaceNormalized = isSpaceSeparator(group)
    ? text.replace(SPACE_GROUP_VARIANTS, group)
    : text;
  const input = spaceNormalized.replace(MINUS_VARIANTS, '-');
  // Strip currency symbols, percent signs, and any other non-numeric noise
  // the locale may include, leaving digits, sign, the locale group/decimal
  // separators, and the exponent letters — the strict gates below reject
  // exponent notation, so stripping `eE` here would let `2e3` slip through
  // as `23` instead of being seen (and refused) as malformed.
  const noise = new RegExp(`[^\\d${escapeRegExp(group)}${escapeRegExp(decimal)}eE+-]`, 'g');
  const cleaned = input.trim().replace(noise, '');
  if (cleaned.includes(group) && !groupingIsValid(cleaned, group, decimal)) {
    return null;
  }
  let normalized = cleaned.split(group).join('');
  if (decimal !== '.') {
    normalized = normalized.split(decimal).join('.');
  }
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Validates that every group separator in `cleaned` sits at a legal 3-digit
 * boundary within the integer part (none in the fractional part). Permits a
 * leading sign and a shorter leading group (`1,234` / `12,345` / `123,456`).
 */
function groupingIsValid(cleaned: string, group: string, decimal: string): boolean {
  const integerPart = cleaned.split(decimal)[0] ?? '';
  const sign = /^[+-]/.test(integerPart) ? integerPart[0]! : '';
  const digitsWithGroups = sign ? integerPart.slice(1) : integerPart;
  const g = escapeRegExp(group);
  return new RegExp(`^\\d{1,3}(?:${g}\\d{3})+$`).test(digitsWithGroups);
}
