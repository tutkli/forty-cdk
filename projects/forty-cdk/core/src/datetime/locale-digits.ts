const formatters = new Map<string, Intl.NumberFormat>();

/**
 * Renders a non-negative date or time part (a day, a month, a year, an hour)
 * as the text a piece displays, in the numbering system `locale` formats its
 * dates with: Arabic-Indic digits for `ar-EG`, Persian digits for `fa-IR`,
 * Devanagari for `hi-IN-u-nu-deva`, Latin digits for `en-US`. Never grouped,
 * and zero-padded to `minimumIntegerDigits`.
 *
 * The numbering system is read off a Gregorian `Intl.DateTimeFormat` for the
 * same locale, so the digits match what the date adapters' `format` renders
 * beside them. Formatters are cached per `(locale, minimumIntegerDigits)`.
 *
 * @param value The part's number.
 * @param minimumIntegerDigits The width to zero-pad to (`1` for no padding).
 * @param locale BCP 47 locale, or `undefined` for the runtime default.
 */
export function formatLocaleDigits(
  value: number,
  minimumIntegerDigits: number,
  locale: string | undefined,
): string {
  const key = `${locale ?? ''}|${minimumIntegerDigits}`;
  let formatter = formatters.get(key);
  if (formatter === undefined) {
    const { numberingSystem } = new Intl.DateTimeFormat(locale, {
      calendar: 'gregory',
    }).resolvedOptions();
    formatter = new Intl.NumberFormat(locale, {
      numberingSystem,
      useGrouping: false,
      minimumIntegerDigits,
    });
    formatters.set(key, formatter);
  }
  return formatter.format(value);
}
