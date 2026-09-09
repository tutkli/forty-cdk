import { compile } from './testing/compile';
import { SITE_DOCS } from './testing/doc-corpus';
import { headingIds, sameDocumentFragments } from './testing/heading-ids';

/**
 * The anchor invariants of the whole published corpus — 57 entry-point READMEs
 * and the 10 guides ([#1805](https://github.com/tutkli/forty-cdk/issues/1805)).
 *
 * When #1805 recorded these, two of the three held and the third did not, so the
 * third was written down as a named exception with the two documents that broke
 * it: `combobox` emitted `api` twice and `listbox` emitted `keyboard` twice.
 * Neither title was at fault. The parser slugged its `##` headings through one
 * `Slugger` and everything below them through a module-level second one, and the
 * two counters never saw each other, so a `## API` and a `### API` on one page
 * both resolved to `api` and two elements carried one id. `check:doc-output`
 * could not see it either — it resolves fragments with `getElementById`, which
 * answers with the first of the two and is satisfied.
 *
 * **[#1806](https://github.com/tutkli/forty-cdk/issues/1806) shortened that
 * exception list to nothing**, which is the only way a characterization
 * exception should ever go away: one slugger per document now mints every
 * anchor, so the second `api` is `api-1` and no id is emitted twice anywhere in
 * the corpus. The list is kept as an empty map rather than deleted, because a
 * rewrite that reintroduces a duplicate should have to write the document's name
 * back into it.
 *
 * The last two cases pin the property that made this fixable: an anchor is a
 * function of its own document. The old parser reset its module-level slugger at
 * the top of every parse, which held only for as long as nobody forgot the reset
 * line; the compiler's slugger cannot outlive the call.
 */
const KNOWN_COLLIDING_IDS: ReadonlyMap<string, readonly string[]> = new Map();

/** A floor, not a target: it fails a run that stopped resolving anchors. */
const ANCHOR_FLOOR = 900;

function duplicatesOf(ids: readonly string[]): readonly string[] {
  return [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
}

describe('anchors across the published corpus', () => {
  it.each(SITE_DOCS.map((doc) => [doc.path, doc] as const))(
    '%s resolves every fragment it points at itself',
    (_path, doc) => {
      const ids = new Set(headingIds(compile(doc)));
      const unresolved = sameDocumentFragments(doc.markdown).filter((id) => !ids.has(id));

      expect(unresolved).toEqual([]);
    },
  );

  it.each(SITE_DOCS.map((doc) => [doc.path, doc] as const))(
    '%s emits the ids it is known to duplicate and no others',
    (path, doc) => {
      const duplicated = duplicatesOf(headingIds(compile(doc)));

      expect(duplicated).toEqual(KNOWN_COLLIDING_IDS.get(path) ?? []);
    },
  );

  it('reads enough anchors for the sweep above to mean anything', () => {
    const total = SITE_DOCS.reduce((count, doc) => count + headingIds(compile(doc)).length, 0);

    expect(total).toBeGreaterThanOrEqual(ANCHOR_FLOOR);
  });

  it('records no known collision for a document the corpus no longer holds', () => {
    const colliding = SITE_DOCS.filter(
      (doc) => duplicatesOf(headingIds(compile(doc))).length > 0,
    ).map((doc) => doc.path);

    expect(colliding).toEqual([...KNOWN_COLLIDING_IDS.keys()]);
  });

  it('suffixes rather than repeats the second of two headings that slugify alike', () => {
    const combobox = SITE_DOCS.find((doc) => doc.slug === 'combobox')!;
    const ids = headingIds(compile(combobox));

    expect(ids).toContain('api');
    expect(ids).toContain('api-1');
  });
});

describe('slugs derived from content rather than evaluation order', () => {
  it('gives a document the same ids however many pages were compiled before it', () => {
    const [first, second] = SITE_DOCS;
    const alone = headingIds(compile(first!));

    compile(second!);
    const afterANeighbour = headingIds(compile(first!));

    expect(afterANeighbour).toEqual(alone);
  });

  it('gives every document the same ids when the corpus is compiled in reverse', () => {
    const forwards = SITE_DOCS.map((doc) => [doc.path, headingIds(compile(doc))] as const);
    const backwards = [...SITE_DOCS]
      .reverse()
      .map((doc) => [doc.path, headingIds(compile(doc))] as const)
      .reverse();

    expect(backwards).toEqual(forwards);
  });
});
