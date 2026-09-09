import { cellsOf } from '../../../../../scripts/docs/doc-model.mjs';
import { headingText } from '../../../../../scripts/docs/doc-render.mjs';
import { compile } from './testing/compile';
import { SITE_DOCS } from './testing/doc-corpus';

/**
 * A structural snapshot per published document
 * ([#1805](https://github.com/tutkli/forty-cdk/issues/1805)): the sections a
 * page declares, the headings nested under each with the anchors they resolve
 * to, and the header shape of every table — nothing else.
 *
 * Snapshotting the rendered HTML would be noise. It would move on a `marked`
 * bump, on a Shiki theme change, on an anchor-icon tweak, and none of those is
 * the drift worth catching. What matters is whether a page still declares the
 * same sections in the same order, whether a heading still resolves to the same
 * anchor, and whether the same tables are still found under the same columns —
 * which is what decides the rendered result: `doc-section.ts` picks a rich API
 * table over the compact fallback by the role the compiler resolved, and
 * `doc-toc.ts` builds the page's navigation out of section and heading slugs.
 *
 * One snapshot per document, rather than one for the corpus, so a rewrite that
 * moves a single page produces a one-file diff a reviewer can read.
 */
interface TableShape {
  readonly role: 'api' | 'plain';
  readonly columns: readonly string[];
  readonly rows: number;
}

interface HeadingShape {
  readonly depth: number;
  readonly slug: string;
}

interface SectionShape {
  readonly title: string;
  readonly slug: string;
  readonly headings: readonly HeadingShape[];
  readonly tables: readonly TableShape[];
}

function structureOf(markdown: string, path: string, slug: string): readonly SectionShape[] {
  return compile({ markdown, path, slug }).sections.map((section) => ({
    title: section.title,
    slug: section.slug,
    headings: section.headings.map((heading) => ({ depth: heading.depth, slug: heading.slug })),
    tables: section.blocks
      .filter((block) => block.kind === 'table')
      .map((block) => ({
        role: block.table.role,
        columns: cellsOf(block.table).columns.map(headingText),
        rows: cellsOf(block.table).rows.length,
      })),
  }));
}

describe('document structure', () => {
  it.each(SITE_DOCS.map((doc) => [doc.path, doc] as const))(
    '%s declares the sections and table shapes it declared before',
    (_path, doc) => {
      expect(structureOf(doc.markdown, doc.path, doc.slug)).toMatchSnapshot();
    },
  );
});
