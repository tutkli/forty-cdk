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

const SOURCES: readonly MarkupSource[] = [
  ...SITE_DOCS.map((doc) => ({
    path: doc.path,
    text: Array.from(doc.markdown.matchAll(FENCE), (fence) => fence[1]!).join('\n'),
  })),
  ...Object.entries(EXAMPLE_FILES).map(([key, text]) => ({ path: key.slice(1), text })),
];

const SET_SIZE_ROLES = new Set([
  'article',
  'listitem',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'row',
  'tab',
  'treeitem',
]);

const IMPLICIT_SET_SIZE_TAGS = new Set(['article', 'li', 'option', 'tr']);

const NAMING_ATTRIBUTE =
  /(?:^|\s)(?:aria-label|aria-labelledby|\[attr\.aria-label\]|\[attr\.aria-labelledby\]|\[ariaLabel\]|ariaLabel)\s*=/;

const TAB_STOP = /\stabindex="0"/;

const VIRTUALIZATION_PAGES = [
  'projects/forty-cdk/virtualization/README.md',
  'projects/forty-cdk-docs/src/app/demos/virtualization/',
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

function openingTagsMatching(occurrence: RegExp): readonly OpeningTag[] {
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

function supportsSetSize(site: OpeningTag): boolean {
  const role = /\srole="([a-z]+)"/.exec(site.markup)?.[1];
  return role === undefined ? IMPLICIT_SET_SIZE_TAGS.has(site.tag) : SET_SIZE_ROLES.has(role);
}

function describeSite(site: OpeningTag): string {
  return `${site.path}: ${site.markup.replace(/\s+/g, ' ')}`;
}

function onVirtualizationPage(site: OpeningTag): boolean {
  return VIRTUALIZATION_PAGES.some((prefix) => site.path.startsWith(prefix));
}

describe('virtualized list markup the site teaches (#2343)', () => {
  const rows = [
    ...openingTagsMatching(/\s\*forVirtualFor=/g),
    ...openingTagsMatching(/\s(?:\[attr\.aria-setsize\]|aria-setsize)=/g),
  ];
  const viewports = openingTagsMatching(/\sforVirtualViewport(?=[\s/>])/g);
  const scrollers = openingTagsMatching(/\s#scroll(?=[\s/>])/g).filter(onVirtualizationPage);

  it('finds the virtualized rows, viewports and scrollers across the READMEs and the demos', () => {
    expect(rows.length).toBeGreaterThanOrEqual(10);
    expect(new Set(rows.map((site) => site.path)).size).toBeGreaterThanOrEqual(5);
    expect(viewports.length).toBeGreaterThanOrEqual(6);
    expect(scrollers.length).toBeGreaterThanOrEqual(3);
  });

  it('puts every aria-setsize / aria-posinset row on a role that supports the pair', () => {
    const offenders = rows.filter((site) => !supportsSetSize(site)).map(describeSite);
    expect(offenders).toEqual([]);
  });

  it('gives every [forVirtualViewport] a role and an accessible name', () => {
    const offenders = viewports
      .filter((site) => !/\srole="[a-z]+"/.test(site.markup) || !NAMING_ATTRIBUTE.test(site.markup))
      .map(describeSite);
    expect(offenders).toEqual([]);
  });

  it('gives every viewport whose rows hold nothing focusable a Tab stop', () => {
    const offenders = viewports
      .filter((site) => !/\sforVirtualReorder(?=[\s/>])/.test(site.markup))
      .filter((site) => !TAB_STOP.test(site.markup))
      .map(describeSite);
    expect(offenders).toEqual([]);
  });

  it('gives every hand-wired virtualization scroller a name and a Tab stop', () => {
    const offenders = scrollers
      .filter((site) => !TAB_STOP.test(site.markup) || !NAMING_ATTRIBUTE.test(site.markup))
      .map(describeSite);
    expect(offenders).toEqual([]);
  });
});
