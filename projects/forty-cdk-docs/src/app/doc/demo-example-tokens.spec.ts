import { readFileSync } from 'node:fs';

const EXAMPLE_FILES = import.meta.glob('/projects/forty-cdk-docs/src/app/demos/**/*.example.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

interface ExampleSource {
  readonly path: string;
  readonly source: string;
}

const EXAMPLES: readonly ExampleSource[] = Object.entries(EXAMPLE_FILES)
  .map(([key, source]) => ({ path: key.slice(1), source }))
  .sort((a, b) => a.path.localeCompare(b.path));

const EXAMPLE_FLOOR = 170;

const SITE_STYLESHEET = 'projects/forty-cdk-docs/src/styles.css';

const VOCABULARY: ReadonlyMap<string, string> = new Map([
  ['--ex-bg', '#f7f4ee'],
  ['--ex-surface', '#ffffff'],
  ['--ex-surface-2', '#f2eee6'],
  ['--ex-border', '#e5e0d6'],
  ['--ex-border-strong', '#d0c9bc'],
  ['--ex-text', '#17191c'],
  ['--ex-muted', '#585d66'],
  ['--ex-accent', '#0e7c6b'],
  ['--ex-accent-hover', '#0a5a4d'],
  ['--ex-accent-contrast', '#ffffff'],
  ['--ex-danger', '#b3261e'],
  ['--ex-danger-contrast', '#ffffff'],
  ['--ex-success', '#1f7a4d'],
  ['--ex-warning', '#a5651a'],
  ['--ex-inverse-bg', '#1b1f24'],
  ['--ex-inverse-text', '#ffffff'],
  ['--ex-radius-sm', '14px'],
  ['--ex-radius', '22px'],
  ['--ex-radius-lg', '34px'],
  ['--ex-shadow', '0 2px 4px rgba(0, 0, 0, 0.04), 0 20px 40px -18px rgba(0, 0, 0, 0.2)'],
  ['--ex-ease-spring', 'cubic-bezier(0.34, 1.56, 0.64, 1)'],
  ['--ex-font-mono', 'ui-monospace, monospace'],
]);

const THEME_BLOCKS: readonly string[] = [
  ':root {',
  "[data-theme='dark'] {",
  ":root:not([data-theme='light']) {",
];

const VAR_OPENER = /var\(\s*(--[a-z0-9-]+)/g;

const SITE_TOKEN = /--pg-[a-z0-9-]+/g;

const EXAMPLE_TOKEN_DECLARATION = /(--ex-[a-z0-9-]+)\s*:/g;

const DEMOS_ROOT = 'projects/forty-cdk-docs/src/app/demos/';

const STYLES_BLOCK = /styles:\s*`([^`]*)`/g;

const DECLARATION = /([a-z-]+)\s*:\s*([^;{}]+);/g;

const COLOUR_LITERAL = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(/i;

interface IntentionalColours {
  readonly reason: string;
  readonly declarations: readonly string[];
}

const INTENTIONAL_COLOURS: readonly IntentionalColours[] = [
  {
    reason:
      'Stands in for a photograph, which keeps its own colours whatever the theme or palette around it',
    declarations: [
      'aspect-ratio/examples/default.example.ts: color: #fff',
      'aspect-ratio/examples/default.example.ts: background: linear-gradient(135deg, var(--ex-accent, #0e7c6b), #ec4899)',
      'aspect-ratio/examples/default.example.ts: background: rgba(0, 0, 0, 0.25)',
      'aspect-ratio/examples/square.example.ts: color: #fff',
      'aspect-ratio/examples/square.example.ts: background: linear-gradient(135deg, #0ea5e9, #22c55e)',
      'aspect-ratio/examples/square.example.ts: background: rgba(0, 0, 0, 0.4)',
      'avatar/examples/default.example.ts: color: #fff',
      'avatar/examples/default.example.ts: background: linear-gradient(135deg, var(--ex-accent, #0e7c6b), #ec4899)',
      'avatar/examples/fallback.example.ts: color: #fff',
      'avatar/examples/fallback.example.ts: background: linear-gradient(135deg, #0ea5e9, #22c55e)',
    ],
  },
  {
    reason:
      'A scrim or a shadow darkens whatever lies behind it, so it is the same translucent black in every theme',
    declarations: [
      'dialog/examples/anatomy.example.ts: background: rgba(10, 12, 16, 0.5)',
      'dialog/examples/programmatic.example.ts: background: rgba(10, 12, 16, 0.5)',
      'drawer/examples/default.example.ts: background: rgba(10, 12, 16, 0.5)',
      'drawer/examples/nested.example.ts: background: rgba(10, 12, 16, 0.5)',
      'drawer/examples/nested.example.ts: background: rgba(10, 12, 16, 0.45)',
      'drawer/examples/programmatic.example.ts: background: rgba(10, 12, 16, 0.5)',
      'drawer/examples/region-scoped.example.ts: box-shadow: -8px 0 24px rgba(10, 12, 16, 0.18)',
      'drawer/examples/region-scoped.example.ts: background: rgba(10, 12, 16, 0.5)',
      'drawer/examples/snap-points.example.ts: background: rgba(10, 12, 16, 0.5)',
    ],
  },
  {
    reason:
      'A switch thumb is a white knob that has to stand out on the off track and the accent track alike',
    declarations: [
      'switch/examples/default.example.ts: background: #fff',
      'switch/examples/default.example.ts: box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35)',
      'switch/examples/form-field.example.ts: background: #fff',
      'switch/examples/form-field.example.ts: box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35)',
      'switch/examples/states.example.ts: background: #fff',
      'switch/examples/states.example.ts: box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35)',
    ],
  },
];

interface TokenRead {
  readonly name: string;
  readonly fallback: string | null;
}

function collapsed(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function closingParen(source: string, from: number): number {
  let index = from;
  let depth = 1;
  while (index < source.length && depth > 0) {
    const char = source[index];
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
    }
    index += 1;
  }
  return index;
}

function withoutTokenReads(value: string): string {
  let rest = value;
  for (let start = rest.indexOf('var('); start >= 0; start = rest.indexOf('var(')) {
    rest = rest.slice(0, start) + rest.slice(closingParen(rest, start + 'var('.length));
  }
  return rest;
}

function colourLiterals(examples: readonly ExampleSource[]): readonly string[] {
  return examples.flatMap((example) =>
    [...example.source.matchAll(STYLES_BLOCK)]
      .flatMap((block) => [...block[1]!.matchAll(DECLARATION)])
      .filter((declaration) => COLOUR_LITERAL.test(withoutTokenReads(declaration[2]!)))
      .map(
        (declaration) =>
          `${example.path.slice(DEMOS_ROOT.length)}: ${declaration[1]}: ${collapsed(declaration[2]!)}`,
      ),
  );
}

function tokenReads(source: string): readonly TokenRead[] {
  return [...source.matchAll(VAR_OPENER)].map((match) => {
    const index = closingParen(source, match.index + match[0].length);
    const inside = source.slice(match.index + match[0].length, index - 1);
    const comma = inside.indexOf(',');
    return {
      name: match[1]!,
      fallback: comma < 0 ? null : collapsed(inside.slice(comma + 1)),
    };
  });
}

function readSiteStylesheet(): string {
  let prefix = '.';
  for (let depth = 0; depth < 6; depth += 1) {
    try {
      return readFileSync(`${prefix}/${SITE_STYLESHEET}`, 'utf8');
    } catch {
      prefix = `${prefix}/..`;
    }
  }
  throw new Error(`Cannot reach ${SITE_STYLESHEET} from ${process.cwd()}`);
}

function themeBlock(css: string, header: string): string {
  const start = css.indexOf(header);
  if (start < 0) {
    throw new Error(`${SITE_STYLESHEET} declares no ${header} block`);
  }
  let index = start + header.length;
  let depth = 1;
  while (index < css.length && depth > 0) {
    const char = css[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
    }
    index += 1;
  }
  return css.slice(start, index);
}

function readingSiteTokens(examples: readonly ExampleSource[]): readonly string[] {
  return examples.flatMap((example) =>
    [...new Set(example.source.match(SITE_TOKEN) ?? [])].map(
      (token) => `${example.path}: ${token}`,
    ),
  );
}

function readingUnknownNames(examples: readonly ExampleSource[]): readonly string[] {
  return examples.flatMap((example) =>
    tokenReads(example.source)
      .filter((read) => read.name.startsWith('--ex-') && !VOCABULARY.has(read.name))
      .map((read) => `${example.path}: ${read.name}`),
  );
}

function readingWithoutTheAgreedFallback(examples: readonly ExampleSource[]): readonly string[] {
  return examples.flatMap((example) =>
    tokenReads(example.source)
      .filter((read) => VOCABULARY.has(read.name))
      .filter((read) => read.fallback !== VOCABULARY.get(read.name))
      .map((read) => `${example.path}: var(${read.name}, ${read.fallback ?? '—'})`),
  );
}

function declaringExampleTokens(examples: readonly ExampleSource[]): readonly string[] {
  return examples.flatMap((example) =>
    [...example.source.matchAll(EXAMPLE_TOKEN_DECLARATION)].map(
      (match) => `${example.path}: ${match[1]}`,
    ),
  );
}

function namesMissingFrom(block: string): readonly string[] {
  return [...VOCABULARY.keys()].filter((name) => !block.includes(`${name}:`));
}

describe('the CSS a demo example hands to Copy', () => {
  it('reads every example the site publishes, not a fraction of them', () => {
    expect(EXAMPLES.length).toBeGreaterThanOrEqual(EXAMPLE_FLOOR);
  });

  it('names a custom property in every example, so the fallback rules judge something', () => {
    const reading = EXAMPLES.filter((example) => tokenReads(example.source).length > 0);
    expect(reading.length).toBe(EXAMPLES.length);
  });

  it('reads none of the properties the site keeps to itself', () => {
    expect(readingSiteTokens(EXAMPLES)).toEqual([]);
  });

  it('reads no example property outside the published vocabulary', () => {
    expect(readingUnknownNames(EXAMPLES)).toEqual([]);
  });

  it('carries the agreed literal on every read, so a pasted file renders alone', () => {
    expect(readingWithoutTheAgreedFallback(EXAMPLES)).toEqual([]);
  });

  it('declares none of them itself — an example reads the vocabulary, the site owns it', () => {
    expect(declaringExampleTokens(EXAMPLES)).toEqual([]);
  });

  it('paints no colour outside a var() fallback, except the literals it means to keep', () => {
    const intentional = new Set(INTENTIONAL_COLOURS.flatMap((group) => group.declarations));
    expect(colourLiterals(EXAMPLES).filter((literal) => !intentional.has(literal))).toEqual([]);
  });

  it('keeps every literal it lists as intentional, so the list can only shrink', () => {
    const found = new Set(colourLiterals(EXAMPLES));
    expect(
      INTENTIONAL_COLOURS.flatMap((group) => group.declarations).filter(
        (literal) => !found.has(literal),
      ),
    ).toEqual([]);
  });
});

describe('the vocabulary the site publishes for its examples', () => {
  const css = readSiteStylesheet();

  it('reads the site stylesheet, not an empty string', () => {
    expect(css.length).toBeGreaterThan(1000);
  });

  it.each(THEME_BLOCKS)('publishes every name in %s', (header) => {
    expect(namesMissingFrom(themeBlock(css, header))).toEqual([]);
  });
});
