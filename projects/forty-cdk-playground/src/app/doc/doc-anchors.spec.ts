import { parseDoc } from './markdown';
import { SITE_DOCS } from './testing/doc-corpus';
import { headingIds, sameDocumentFragments } from './testing/heading-ids';

/**
 * The anchor invariants of the whole published corpus — 57 entry-point READMEs
 * and the 10 guides ([#1805](https://github.com/tutkli/forty-cdk/issues/1805)).
 *
 * Two of the three hold today and the third does not, so the third is recorded
 * with the two documents that break it rather than asserted as a rule. That is
 * the only honest shape for a characterization suite: a red case on `main`
 * would be turned off within a week, while a named exception is a list a
 * rewrite has to shorten deliberately.
 *
 * **The one that fails is uniqueness**, and its cause is structural rather than
 * a bad title. `parseDocSections` slugs the `##` headings through a `Slugger`
 * of its own while everything below them goes through the module-level
 * `headingSlugger`, so the two counters never see each other: `combobox`'s
 * `## API` and `### API` both resolve to `api`, `listbox`'s `## Keyboard` and
 * `### Keyboard` both to `keyboard`. Two elements per page then carry one id.
 * Nothing catches it upstream either — `check:doc-output` resolves fragments
 * with `getElementById`, which answers with the first of the two and is happy.
 *
 * **The one #1805 expected to fail does not.** Its third bullet reads the
 * module-level `headingSlugger` as shared *across* parses, which would make a
 * slug depend on which pages were rendered before it. `parseDocSections` resets
 * it at the top of every parse, so the corpus is order-independent today — the
 * last two cases pin that, because the reset is one line away from being lost
 * in a rewrite and nothing else would notice.
 */
const KNOWN_COLLIDING_IDS: ReadonlyMap<string, readonly string[]> = new Map([
  ['projects/forty-cdk/combobox/README.md', ['api']],
  ['projects/forty-cdk/listbox/README.md', ['keyboard']],
]);

/** A floor, not a target: it fails a run that stopped resolving anchors. */
const ANCHOR_FLOOR = 900;

function duplicatesOf(ids: readonly string[]): readonly string[] {
  return [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
}

describe('anchors across the published corpus', () => {
  it.each(SITE_DOCS.map((doc) => [doc.path, doc] as const))(
    '%s resolves every fragment it points at itself',
    (_path, doc) => {
      const ids = new Set(headingIds(parseDoc(doc.markdown)));
      const unresolved = sameDocumentFragments(doc.markdown).filter((id) => !ids.has(id));

      expect(unresolved).toEqual([]);
    },
  );

  it.each(SITE_DOCS.map((doc) => [doc.path, doc] as const))(
    '%s emits the ids it is known to duplicate and no others',
    (path, doc) => {
      const duplicated = duplicatesOf(headingIds(parseDoc(doc.markdown)));

      expect(duplicated).toEqual(KNOWN_COLLIDING_IDS.get(path) ?? []);
    },
  );

  it('reads enough anchors for the sweep above to mean anything', () => {
    const total = SITE_DOCS.reduce(
      (count, doc) => count + headingIds(parseDoc(doc.markdown)).length,
      0,
    );

    expect(total).toBeGreaterThanOrEqual(ANCHOR_FLOOR);
  });

  it('records no known collision for a document the corpus no longer holds', () => {
    const colliding = SITE_DOCS.filter(
      (doc) => duplicatesOf(headingIds(parseDoc(doc.markdown))).length > 0,
    ).map((doc) => doc.path);

    expect(colliding).toEqual([...KNOWN_COLLIDING_IDS.keys()]);
  });
});

describe('slugs derived from content rather than evaluation order', () => {
  it('gives a document the same ids however many pages were parsed before it', () => {
    const [first, second] = SITE_DOCS;
    const alone = headingIds(parseDoc(first!.markdown));

    parseDoc(second!.markdown);
    const afterANeighbour = headingIds(parseDoc(first!.markdown));

    expect(afterANeighbour).toEqual(alone);
  });

  it('gives every document the same ids when the corpus is parsed in reverse', () => {
    const forwards = SITE_DOCS.map(
      (doc) => [doc.path, headingIds(parseDoc(doc.markdown))] as const,
    );
    const backwards = [...SITE_DOCS]
      .reverse()
      .map((doc) => [doc.path, headingIds(parseDoc(doc.markdown))] as const)
      .reverse();

    expect(backwards).toEqual(forwards);
  });
});
