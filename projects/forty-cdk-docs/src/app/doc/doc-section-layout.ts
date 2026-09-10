import type { DocPageSection } from './doc-model';

/** The ring a section fell in — the one fact the prelude rule reads. */
type Ringed = { readonly ring: DocPageSection['ring'] };

/** A section as the demos slot addresses it: its anchor, and the ring above. */
type Anchored = Ringed & { readonly slug: string };

const EXAMPLES = 'examples';
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

/** A page's sections, split at the point its live demos render. */
export interface DocExamplesSlot<T> {
  /** The sections rendered above the demos. */
  readonly before: readonly T[];
  /** The sections rendered below them. */
  readonly after: readonly T[];
  /**
   * The section whose body the demos replace, or `null` for a document that
   * declares none and has the heading synthesised for it.
   */
  readonly declared: T | null;
}

/**
 * Where a page renders its live demos
 * ([#1865](https://github.com/tutkli/forty-cdk/issues/1865)).
 *
 * A document that declares `## Examples` keeps the position it wrote it in, and
 * the site replaces that section's body with the demos. One that carries a
 * written exemption from it — six today, plus `virtualization`, whose archetype
 * never required the section — has the heading synthesised instead, and this is
 * the rule that gives it the template's position: after `## Anatomy`, which is
 * the "what directives exist" reference a demo means nothing without, and after
 * the prelude for a document that declares no `## Anatomy` at all.
 *
 * The placement had been an accident of a `-1`: the index of the declared
 * section was also the split point, so a document with none put the demos, the
 * heading and its anchor at index 0. Seven published pages opened with their
 * demos, `/table` reaching `## Anatomy` in ninth place, while the forty-six
 * that declare the section put it where the page template does.
 */
export function splitAtExamples<T extends Anchored>(sections: readonly T[]): DocExamplesSlot<T> {
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
