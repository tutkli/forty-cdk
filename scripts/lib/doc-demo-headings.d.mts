import type { DocDocument } from '../docs/doc-model.mjs';

/** One `<demo-layout>` as a page file writes it. */
export interface PageDemo {
  /** Whether the page projects it above the intro. */
  readonly hero: boolean;
  /** The `###` under `## Examples` it names, by slug; `null` when it names none. */
  readonly heading: string | null;
  readonly sourcePath: string | null;
  /** The retired attributes, read so the gate can name them. */
  readonly title: string | null;
  readonly subtitle: string | null;
}

export declare function demosOf(pageSource: string): readonly PageDemo[];

/** A page file paired with the README its demos are introduced by. */
export interface DemoHeadingPage {
  /** Repository-relative path of the `*.page.ts`. */
  readonly path: string;
  readonly source: string;
  readonly document: Pick<DocDocument, 'path' | 'examples'>;
}

/** One disagreement, addressed by the file it has to be repaired in. */
export interface DemoHeadingProblem {
  readonly path: string;
  readonly line?: number;
  readonly message: string;
}

export declare function demoHeadingProblems(
  pages: readonly DemoHeadingPage[],
): readonly DemoHeadingProblem[];
