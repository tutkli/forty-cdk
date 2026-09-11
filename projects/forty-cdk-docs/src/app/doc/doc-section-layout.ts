import type { DocPageSection } from './doc-model';

/** The ring a section fell in — the one fact the prelude rule reads. */
type Ringed = { readonly ring: DocPageSection['ring'] };

/** A section as the demos slot addresses it: its anchor, and the ring above. */
type Anchored = Ringed & { readonly slug: string };

/** A demo as the slot addresses it: whether the page projects it above the intro. */
type Projected = { readonly hero: boolean };

const EXAMPLES = 'examples';
const EXAMPLES_TITLE = 'Examples';
const ANATOMY = 'anatomy';

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
 * the rail — which reads it over its own entries, the synthesised demos one
 * included — and to {@link splitAtExamples}, which reads it over the sections a
 * document declared.
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
   * the block.
   */
  readonly declared: T | null;
}

/** Whether a page projects a demo into the block — a hero renders above the intro instead. */
function rendersInBlock(demos: readonly Projected[]): boolean {
  return demos.some((demo) => !demo.hero);
}

/**
 * Where a page renders its live demos.
 *
 * A document that declares `## Examples` keeps the position it wrote it in, and
 * the site replaces that section's body with the demos. One that declares none
 * gets the block after `## Anatomy`, and after the prelude when it declares no
 * `## Anatomy` at all.
 *
 * A page that projects no demo into the block gets no slot: every section stays
 * in `before`, a declared `## Examples` among them, so its markdown renders like
 * any other section rather than being replaced by nothing.
 */
export function splitAtExamples<T extends Anchored>(
  sections: readonly T[],
  demos: readonly Projected[],
): DocExamplesSlot<T> {
  if (!rendersInBlock(demos)) {
    return { before: sections, after: [], declared: null };
  }

  const declared = sections.findIndex((section) => section.slug === EXAMPLES);
  if (declared !== -1) {
    return {
      before: sections.slice(0, declared),
      after: sections.slice(declared + 1),
      declared: sections[declared]!,
    };
  }

  const anatomy = sections.findIndex((section) => section.slug === ANATOMY);
  const at = anatomy !== -1 ? anatomy + 1 : preludeIndexOf(sections) + 1;
  return { before: sections.slice(0, at), after: sections.slice(at), declared: null };
}

/**
 * The heading a page renders its live demos under, or `null` for a page that
 * projects none into the block.
 *
 * A document that declares the section owns the title and anchor; one that
 * declares none has `Examples` synthesised.
 */
export function examplesHeadingOf(
  declared: DocExamplesHeading | null,
  demos: readonly Projected[],
): DocExamplesHeading | null {
  if (!rendersInBlock(demos)) {
    return null;
  }
  return declared === null
    ? { title: EXAMPLES_TITLE, slug: EXAMPLES }
    : { title: declared.title, slug: declared.slug };
}
