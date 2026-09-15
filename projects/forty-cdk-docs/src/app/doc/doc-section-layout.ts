import type { DocPageSection } from './doc-model';

/** The ring a section fell in — the one fact the prelude rule reads. */
type Ringed = { readonly ring: DocPageSection['ring'] };

/** A section as the demos slot addresses it: its anchor, and the ring above. */
type Anchored = Ringed & { readonly slug: string };

/** A demo as the slot addresses it: whether the page projects it above the intro. */
type Projected = { readonly hero: boolean };

const EXAMPLES = 'examples';

/**
 * The one specific section a document may write above its first core one, or
 * `-1` for a document that writes none.
 *
 * `## Date adapter` states the provider the four date primitives need before
 * any of them does anything, so the ring gets a position rather than none: a
 * prelude, and then one contiguous run wherever its content belongs
 * ([#1863](https://github.com/tutkli/forty-cdk/issues/1863)). The contract
 * states the same rule over the document itself, in `preludeIndexOf` in
 * `scripts/lib/doc-contract.mjs`.
 *
 * Read off the rings rather than off the index, so it means the same thing to
 * the rail — which reads it over its own entries — and to the contract, which
 * reads it over the sections a document declared.
 */
export function preludeIndexOf(sections: readonly Ringed[]): number {
  const first = sections.findIndex((section) => section.ring === 'specific');
  const core = sections.findIndex((section) => section.ring === 'core');
  return first !== -1 && (core === -1 || first < core) ? first : -1;
}

/** The heading a page renders its live demos under. */
export interface DocExamplesHeading {
  readonly title: string;
  readonly slug: string;
}

/** A page's sections, split at the point its live demos render. */
export interface DocExamplesSlot<T> {
  /** The sections rendered above the demos. */
  readonly before: readonly T[];
  /** The sections rendered below them. */
  readonly after: readonly T[];
  /**
   * The section whose body the demos replace, or `null` when they replace none
   * — a document declaring no `## Examples`, or a page projecting no demo into
   * the block. A page with demos and no section to put them in renders none,
   * which `doc-caption.spec.ts` is what keeps out of the corpus.
   */
  readonly declared: T | null;
}

/** Whether a page projects a demo into the block — a hero renders above the intro instead. */
function rendersInBlock(demos: readonly Projected[]): boolean {
  return demos.some((demo) => !demo.hero);
}

/**
 * Where a page renders its live demos: in the `## Examples` section its
 * document declared, whose body the site replaces with them.
 *
 * Every document that projects a demo declares that section — the contract
 * requires it of every archetype with DOM, and `## Examples` is also where the
 * hero's caption is authored ([#1920](https://github.com/tutkli/forty-cdk/issues/1920)),
 * so there is no page left for the site to synthesise a heading for. Until that
 * issue, seven documents declared none and the block was placed for them after
 * `## Anatomy`; the placement rule retired with the last page reaching it.
 *
 * A page that projects no demo into the block gets no slot: every section stays
 * in `before`, a declared `## Examples` among them, so its markdown renders like
 * any other section rather than being replaced by nothing.
 */
export function splitAtExamples<T extends Anchored>(
  sections: readonly T[],
  demos: readonly Projected[],
): DocExamplesSlot<T> {
  const declared = rendersInBlock(demos)
    ? sections.findIndex((section) => section.slug === EXAMPLES)
    : -1;
  if (declared === -1) {
    return { before: sections, after: [], declared: null };
  }
  return {
    before: sections.slice(0, declared),
    after: sections.slice(declared + 1),
    declared: sections[declared]!,
  };
}

/**
 * The heading a page renders its live demos under, taken from the section the
 * document declared — `null` for a page that projects none into the block, and
 * for one whose document declares no section to render them in.
 */
export function examplesHeadingOf(
  declared: DocExamplesHeading | null,
  demos: readonly Projected[],
): DocExamplesHeading | null {
  if (declared === null || !rendersInBlock(demos)) {
    return null;
  }
  return { title: declared.title, slug: declared.slug };
}
