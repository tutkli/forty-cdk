/** Group / decimal separators for a locale, as derived from `Intl`. */
export interface LocaleSeparators {
  /** The locale grouping (thousands) separator. */
  readonly group: string;
  /** The locale decimal separator. */
  readonly decimal: string;
  /**
   * The integer grouping sizes for this locale, primary (rightmost) group
   * first. Most locales are uniform `[3]` (`1,234,567`); Indic locales use lakh
   * / crore grouping `[3, 2]` (`12,34,567`). Used to validate group-separator
   * placement against the locale's real grouping instead of assuming 3.
   */
  readonly groupSizes: readonly number[];
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
 * Group / decimal separators (and integer grouping sizes) for a given locale,
 * derived once via `Intl`. Falls back to `,` group / `.` decimal / `[3]` sizes
 * for an unknown or undefined locale.
 */
export function localeSeparators(locale: string | undefined): LocaleSeparators {
  let group = ',';
  let decimal = '.';
  const integerLengths: number[] = [];
  for (const part of new Intl.NumberFormat(locale).formatToParts(1234567.1)) {
    if (part.type === 'group') {
      group = part.value;
    } else if (part.type === 'decimal') {
      decimal = part.value;
    } else if (part.type === 'integer') {
      integerLengths.push(part.value.length);
    }
  }
  return { group, decimal, groupSizes: deriveGroupSizes(integerLengths) };
}

/**
 * Reduce the integer-part widths of a grouped reference number (left-to-right)
 * to the locale's grouping template, primary (rightmost) group first. The
 * most-significant group is dropped — it is a partial that carries no size
 * rule. Returns `[3]` when the reference exposes no grouping.
 */
function deriveGroupSizes(integerLengths: readonly number[]): readonly number[] {
  const rightToLeft = integerLengths.slice(1).reverse();
  const primary = rightToLeft[0] ?? 3;
  const secondary = rightToLeft[1] ?? primary;
  return primary === secondary ? [primary] : [primary, secondary];
}

/**
 * Parse locale-formatted numeric `text` into a number, or `null` when it is not
 * a valid plain decimal for the given `separators`. The locale minus-sign
 * variants (U+2212 / U+FF0D) are normalized to ASCII `-`, the locale decimal
 * separator is normalized to `.`, group separators are validated for placement
 * then stripped, and the canonical form is validated against a strict numeric
 * regex (optional sign + digits + a single optional decimal) before `Number()`.
 *
 * Grouping placement is validated against the locale's real grouping sizes
 * (`separators.groupSizes`): a group separator may appear only in the integer
 * part and only at legal boundaries, so a correctly grouped `"1,234,567"` (or
 * the Indic `"12,34,567"`) parses while a misgrouped `"1,2,3"` is rejected
 * (`null`) rather than silently collapsing to `123`.
 *
 * Pass `{ lenientGrouping: true }` to skip that placement check — the group
 * separators are stripped and any cleanly-parsing digit sequence is accepted.
 * This is the mid-edit mode: while the user types inside a formatted value the
 * intermediate grouping is almost never well-formed (`"1,234"` → `"1,2345"`),
 * and the display is reformatted from the committed value on blur anyway, so
 * enforcing grouping during typing would silently discard valid edits.
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
export function parseLocaleNumber(
  text: string,
  separators: LocaleSeparators,
  options?: { readonly lenientGrouping?: boolean },
): number | null {
  const { group, decimal, groupSizes } = separators;
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
  if (
    !options?.lenientGrouping &&
    cleaned.includes(group) &&
    !groupingIsValid(cleaned, group, decimal, groupSizes)
  ) {
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
 * Validates that every group separator in `cleaned` sits at a legal boundary
 * within the integer part (none in the fractional part), against the locale's
 * grouping template `groupSizes` (primary group first). The rightmost group
 * must be exactly the primary size, interior groups exactly the secondary size,
 * and the leading group between 1 and the secondary size — so uniform `[3]`
 * accepts `1,234,567` and Indic `[3, 2]` accepts `12,34,567`, while `1,2,3` or
 * a separator stranded in the fractional part is rejected. Permits a leading
 * sign.
 */
function groupingIsValid(
  cleaned: string,
  group: string,
  decimal: string,
  groupSizes: readonly number[],
): boolean {
  const integerPart = cleaned.split(decimal)[0] ?? '';
  const digitsWithGroups = /^[+-]/.test(integerPart) ? integerPart.slice(1) : integerPart;
  const groups = digitsWithGroups.split(group);
  if (groups.length < 2 || groups.some((part) => !/^\d+$/.test(part))) {
    return false;
  }
  const primary = groupSizes[0] ?? 3;
  const secondary = groupSizes[1] ?? primary;
  const last = groups.length - 1;
  return groups.every((part, index) => {
    if (index === last) {
      return part.length === primary;
    }
    if (index === 0) {
      return part.length <= secondary;
    }
    return part.length === secondary;
  });
}
