/**
 * The theme the site paints with.
 *
 * Nothing else is a theme: a stored value outside this pair is treated as no
 * preference at all, the same way the inline bootstrap in
 * `projects/forty-cdk-docs/src/index.html` treats it.
 */
export type Theme = 'light' | 'dark';

/**
 * The `localStorage` key an explicitly chosen theme persists under.
 *
 * The inline bootstrap in `projects/forty-cdk-docs/src/index.html` stamps
 * `data-theme` from this same key before the first paint, so the two have to
 * name it identically — `theme-bootstrap.spec.ts` fails when they drift.
 */
export const THEME_KEY = 'forty-cdk-docs-theme';

/** The media query whose match decides the theme while nothing is stored. */
export const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * The theme the visitor chose, or `null` when they have chosen none.
 *
 * Only a choice is ever stored ([#1895](https://github.com/tutkli/forty-cdk/issues/1895)),
 * so `null` means the system preference decides — and keeps deciding, rather
 * than being frozen into an explicit preference by the first visit.
 */
export function readStoredTheme(): Theme | null {
  const stored = globalThis.localStorage?.getItem(THEME_KEY);
  return stored === 'light' || stored === 'dark' ? stored : null;
}

/**
 * Persists an explicit choice, so it survives a reload and beats the system
 * preference on the next visit.
 */
export function writeStoredTheme(theme: Theme): void {
  globalThis.localStorage?.setItem(THEME_KEY, theme);
}

/** The media query the system preference is read from, where one can be read. */
export function darkMediaQuery(): MediaQueryList | undefined {
  return globalThis.matchMedia?.(DARK_QUERY);
}

/**
 * The theme to paint: the stored choice where there is one, and the live system
 * preference otherwise.
 */
export function resolveTheme(stored: Theme | null, systemDark: boolean): Theme {
  return stored ?? (systemDark ? 'dark' : 'light');
}
