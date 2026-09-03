import {
  compileDocument,
  DocCompileError,
  type DocDocument,
  type DocKind,
  type DocProblem,
} from '../../../../../../scripts/docs/doc-model.mjs';
import type { DocFile } from './doc-corpus';

/**
 * A valid frontmatter block, for a case that is stated about a README's body
 * rather than about its metadata
 * ([#1808](https://github.com/tutkli/forty-cdk/issues/1808)).
 */
export const FRONTMATTER = [
  '---',
  'title: Thing',
  'group: primitives',
  'archetype: [composable-ui]',
  '---',
];

/**
 * Compile a corpus document the way the generator does, reading its kind from
 * the directory it was written in — an entry point's README, one of the site's
 * own pages ([#1812](https://github.com/tutkli/forty-cdk/issues/1812)), or a
 * guide. Only the first declares frontmatter and a lede.
 */
export function compile(doc: DocFile): DocDocument {
  return compileDocument(doc.markdown, {
    path: doc.path,
    slug: doc.slug,
    kind: kindOf(doc.path),
  });
}

function kindOf(path: string): DocKind {
  if (path.startsWith('projects/forty-cdk/')) {
    return 'primitive';
  }
  return path.startsWith('docs/site/') ? 'page' : 'guide';
}

/**
 * Compile markdown the compiler is expected to refuse, returning the problems
 * it reported.
 *
 * Compiled as a guide, because these cases are stated about the body: every
 * guard they reach reads the token tree and treats both halves of the corpus
 * alike, and compiling as a README would prepend a frontmatter block that slid
 * every line number they name. The rules that *are* specific to a README —
 * frontmatter and the lede — have their own cases, through `readmeProblemsOf`.
 *
 * Fails rather than returning an empty list when the compile succeeds: a case
 * that asserts "no problems match" would pass if the guard were deleted.
 */
export function problemsOf(markdown: string, path = 'fixture.md'): readonly DocProblem[] {
  return refuse(markdown, path, 'guide');
}

/** The same, for markdown compiled as an entry point's README. */
export function readmeProblemsOf(
  markdown: string,
  path = 'projects/forty-cdk/fixture/README.md',
): readonly DocProblem[] {
  return refuse(markdown, path, 'primitive');
}

function refuse(markdown: string, path: string, kind: DocKind): readonly DocProblem[] {
  try {
    compileDocument(markdown, { path, slug: 'fixture', kind });
  } catch (error) {
    if (error instanceof DocCompileError) {
      return error.problems;
    }
    throw error;
  }
  throw new Error(`${path} compiled without a problem, and the case expects it to be refused`);
}
