const AM_TIME = new Date(2000, 0, 1, 1);
const PM_TIME = new Date(2000, 0, 1, 13);

/**
 * Resolves the effective hour cycle. An explicit `12` / `24` always wins;
 * otherwise the runtime locale's preference is read from
 * `Intl.DateTimeFormat(...).resolvedOptions().hourCycle` (`h11` / `h12` → 12,
 * `h23` / `h24` → 24).
 *
 * @param locale BCP 47 locale, or `undefined` for the runtime default.
 * @param override The `hourCycle` input, or `null` to derive from the locale.
 */
export function resolveHourCycle(locale: string | undefined, override: 12 | 24 | null): 12 | 24 {
  if (override !== null) {
    return override;
  }
  const cycle = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hourCycle;
  return cycle === 'h11' || cycle === 'h12' ? 12 : 24;
}

/** Maps a 0-23 hour to its 12-hour display value and AM/PM period. */
export function to12(hour: number): { h12: number; pm: boolean } {
  return { h12: ((hour + 11) % 12) + 1, pm: hour >= 12 };
}

/** Combines a 1-12 display hour and an AM/PM period back into a 0-23 hour. */
export function from12(h12: number, pm: boolean): number {
  const base = h12 % 12;
  return pm ? base + 12 : base;
}

/**
 * Reads the localized AM / PM strings for a locale (e.g. `AM` / `PM`,
 * `a.m.` / `p.m.`, `午前` / `午後`). Pure.
 *
 * @param locale BCP 47 locale, or `undefined` for the runtime default.
 */
export function dayPeriodNames(locale: string | undefined): { am: string; pm: string } {
  const fmt = new Intl.DateTimeFormat(locale, { hour: 'numeric', hour12: true });
  const read = (date: Date): string =>
    fmt.formatToParts(date).find((part) => part.type === 'dayPeriod')?.value ?? '';
  return { am: read(AM_TIME) || 'AM', pm: read(PM_TIME) || 'PM' };
}

function firstDifferingIndex(a: string, b: string): number {
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    if (a[i] !== b[i]) {
      return i;
    }
  }
  return -1;
}

/**
 * Resolves a single typed character to an AM / PM period for the `dayPeriod`
 * segment, so localized fields accept the locale's own day-period key (e.g.
 * `前` / `後` for `午前` / `午後`, `ص` / `م`) rather than only Latin `a` / `p`.
 *
 * The key is matched against the first character at which the two localized
 * names (`names.am` / `names.pm`) differ — this disambiguates locales whose
 * names share a leading character (`午前` / `午後`, `오전` / `오후`) while
 * coinciding with the first character for English. A Latin `a` / `p` fallback
 * always applies, since AM/PM is universal and many users lack an IME for the
 * native character. Returns `null` for a multi-character key or an unrecognized
 * character. Pure.
 *
 * @param key The typed character (`event.key`).
 * @param names The localized AM / PM strings, as read by {@link dayPeriodNames}.
 */
export function matchDayPeriod(key: string, names: { am: string; pm: string }): 'am' | 'pm' | null {
  if (key.length !== 1) {
    return null;
  }
  const lowerKey = key.toLowerCase();
  const am = names.am.toLowerCase();
  const pm = names.pm.toLowerCase();
  const index = firstDifferingIndex(am, pm);
  if (index !== -1) {
    if (lowerKey === am[index]) {
      return 'am';
    }
    if (lowerKey === pm[index]) {
      return 'pm';
    }
  }
  if (lowerKey === 'a') {
    return 'am';
  }
  if (lowerKey === 'p') {
    return 'pm';
  }
  return null;
}
