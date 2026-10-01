/**
 * Creates a memoized `Intl.DateTimeFormat` factory shared by the date adapters.
 *
 * Constructing an `Intl.DateTimeFormat` triggers an expensive ICU locale /
 * pattern resolution, so the adapters cache one instance per distinct
 * `(locale, options)` combination. The returned function derives its key from
 * the locale tag and the JSON-serialized options and does a get-or-create
 * against a private map, so repeated formatting with the same shape reuses the
 * same formatter.
 *
 * The cache is **unbounded**: its size is bounded by the app's distinct
 * formatting needs — roughly (locales in use) × (the small fixed set of option
 * shapes the primitives request) — not by the volume of dates formatted, so it
 * grows to at most a few dozen entries for the lifetime of the DI-scoped adapter
 * that owns it.
 *
 * @returns A function that returns the cached `Intl.DateTimeFormat` for the
 *   given `locale` (or the runtime default when omitted) and `options`.
 */
export function createFormatterCache(): (
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions,
) => Intl.DateTimeFormat {
  const cache = new Map<string, Intl.DateTimeFormat>();
  return (locale, options) => {
    const key = `${locale ?? ''}${JSON.stringify(options)}`;
    let formatter = cache.get(key);
    if (formatter === undefined) {
      formatter = new Intl.DateTimeFormat(locale, options);
      cache.set(key, formatter);
    }
    return formatter;
  };
}
