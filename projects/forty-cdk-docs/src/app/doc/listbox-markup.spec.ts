import { SITE_DOCS } from './testing/doc-corpus';

const EXAMPLE_FILES = import.meta.glob('/projects/forty-cdk-docs/src/app/demos/**/*.example.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const HARNESS_FIXTURES = import.meta.glob(
  '/projects/forty-cdk-harness/src/app/fixtures/**/*.fixture.ts',
  { query: '?raw', import: 'default', eager: true },
);

interface MarkupSource {
  readonly path: string;
  readonly text: string;
}

interface ListboxSite {
  readonly path: string;
  readonly host: string;
  readonly body: string;
}

const FENCE = /```[^\n]*\n([\s\S]*?)```/g;

const SOURCES: readonly MarkupSource[] = [
  ...SITE_DOCS.flatMap((doc) =>
    Array.from(doc.markdown.matchAll(FENCE), (fence) => ({ path: doc.path, text: fence[1]! })),
  ),
  ...Object.entries({ ...EXAMPLE_FILES, ...HARNESS_FIXTURES }).map(([key, text]) => ({
    path: key.slice(1),
    text,
  })),
];

const LISTBOX_HOST = /\sforListbox(?=[\s=/>])/g;

const LIST_TAG = /<(li|ul|ol)(?=[\s/>])/g;

const PRESENTATIONAL = /\srole="(?:none|presentation)"/;

const GROUP_HOST = /\sforListboxGroup(?=[\s=/>])/;

function closingBracket(text: string, from: number): number {
  let quote: string | null = null;
  for (let i = from; i < text.length; i++) {
    const char = text[i]!;
    if (quote) {
      if (char === quote) {
        quote = null;
      }
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '>') {
      return i;
    }
  }
  return -1;
}

function elementEnd(text: string, tag: string, from: number): number {
  const boundary = new RegExp(`<(/?)${tag}(?=[\\s/>])`, 'g');
  boundary.lastIndex = from;
  let depth = 0;
  for (const match of text.matchAll(boundary)) {
    depth += match[1] === '/' ? -1 : 1;
    if (depth === 0) {
      return match.index;
    }
  }
  return text.length;
}

function listboxSites(): readonly ListboxSite[] {
  const sites: ListboxSite[] = [];
  for (const { path, text } of SOURCES) {
    for (const match of text.matchAll(LISTBOX_HOST)) {
      const start = text.lastIndexOf('<', match.index);
      const end = closingBracket(text, start);
      const host = text.slice(start, end + 1);
      const tag = /^<([a-z][\w-]*)/i.exec(host)?.[1] ?? '';
      sites.push({ path, host, body: text.slice(end + 1, elementEnd(text, tag, start)) });
    }
  }
  return sites;
}

function listSemanticsInside(site: ListboxSite): readonly string[] {
  const offenders: string[] = [];
  for (const match of site.body.matchAll(LIST_TAG)) {
    const end = closingBracket(site.body, match.index);
    const markup = site.body.slice(match.index, end + 1);
    if (!PRESENTATIONAL.test(markup) && !GROUP_HOST.test(markup)) {
      offenders.push(`${site.path}: ${markup.replace(/\s+/g, ' ')}`);
    }
  }
  return offenders;
}

describe('listbox markup the site and the harness teach (#2310)', () => {
  const sites = listboxSites();

  it('finds the [forListbox] hosts across the READMEs, the demos and the harness fixtures', () => {
    expect(sites.length).toBeGreaterThanOrEqual(15);
    const paths = new Set(sites.map((site) => site.path));
    expect([...paths].some((path) => path.endsWith('README.md'))).toBe(true);
    expect([...paths].some((path) => path.endsWith('.example.ts'))).toBe(true);
    expect([...paths].some((path) => path.endsWith('.fixture.ts'))).toBe(true);
  });

  it('puts no list semantics between a listbox and its options', () => {
    expect(sites.flatMap(listSemanticsInside)).toEqual([]);
  });
});
