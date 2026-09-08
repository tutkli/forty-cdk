import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { compileDocument, DocCompileError } from '../docs/doc-model.mjs';
import { checkContract, foldTargetOf } from './doc-contract.mjs';
import { readEntryPointDocs, readGuides, readSitePages, SITE_DIR } from './doc-site.mjs';
import { repoRoot } from './repo-path.mjs';

/**
 * Compile every document the repository holds, then hold the whole corpus to
 * the page-template contract ([#1808](https://github.com/tutkli/forty-cdk/issues/1808)).
 *
 * The contract check runs over every entry point README, published or not: a
 * document with no page yet still declares an archetype, and holding it to that
 * archetype now is what keeps it publishable later.
 *
 * One definition, two drivers. `gen-doc-model.mjs` emits the site's generated
 * modules from this and `gen-llms-txt.mjs` emits the markdown artifacts
 * ([#1816](https://github.com/tutkli/forty-cdk/issues/1816)) — so the second
 * serialisation cannot be compiled from a corpus the first never saw, which is
 * the whole reason the artifacts are a consumer of the document model rather
 * than a generator of their own.
 *
 * @throws {DocCompileError} with every problem across every document, collected
 * rather than thrown at the first one.
 */
export function compileCorpus() {
  const registeredGuides = readGuides();
  const sources = [
    ...readEntryPointDocs().map((doc) => ({ ...doc, kind: 'primitive' })),
    ...registeredGuides.map((guide) => ({
      slug: guide.slug,
      path: `docs/${guide.file}`,
      file: join(repoRoot, 'docs', guide.file),
      kind: 'guide',
    })),
    ...readSitePages().map((page) => ({
      slug: page.slug,
      path: `docs/site/${page.file}`,
      file: join(SITE_DIR, page.file),
      kind: 'page',
    })),
  ];

  const compiled = [];
  const problems = [];
  for (const source of sources) {
    try {
      compiled.push(
        compileDocument(readFileSync(source.file, 'utf8'), {
          path: source.path,
          slug: source.slug,
          kind: source.kind,
        }),
      );
    } catch (error) {
      if (!(error instanceof DocCompileError)) {
        throw error;
      }
      problems.push(...error.problems);
    }
  }

  if (problems.length > 0) {
    throw new DocCompileError(problems);
  }

  const readmes = compiled.filter((document) => document.kind === 'primitive');
  const contract = checkContract(readmes);
  if (contract.length > 0) {
    throw new DocCompileError(contract);
  }

  const unpublished = readmes.filter((document) => document.meta.group === 'none');
  return {
    documents: compiled.filter((document) => document.meta?.group !== 'none'),
    folded: unpublished.filter((document) => foldTargetOf(document.meta) !== null),
    unpublished,
    guideGroups: new Map(registeredGuides.map((guide) => [guide.slug, guide.group])),
  };
}
