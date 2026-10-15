import { SITE_DOCS } from './testing/doc-corpus';

const EXAMPLE_FILES = import.meta.glob('/projects/forty-cdk-docs/src/app/demos/**/*.example.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

interface MarkupSource {
  readonly path: string;
  readonly text: string;
}

interface OpeningTag {
  readonly path: string;
  readonly tag: string;
  readonly markup: string;
}

const FENCE = /```[^\n]*\n([\s\S]*?)```/g;

const NAMING_ATTRIBUTE =
  /(?:^|\s)(?:\[ariaLabel\]|ariaLabel|aria-label|aria-labelledby|\[attr\.aria-label\]|\[attr\.aria-labelledby\])\s*=/;

const SOURCES: readonly MarkupSource[] = [
  ...SITE_DOCS.map((doc) => ({
    path: doc.path,
    text: Array.from(doc.markdown.matchAll(FENCE), (fence) => fence[1]!).join('\n'),
  })),
  ...Object.entries(EXAMPLE_FILES).map(([key, text]) => ({ path: key.slice(1), text })),
];

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

function openingTagsWith(attribute: string): readonly OpeningTag[] {
  const occurrence = new RegExp(`\\s${attribute}(?=[\\s=/>])`, 'g');
  const tags: OpeningTag[] = [];
  for (const { path, text } of SOURCES) {
    for (const match of text.matchAll(occurrence)) {
      const start = text.lastIndexOf('<', match.index);
      const end = closingBracket(text, start);
      const markup = text.slice(start, end + 1);
      tags.push({ path, tag: /^<([a-z][\w-]*)/i.exec(markup)?.[1] ?? '', markup });
    }
  }
  return tags;
}

describe('table selection markup the site teaches (#2223)', () => {
  const selectAll = openingTagsWith('forTableSelectAll');
  const rowSelectors = openingTagsWith('forTableRowSelector');

  it('finds the select-all and row selector markup across the README, the guides and the demos', () => {
    expect(selectAll.length).toBeGreaterThanOrEqual(6);
    expect(rowSelectors.length).toBeGreaterThanOrEqual(6);
    expect(new Set(selectAll.map((site) => site.path)).size).toBeGreaterThanOrEqual(4);
  });

  it('puts every [forTableSelectAll] on a <button>, the one host cell entry reaches in a grid', () => {
    const offenders = selectAll
      .filter((site) => site.tag !== 'button')
      .map((site) => `${site.path}: ${site.markup}`);
    expect(offenders).toEqual([]);
  });

  it('names every [forTableRowSelector], which announces as an unnamed checkbox otherwise', () => {
    const offenders = rowSelectors
      .filter((site) => !NAMING_ATTRIBUTE.test(site.markup))
      .map((site) => `${site.path}: ${site.markup}`);
    expect(offenders).toEqual([]);
  });
});
