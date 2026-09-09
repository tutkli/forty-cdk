import {
  documentMarkdown,
  markdownLinksOf,
  rewriteMarkdownLinks,
} from '../../../../../scripts/docs/doc-markdown.mjs';
import {
  cellsOf,
  compileDocument,
  type DocDocument,
} from '../../../../../scripts/docs/doc-model.mjs';
import { compile, FRONTMATTER } from './testing/compile';
import { SITE_DOCS } from './testing/doc-corpus';

/**
 * The markdown artifacts the site publishes for assistants
 * ([#1816](https://github.com/tutkli/forty-cdk/issues/1816)).
 *
 * Two properties carry the file. The **round trip** is the strong one: every
 * document the corpus holds is emitted as markdown, compiled again, and held to
 * the same sections, the same anchors, the same tables cell-for-cell and the
 * same lede. It is what says the serialisation is lossless where the site reads
 * the document, and it is the assertion a hand-authored artifact could never
 * make — the May 2026 file this replaces drifted 23 components behind the
 * library with nothing red. The **link sweep** is the other: no relative href
 * survives the emit, because an artifact read on its own — pasted into a
 * conversation, fetched by an agent — has no base to resolve one against, and
 * the sites a resolver has to reach include a table cell and a section title
 * rather than prose alone.
 *
 * Recompiled as a guide rather than as a README: the emitted markdown carries
 * no frontmatter, having turned it into the document's title and its registry
 * entry, and every guard the round trip exercises reads the body.
 */

const RESOLVED = 'https://example.test/resolved';

/** Rewrites every relative href, and leaves an absolute or in-page one alone. */
function resolveHref(href: string): string | null {
  return href.startsWith('#') || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href) ? null : RESOLVED;
}

/**
 * Re-compiles a document from its own markdown, emitted with every link left as
 * written.
 *
 * The round trip is a claim about the **serialisation** — that the structure
 * survives being written back out — so it is made against an emit that rewrote
 * nothing. Resolving the links is what the artifacts additionally do, and it
 * changes a cell's markdown by construction, which would make an identity
 * assertion here fail for the one reason that is not a defect.
 */
function reemit(document: DocDocument): DocDocument {
  return compileDocument(
    documentMarkdown(document, () => null),
    { path: document.path, slug: document.slug, kind: 'guide' },
  );
}

function shapeOf(document: DocDocument): readonly string[] {
  return document.sections.map(
    (section) =>
      `${section.slug}|${section.title}|${section.headings
        .map((heading) => `${heading.depth}${heading.slug}`)
        .join(',')}`,
  );
}

function tablesOf(document: DocDocument): readonly string[] {
  return document.sections.flatMap((section) =>
    section.blocks
      .filter((block) => block.kind === 'table')
      .map((block) => JSON.stringify(cellsOf(block.table))),
  );
}

describe('markdownLinksOf', () => {
  it('reports each inline link with the line it was written on', () => {
    const links = markdownLinksOf('intro\n\nsee [the guide](../styling.md) and [API](#api)\n');

    expect(links).toEqual([
      { href: '../styling.md', line: 3 },
      { href: '#api', line: 3 },
    ]);
  });

  it('leaves a link-shaped run inside a fence alone, where it is the sample text', () => {
    const links = markdownLinksOf('```css\n[forTableCell](x) {\n}\n```\n\n[real](./a.md)\n');

    expect(links).toEqual([{ href: './a.md', line: 6 }]);
  });

  it('finds no link where a bracketed run has empty parens, as an Angular binding does', () => {
    expect(markdownLinksOf('`[width]() ?? minmax(0, 1fr)` is the fallback\n')).toEqual([]);
  });
});

describe('rewriteMarkdownLinks', () => {
  it('replaces the href and keeps the link text and its title byte-identical', () => {
    const rewritten = rewriteMarkdownLinks('[the `API`](./a.md "A title")', () => RESOLVED);

    expect(rewritten).toBe(`[the \`API\`](${RESOLVED} "A title")`);
  });

  it('leaves the link exactly as written when the rewrite declines it', () => {
    expect(rewriteMarkdownLinks('[x](#api)', () => null)).toBe('[x](#api)');
  });

  it('leaves a fenced sample alone, so a selector is not rewritten into a link', () => {
    const source = '```css\n[forThing](x) {\n}\n```\n';

    expect(rewriteMarkdownLinks(source, () => RESOLVED)).toBe(source);
  });
});

describe('documentMarkdown', () => {
  const document = compile({
    path: 'projects/forty-cdk/thing/README.md',
    slug: 'thing',
    markdown: [
      ...FRONTMATTER,
      '',
      '# Thing',
      '',
      'The lede, linking [the guide](../../../docs/styling.md).',
      '',
      'An intro paragraph.',
      '',
      '## API',
      '',
      '| Property | Type | Description |',
      '| -------- | ---- | ----------- |',
      '| `value`  | `A \\| B` | Reads [the guide](../../../docs/styling.md). |',
      '',
      '### ForThing',
      '',
      'Prose under a nested heading.',
      '',
    ].join('\n'),
  });
  const markdown = documentMarkdown(document, resolveHref);

  it('opens with the title the frontmatter no longer carries', () => {
    expect(markdown.startsWith('# Thing\n')).toBe(true);
    expect(markdown).not.toContain('title: Thing');
  });

  it('writes the lede back above the intro, there being no page header to carry it', () => {
    const [title, lede] = markdown.split('\n\n');

    expect(title).toBe('# Thing');
    expect(lede).toBe(`The lede, linking [the guide](${RESOLVED}).`);
    expect(markdown).toContain('An intro paragraph.');
  });

  it('emits a level-2 heading per section and keeps the headings below it', () => {
    expect(markdown).toContain('## API');
    expect(markdown).toContain('### ForThing');
  });

  it('resolves a link inside a table cell, not only one in prose', () => {
    expect(markdown).toContain(`Reads [the guide](${RESOLVED}).`);
  });

  it('escapes a pipe back, so the cell it belongs to survives being read again', () => {
    expect(markdown).toContain('`A \\| B`');
    expect(tablesOf(reemit(document))).toEqual(tablesOf(document));
  });
});

describe('the emitted markdown, over the whole corpus', () => {
  const emitted = SITE_DOCS.map((doc) => {
    const document = compile(doc);
    return { document, markdown: documentMarkdown(document, resolveHref) };
  });

  it('covers every document the site compiles', () => {
    expect(emitted.length).toBeGreaterThanOrEqual(60);
  });

  it('compiles again into the same sections, anchors and tables', () => {
    for (const { document } of emitted) {
      const again = reemit(document);

      expect(shapeOf(again), document.path).toEqual(shapeOf(document));
      expect(tablesOf(again), document.path).toEqual(tablesOf(document));
      expect(again.lede, document.path).toEqual(document.lede);
    }
  });

  it('publishes no relative href, which an artifact read on its own cannot resolve', () => {
    for (const { document, markdown } of emitted) {
      const relative = markdownLinksOf(markdown).filter(
        ({ href }) => !href.startsWith('#') && !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href),
      );

      expect(relative, document.path).toEqual([]);
    }
  });

  it('resolves the links the sources write rather than dropping them', () => {
    const resolved = emitted.reduce(
      (total, { markdown }) =>
        total + markdownLinksOf(markdown).filter(({ href }) => href === RESOLVED).length,
      0,
    );

    expect(resolved).toBeGreaterThanOrEqual(250);
  });
});
