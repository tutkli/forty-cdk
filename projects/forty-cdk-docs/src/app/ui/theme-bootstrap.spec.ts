/**
 * The blocking theme bootstrap ([#1880](https://github.com/tutkli/forty-cdk/issues/1880)).
 *
 * A prerendered page carries no `data-theme`, so the palette the visitor sees in
 * the first painted frame is whatever the inline script in `index.html` stamps
 * before the stylesheet applies. It is plain script text rather than a module,
 * so it is asserted the only way that proves anything: by running the real text
 * against doubles and reading the decision back.
 *
 * Its two siblings need the filesystem and are asserted by
 * `scripts/check-prerender-output.mjs` instead — that no emitted page bakes the
 * attribute, and that the `prefers-color-scheme` fallback in `styles.css` states
 * every declaration its `[data-theme='dark']` twin does. A `.css` read back
 * through a glob is empty under this builder, which is why the pair lives there.
 */
const INDEX_HTML = import.meta.glob('/projects/forty-cdk-docs/src/index.html', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const SITE_CHROME = import.meta.glob('/projects/forty-cdk-docs/src/app/ui/site-chrome.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

function source(files: Record<string, string>, path: string): string {
  const text = files[path];
  if (text === undefined || text.length === 0) {
    throw new Error(`${path} read back empty — the theme bootstrap cannot be asserted`);
  }
  return text;
}

function themeKey(): string {
  const chrome = source(SITE_CHROME, '/projects/forty-cdk-docs/src/app/ui/site-chrome.ts');
  const found = /export const THEME_KEY = '([^']+)'/.exec(chrome);
  if (found === null) {
    throw new Error('site-chrome.ts exports no THEME_KEY — the site persists the theme elsewhere');
  }
  return found[1]!;
}

function bootstrapScript(): string {
  const html = source(INDEX_HTML, '/projects/forty-cdk-docs/src/index.html');
  const found = /<script>([\s\S]*?)<\/script>/.exec(html);
  if (found === null) {
    throw new Error(
      'index.html carries no inline <script> — the theme is applied after hydration again',
    );
  }
  return found[1]!;
}

interface BootstrapRun {
  /** The value stamped on `data-theme`, or `null` when nothing was stamped. */
  readonly stamped: string | null;
  /** The `localStorage` key the script read, or `null` when it read none. */
  readonly key: string | null;
  /** The media query the script asked `matchMedia`, or `null` when it asked none. */
  readonly query: string | null;
}

function run(options: {
  readonly stored?: string;
  readonly prefersDark?: boolean;
  readonly storageDenied?: boolean;
}): BootstrapRun {
  let stamped: string | null = null;
  let key: string | null = null;
  let query: string | null = null;

  const storage = {
    getItem(name: string): string | null {
      key = name;
      if (options.storageDenied === true) {
        throw new Error('access denied');
      }
      return options.stored ?? null;
    },
  };

  const media = (asked: string) => {
    query = asked;
    return { matches: asked === '(prefers-color-scheme: dark)' && options.prefersDark === true };
  };

  const documentDouble = {
    documentElement: {
      setAttribute(name: string, value: string): void {
        if (name === 'data-theme') {
          stamped = value;
        }
      },
    },
  };

  new Function('localStorage', 'matchMedia', 'document', bootstrapScript())(
    storage,
    media,
    documentDouble,
  );

  return { stamped, key, query };
}

describe('the inline theme bootstrap', () => {
  it('stamps the dark palette when the system prefers dark and nothing is stored', () => {
    expect(run({ prefersDark: true }).stamped).toBe('dark');
  });

  it('stamps the light palette when the system prefers light and nothing is stored', () => {
    expect(run({ prefersDark: false }).stamped).toBe('light');
  });

  it('lets an explicitly stored light win over a dark system preference', () => {
    expect(run({ stored: 'light', prefersDark: true }).stamped).toBe('light');
  });

  it('lets an explicitly stored dark win over a light system preference', () => {
    expect(run({ stored: 'dark', prefersDark: false }).stamped).toBe('dark');
  });

  it('falls back to the system preference when the stored value is not a theme', () => {
    expect(run({ stored: 'sepia', prefersDark: true }).stamped).toBe('dark');
  });

  it('stamps nothing rather than throwing when storage is denied', () => {
    expect(run({ storageDenied: true, prefersDark: true }).stamped).toBeNull();
  });

  it('reads the same storage key the site persists the theme under', () => {
    expect(run({ prefersDark: false }).key).toBe(themeKey());
  });

  it('asks for the dark colour-scheme preference', () => {
    expect(run({ prefersDark: false }).query).toBe('(prefers-color-scheme: dark)');
  });
});
