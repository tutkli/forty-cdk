import { parseDoc, stripText } from './markdown';
import { SITE_DOCS } from './testing/doc-corpus';

/**
 * A structural snapshot per published document
 * ([#1805](https://github.com/tutkli/forty-cdk/issues/1805)): the sections a
 * page declares, the subsections nested under each, and the header shape of
 * every table — nothing else.
 *
 * Snapshotting the rendered HTML would be noise. It would move on a `marked`
 * bump, on a Shiki theme change, on an anchor-icon tweak, and none of those is
 * the drift worth catching. What matters when
 * [#1806](https://github.com/tutkli/forty-cdk/issues/1806) replaces the parser
 * is whether a page still declares the same sections in the same order, whether
 * an `h3` still resolves to the same anchor, and whether the same tables are
 * still found with the same columns — which is exactly what decides the
 * rendered result: `doc-section.ts` picks a rich API table over the compact
 * fallback by reading `columns`, and `doc-toc.ts` builds the page's navigation
 * out of section and subsection slugs.
 *
 * One snapshot per document, rather than one for the corpus, so a rewrite that
 * moves a single page produces a one-file diff a reviewer can read.
 */
interface TableShape {
  readonly columns: readonly string[];
  readonly rows: number;
}

interface SectionShape {
  readonly title: string;
  readonly slug: string;
  readonly subsections: readonly string[];
  readonly tables: readonly TableShape[];
}

function structureOf(markdown: string): readonly SectionShape[] {
  return parseDoc(markdown).sections.map((section) => ({
    title: section.title,
    slug: section.slug,
    subsections: section.subsections.map((subsection) => subsection.slug),
    tables: section.blocks
      .filter((block) => block.kind === 'table')
      .map((block) => ({
        columns: block.table.columns.map(stripText),
        rows: block.table.rows.length,
      })),
  }));
}

describe('document structure', () => {
  it.each(SITE_DOCS.map((doc) => [doc.path, doc] as const))(
    '%s declares the sections and table shapes it declared before',
    (_path, doc) => {
      expect(structureOf(doc.markdown)).toMatchSnapshot();
    },
  );
});
