import {
  compileDocument,
  DocCompileError,
  type DocDocument,
  type DocProblem,
} from '../../../../../../scripts/docs/doc-model.mjs';
import type { DocFile } from './doc-corpus';

/** Compile a corpus document the way the generator does. */
export function compile(doc: DocFile): DocDocument {
  return compileDocument(doc.markdown, {
    path: doc.path,
    slug: doc.slug,
    kind: doc.path.startsWith('docs/') ? 'guide' : 'primitive',
  });
}

/**
 * Compile markdown the compiler is expected to refuse, returning the problems
 * it reported.
 *
 * Fails rather than returning an empty list when the compile succeeds: a case
 * that asserts "no problems match" would pass if the guard were deleted.
 */
export function problemsOf(markdown: string, path = 'fixture.md'): readonly DocProblem[] {
  try {
    compileDocument(markdown, { path, slug: 'fixture', kind: 'primitive' });
  } catch (error) {
    if (error instanceof DocCompileError) {
      return error.problems;
    }
    throw error;
  }
  throw new Error(`${path} compiled without a problem, and the case expects it to be refused`);
}
