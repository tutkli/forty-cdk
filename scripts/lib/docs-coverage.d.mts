import type { DocDocument } from '../docs/doc-model.mjs';

/** An entry point the site publishes no page for, and the reason it does not. */
export interface DocsCoverageExemption {
  readonly slug: string;
  readonly reason: string;
  /** A published guide that covers it instead, held to existing. */
  readonly guide?: string;
}

export interface DocsCoverageInput {
  /** Folder names shipping an `ng-package.json`. */
  readonly entryPoints: readonly string[];
  /** Compiled READMEs by slug — every entry point that has one. */
  readonly documents: ReadonlyMap<string, DocDocument>;
  /** Slugs of the guides the site publishes. */
  readonly guides: ReadonlySet<string>;
  /** Slugs the site holds an authored page component for. */
  readonly pages: ReadonlySet<string>;
  /** The path a failure names when a page is the problem. */
  readonly pagesDir: string;
  /** Defaults to {@link COVERAGE_EXEMPTIONS}, the library's own list. */
  readonly exemptions?: readonly DocsCoverageExemption[];
}

export interface DocsCoverageCounts {
  readonly published: number;
  readonly folded: number;
  readonly exempt: number;
  readonly none: number;
}

export interface DocsCoverageResult {
  readonly problems: readonly string[];
  readonly counts: DocsCoverageCounts;
}

export declare const COVERAGE_EXEMPTIONS: readonly DocsCoverageExemption[];

export declare function coverageProblems(input: DocsCoverageInput): DocsCoverageResult;
