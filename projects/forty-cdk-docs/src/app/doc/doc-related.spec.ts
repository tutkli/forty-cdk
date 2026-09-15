import {
  compileDocument,
  type DocDocument,
  type DocKind,
} from '../../../../../scripts/docs/doc-model.mjs';
import { relatedIndexOf } from '../../../../../scripts/docs/doc-related.mjs';
import { buildDocRoutes } from '../../../../../scripts/lib/doc-links.mjs';
import { compile, FRONTMATTER } from './testing/compile';
import { GUIDE_DOCS, PAGE_DOCS, PRIMITIVE_DOCS, SITE_DOCS } from './testing/doc-corpus';

/**
 * The graph a _Related_ block is read off
 * ([#1938](https://github.com/tutkli/forty-cdk/issues/1938)).
 *
 * Stated over the compiler rather than over rendered HTML, because the claim is
 * about the corpus and not about markup: a relationship exists exactly while one
 * document links the other, so the case that matters is the one where a link
 * leaves the prose and the entry leaves with it. Asserted against emitted pages
 * it would pass on any block that happened to render something.
 *
 * The fixtures are documents rather than link lists for the same reason. Where
 * a link is written — a paragraph, a table cell, a fenced sample — is precisely
 * what decides whether it counts, and a graph handed hrefs could not be wrong
 * about it.
 */
const ROUTES = buildDocRoutes({
  primitiveSlugs: ['select', 'combobox', 'table'],
  guideSlugs: ['styling'],
  pageSlugs: ['concepts'],
  foldedSlugs: [{ slug: 'table-virtualization', host: 'table' }],
});

const keyOf = (document: DocDocument): string => `${document.kind}:${document.slug}`;

function fixture(kind: DocKind, path: string, slug: string, body: string): DocDocument {
  const head = kind === 'primitive' ? FRONTMATTER : [];
  return compileDocument([...head, `# ${slug}`, '', 'What it is.', '', body].join('\n'), {
    path,
    slug,
    kind,
  });
}

function readme(slug: string, body: string): DocDocument {
  return fixture('primitive', `projects/forty-cdk/${slug}/README.md`, slug, body);
}

function guide(slug: string, body: string): DocDocument {
  return fixture('guide', `docs/${slug}.md`, slug, body);
}

function sitePage(slug: string, body: string): DocDocument {
  return fixture('page', `docs/site/${slug}.md`, slug, body);
}

function indexOf(...documents: readonly DocDocument[]): Map<string, readonly string[]> {
  return relatedIndexOf(
    documents.map((held) => ({ key: keyOf(held), documents: [held] })),
    ROUTES,
  );
}

describe('relatedIndexOf', () => {
  it('names the pages a document links, and the pages that link it', () => {
    const index = indexOf(
      readme('select', '## Styling\n\nRead [Styling](../../../docs/styling.md) first.'),
      guide('styling', '## Hooks\n\nThree of them.'),
    );

    expect(index.get('primitive:select')).toEqual(['guide:styling']);
    expect(index.get('guide:styling')).toEqual(['primitive:select']);
  });

  it('drops both entries when the link leaves the prose', () => {
    const linked = indexOf(
      readme('select', '## Styling\n\nRead [Styling](../../../docs/styling.md) first.'),
      guide('styling', '## Hooks\n\nThree of them.'),
    );
    const unlinked = indexOf(
      readme('select', '## Styling\n\nNothing points anywhere now.'),
      guide('styling', '## Hooks\n\nThree of them.'),
    );

    expect(linked.get('primitive:select')).toEqual(['guide:styling']);
    expect(unlinked.get('primitive:select')).toEqual([]);
    expect(unlinked.get('guide:styling')).toEqual([]);
  });

  it('counts a link written inside a table cell, where the corpus writes many of them', () => {
    const index = indexOf(
      readme(
        'select',
        [
          '## API',
          '',
          '| Property | Type | Description |',
          '| --- | --- | --- |',
          '| `value` | `string` | Styled as [Styling](../../../docs/styling.md) explains. |',
        ].join('\n'),
      ),
      guide('styling', '## Hooks\n\nThree of them.'),
    );

    expect(index.get('primitive:select')).toEqual(['guide:styling']);
  });

  it('reads no link out of a fenced sample, which is a sample and not a reference', () => {
    const index = indexOf(
      readme(
        'select',
        ['## Examples', '', '```md', '[Styling](../../../docs/styling.md)', '```'].join('\n'),
      ),
      guide('styling', '## Hooks\n\nThree of them.'),
    );

    expect(index.get('primitive:select')).toEqual([]);
    expect(index.get('guide:styling')).toEqual([]);
  });

  it('leaves out a link back to the page the document is published on', () => {
    const index = indexOf(
      readme('select', '## API\n\nSee the [API](./README.md#api) and [anatomy](#anatomy).'),
    );

    expect(index.get('primitive:select')).toEqual([]);
  });

  it('leaves out a link the site publishes no page for', () => {
    const index = indexOf(
      readme('select', '## Notes\n\nRead the [changelog](../../../CHANGELOG.md).'),
    );

    expect(index.get('primitive:select')).toEqual([]);
  });

  it('names a page once however many times a document links it', () => {
    const index = indexOf(
      readme(
        'select',
        '## Styling\n\n[Styling](../../../docs/styling.md) and [again](../../../docs/styling.md).',
      ),
      guide('styling', '## Hooks\n\nThree of them.'),
    );

    expect(index.get('primitive:select')).toEqual(['guide:styling']);
  });

  it('reads the site’s own pages the way it reads a guide', () => {
    const index = indexOf(
      sitePage('concepts', '## Composition\n\nStart at [Select](../../projects/forty-cdk/select).'),
      readme('select', '## Anatomy\n\nFour pieces.'),
    );

    expect(index.get('page:concepts')).toEqual(['primitive:select']);
    expect(index.get('primitive:select')).toEqual(['page:concepts']);
  });
});

describe('a folded entry point', () => {
  const folded = () =>
    relatedIndexOf(
      [
        {
          key: 'primitive:table',
          documents: [
            readme('table', '## Anatomy\n\nRows and cells.'),
            readme(
              'table-virtualization',
              '## Styling\n\nRead [Styling](../../../docs/styling.md).',
            ),
          ],
        },
        { key: 'guide:styling', documents: [guide('styling', '## Hooks\n\nThree of them.')] },
        {
          key: 'primitive:combobox',
          documents: [
            readme(
              'combobox',
              '## Notes\n\nSee [virtualized rows](../table-virtualization/README.md#api).',
            ),
          ],
        },
      ],
      ROUTES,
    );

  it('contributes its links to the page that republishes it, and holds none of its own', () => {
    const index = folded();

    expect(index.get('primitive:table')).toContain('guide:styling');
    expect(index.get('guide:styling')).toContain('primitive:table');
    expect(index.has('primitive:table-virtualization')).toBe(false);
  });

  it('receives a link written at it as the host page', () => {
    const index = folded();

    expect(index.get('primitive:combobox')).toEqual(['primitive:table']);
    expect(index.get('primitive:table')).toContain('primitive:combobox');
  });
});

describe('the published corpus', () => {
  const routes = buildDocRoutes({
    primitiveSlugs: PRIMITIVE_DOCS.map((doc) => doc.slug),
    guideSlugs: GUIDE_DOCS.map((doc) => doc.slug),
    pageSlugs: PAGE_DOCS.map((doc) => doc.slug),
  });
  const index = relatedIndexOf(
    SITE_DOCS.map((doc) => {
      const compiled = compile(doc);
      return { key: keyOf(compiled), documents: [compiled] };
    }),
    routes,
  );

  /**
   * The four READMEs that used to carry a hand-written _See also_ pointing at
   * this guide. Each links it from its portalling note as well, which is why
   * retiring the list cost the block nothing — and this is the case that would
   * fail if the remaining link went too.
   */
  it.each(['hover-card', 'menu', 'popover', 'tooltip'])(
    'relates /%s to the floating-content guide without a See also list',
    (slug) => {
      expect(index.get(`primitive:${slug}`)).toContain('guide:styling-floating-content');
    },
  );

  it('gives a leaf guide the pages that link it, which it links none of', () => {
    const related = index.get('guide:styling-floating-content') ?? [];

    expect(related.length).toBeGreaterThan(4);
    expect(related).toContain('primitive:tooltip');
  });

  it('leaves a document nothing links and that links nothing with no entries', () => {
    expect(index.get('primitive:search')).toEqual([]);
  });
});
