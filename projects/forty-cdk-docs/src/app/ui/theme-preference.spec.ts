import { readStoredTheme, resolveTheme, THEME_KEY, writeStoredTheme } from './theme-preference';

/**
 * What the site persists, and when
 * ([#1895](https://github.com/tutkli/forty-cdk/issues/1895)).
 *
 * The decision itself is a pure function of a stored choice and a live system
 * preference, so it is asserted directly. Where the write happens is not — the
 * defect was a theme that came from nothing but `matchMedia` being persisted as
 * an explicit choice on the first render, which froze every later visit — so the
 * source that holds the writer is read back and the two places it may not appear
 * in are asserted against its text, the same way `theme-bootstrap.spec.ts` reads
 * the inline script.
 */
const SITE_CHROME = import.meta.glob('/projects/forty-cdk-docs/src/app/ui/site-chrome.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

function chromeSource(): string {
  const text = (SITE_CHROME as Record<string, string>)[
    '/projects/forty-cdk-docs/src/app/ui/site-chrome.ts'
  ];
  if (text === undefined || text.length === 0) {
    throw new Error('site-chrome.ts read back empty — where the theme persists cannot be asserted');
  }
  return text;
}

function blockAfter(source: string, marker: string): string {
  const start = source.indexOf(marker);
  if (start === -1) {
    throw new Error(`site-chrome.ts contains no ${marker} — the site resolves its theme elsewhere`);
  }
  const open = source.indexOf('{', start);
  let depth = 1;
  let cursor = open + 1;
  while (cursor < source.length && depth > 0) {
    if (source[cursor] === '{') {
      depth += 1;
    } else if (source[cursor] === '}') {
      depth -= 1;
    }
    cursor += 1;
  }
  return source.slice(open + 1, cursor - 1);
}

function storageDouble(stored?: string): { readonly written: Map<string, string> } {
  const written = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (name: string): string | null => (name === THEME_KEY ? (stored ?? null) : null),
    setItem: (name: string, value: string): void => {
      written.set(name, value);
    },
  });
  return { written };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the stored theme', () => {
  it('reads back the theme the visitor chose', () => {
    storageDouble('dark');
    expect(readStoredTheme()).toBe('dark');
  });

  it('reads back no choice when nothing is stored', () => {
    storageDouble();
    expect(readStoredTheme()).toBeNull();
  });

  it('reads back no choice when the stored value is not a theme', () => {
    storageDouble('sepia');
    expect(readStoredTheme()).toBeNull();
  });

  it('reads back no choice where there is no storage at all', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(readStoredTheme()).toBeNull();
  });

  it('persists a choice under the key the inline bootstrap reads', () => {
    const { written } = storageDouble();
    writeStoredTheme('dark');
    expect(written.get(THEME_KEY)).toBe('dark');
  });

  it('persists nothing where there is no storage at all', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(() => writeStoredTheme('dark')).not.toThrow();
  });
});

describe('resolving the theme to paint', () => {
  it('follows a dark system preference while nothing is stored', () => {
    expect(resolveTheme(null, true)).toBe('dark');
  });

  it('follows a light system preference while nothing is stored', () => {
    expect(resolveTheme(null, false)).toBe('light');
  });

  it('lets an explicitly chosen light win over a dark system preference', () => {
    expect(resolveTheme('light', true)).toBe('light');
  });

  it('lets an explicitly chosen dark win over a light system preference', () => {
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});

describe('where the site writes the theme', () => {
  it('persists nothing from the effect that paints the theme', () => {
    const body = blockAfter(chromeSource(), 'effect(');
    expect(body).toContain('setAttribute');
    expect(body).not.toContain('writeStoredTheme');
    expect(body).not.toContain('setItem');
  });

  it('persists the theme from the visitor choice alone', () => {
    expect(blockAfter(chromeSource(), 'setDark(')).toContain('writeStoredTheme(');
  });

  it('moves the theme on a system preference change rather than on a reload', () => {
    const source = chromeSource();
    expect(source).toContain('darkMediaQuery()');
    expect(source).toContain("'change'");
  });
});
