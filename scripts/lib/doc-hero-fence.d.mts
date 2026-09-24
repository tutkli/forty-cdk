import type { DocProblem } from '../docs/doc-model.mjs';

/** The fence the generator owns, as a README writes it today. */
export interface HeroFence {
  readonly open: number;
  readonly close: number;
  readonly code: string;
}

/** Where a fence would be written in a section holding none, and how it is spaced. */
export interface HeroFenceInsertion {
  readonly line: number;
  readonly blank: 'before' | 'after';
}

/** A README's `## Examples`, and the fence the generator owns inside it. */
export interface HeroFencePlacement {
  readonly section: number;
  readonly fence: HeroFence | null;
  readonly insert?: HeroFenceInsertion;
}

/** One README paired with the hero its page projects. */
export interface HeroFenceDocument {
  readonly path: string;
  readonly source: string;
  readonly hero: { readonly path: string; readonly code: string } | null;
}

/** A class a later `## Examples` fence names that the hero does not declare, and why. */
export interface HeroClassExemption {
  readonly path: string;
  readonly className: string;
  readonly reason: string;
}

export declare const CLASS_EXEMPTIONS: readonly HeroClassExemption[];

export declare function projectHero(source: string): string;

export declare function heroSourceOf(pageSource: string): string | null;

export declare function heroFencePlacement(source: string): HeroFencePlacement | null;

export declare function withHeroFence(source: string, code: string): string;

export declare function heroFenceProblems(
  documents: readonly HeroFenceDocument[],
  exemptions?: readonly HeroClassExemption[],
): readonly DocProblem[];
