import { foldedSlug } from '../docs/doc-fold.mjs';
import { foldTargetOf } from './doc-contract.mjs';

/**
 * What the documentation site covers, held against what the library ships
 * ([#1809](https://github.com/tutkli/forty-cdk/issues/1809)).
 *
 * `check-entrypoint-registration.mjs` already holds every entry point to eight
 * registration lists — and every one of them is compiler configuration. A new
 * entry point breaks the build when its path is missing and breaks nothing when
 * it has no page, which is how five maintained READMEs came to be unreachable
 * from the site with every gate green. `forty-cdk/shared` was the worst of them:
 * it publishes the three accessibility limits of
 * [#1735](https://github.com/tutkli/forty-cdk/issues/1735), and no consumer
 * could read them.
 *
 * Every folder shipping an `ng-package.json` is accounted for one of three ways,
 * and only the last is a judgement someone has to write down:
 *
 * 1. its README declares a nav group, and the site publishes a route for it;
 * 2. its README declares `foldInto`, and the site republishes it inside the page
 *    it names — checked down to the anchor, so a renamed host section fails here
 *    rather than quietly dropping the content;
 * 3. it is exempt for a stated reason, optionally deferring to a guide this
 *    check then holds the site to publishing.
 *
 * Read backwards, the same rule is the half the audit called out as the one
 * nobody notices: an exemption naming a folder that is gone, a fold into a page
 * that publishes none, and a page directory the site still holds for an entry
 * point the library no longer ships.
 *
 * That last pair is stated over the authored page directories rather than over
 * the router's table, which is generated from this same frontmatter
 * ([#1811](https://github.com/tutkli/forty-cdk/issues/1811)) and would agree
 * with it by construction. The page is the artefact a human writes, so it is the
 * one that can be missing.
 */

/**
 * A folder with an `ng-package.json` the site deliberately publishes no page
 * for, and the reason it does not.
 *
 * The reason is a data field rather than a comment: it is what the failure
 * message prints and what a reviewer weighs, so it travels with the entry
 * rather than sitting in prose beside the list.
 */
export const COVERAGE_EXEMPTIONS = [
  {
    slug: 'core',
    reason:
      'The internal tier. Consumers import each primitive from its own entry point, and what does ' +
      'cross into the public API is re-exported from forty-cdk/shared, which is documented.',
  },
  {
    slug: 'core-overlay',
    reason:
      'The internal tier for overlay machinery, split out of core in #1723 to keep it off ' +
      'non-overlay bundles. Nothing in it is consumer-facing.',
  },
  {
    slug: 'internationalized-date',
    reason:
      'Two adapter values over an optional peer. The question a reader arrives with is which ' +
      'adapter to provide, not what this entry point exports, so the Date adapters guide covers ' +
      'it and links back to the README for the entry point itself.',
    guide: 'date-adapters',
  },
];

const anchorsOf = (document) => [
  ...document.sections.map((section) => section.slug),
  ...document.sections.flatMap((section) => section.headings.map((heading) => heading.slug)),
];

function coverageOf(slug, documents, exemptions, problems) {
  const document = documents.get(slug);
  const exemption = exemptions.get(slug);

  if (document === undefined) {
    if (exemption === undefined) {
      problems.push(
        `${slug} ships an entry point with no README at all — write one and declare its nav group, ` +
          'or add it to COVERAGE_EXEMPTIONS in scripts/lib/docs-coverage.mjs with the reason it ' +
          'needs none',
      );
      return 'none';
    }
    return 'exempt';
  }

  const { meta } = document;
  const kind =
    meta.group !== 'none' ? 'published' : foldTargetOf(meta) !== null ? 'folded' : 'none';

  if (kind !== 'none') {
    if (exemption !== undefined) {
      problems.push(
        `${slug} carries a documentation exemption and is documented all the same ` +
          `(${kind === 'published' ? `group: ${meta.group}` : `foldInto: ${meta.foldInto}`}) — ` +
          'drop the exemption',
      );
    }
    return kind;
  }

  if (exemption === undefined) {
    problems.push(
      `${slug} ships a README the site publishes nowhere — its frontmatter declares group: none and ` +
        'no foldInto. Give it a nav group, fold it into another page with foldInto, or add it to ' +
        'COVERAGE_EXEMPTIONS in scripts/lib/docs-coverage.mjs with the reason it needs none',
    );
    return 'none';
  }

  if (meta.foldInto !== null) {
    problems.push(
      `${slug} declares foldInto: ${JSON.stringify(meta.foldInto)}, which is not a ` +
        '<page>#<section> target',
    );
  }

  return 'exempt';
}

function foldProblems(slug, document, documents, problems) {
  const target = foldTargetOf(document.meta);
  const host = documents.get(target.slug);

  if (host === undefined || host.meta.group === 'none') {
    problems.push(
      `${slug} folds into "${target.slug}", which publishes no page of its own — fold it into a ` +
        'published page, or give it one',
    );
    return;
  }

  const sections = host.sections.map((section) => section.slug);
  if (!sections.includes(target.section)) {
    problems.push(
      `${slug} folds into "/${target.slug}#${target.section}", and that page declares no such ` +
        `section — it has ${sections.map((one) => `#${one}`).join(', ')}. The anchor is what the ` +
        'READMEs link to, so a renamed heading is a broken link rather than a moved one',
    );
  }

  const hostAnchors = new Set(anchorsOf(host));
  const clashes = [slug, ...anchorsOf(document).map((anchor) => foldedSlug(slug, anchor))].filter(
    (anchor) => hostAnchors.has(anchor),
  );
  if (clashes.length > 0) {
    problems.push(
      `${slug} folded into "${target.slug}" mints ${clashes.length} anchor(s) the host already ` +
        `emits (${clashes.join(', ')}) — one of the two wins and the other link lands on it`,
    );
  }
}

/**
 * Every way the site's coverage and the library disagree.
 *
 * @param entryPoints Folder names shipping an `ng-package.json`.
 * @param documents Compiled READMEs by slug — every entry point that has one.
 * @param guides Slugs of the guides the site publishes.
 * @param pages Slugs the site holds an authored page component for.
 * @param pagesDir The path a failure names when a page is the problem.
 * @param exemptions The list to hold the corpus to; the library's own by
 * default, and a caller passes its own to state a rule over a corpus of its own.
 */
export function coverageProblems({
  entryPoints,
  documents,
  guides,
  pages,
  pagesDir,
  exemptions = COVERAGE_EXEMPTIONS,
}) {
  const problems = [];
  const bySlug = new Map(exemptions.map((exemption) => [exemption.slug, exemption]));
  const known = new Set(entryPoints);
  const counts = { published: 0, folded: 0, exempt: 0, none: 0 };

  for (const slug of entryPoints) {
    counts[coverageOf(slug, documents, bySlug, problems)] += 1;
  }

  for (const exemption of exemptions) {
    if (!known.has(exemption.slug)) {
      problems.push(
        `COVERAGE_EXEMPTIONS names ${exemption.slug}, which ships no ng-package.json — the entry ` +
          'point is gone and its exemption outlived it',
      );
      continue;
    }
    if (exemption.reason.trim() === '') {
      problems.push(`COVERAGE_EXEMPTIONS names ${exemption.slug} with no stated reason`);
    }
    if (exemption.guide !== undefined && !guides.has(exemption.guide)) {
      problems.push(
        `${exemption.slug} is exempt because the "${exemption.guide}" guide covers it, and the site ` +
          'publishes no such guide — see PUBLISHED_GUIDES in scripts/lib/doc-site.mjs',
      );
    }
  }

  for (const [slug, document] of documents) {
    if (foldTargetOf(document.meta) !== null) {
      foldProblems(slug, document, documents, problems);
    }
  }

  const published = new Set(
    [...documents]
      .filter(([slug, document]) => known.has(slug) && document.meta.group !== 'none')
      .map(([slug]) => slug),
  );

  for (const slug of pages) {
    if (!published.has(slug)) {
      problems.push(
        `${pagesDir}/${slug}/ holds a page no entry point publishes a document for — ` +
          `${known.has(slug) ? 'its README declares group: none' : 'the library ships no such entry point'}, ` +
          'so the page renders content nothing keeps in step',
      );
    }
  }

  for (const slug of published) {
    if (!pages.has(slug)) {
      problems.push(
        `${slug} declares a nav group and ${pagesDir} holds no ${slug}/${slug}.page.ts, so the ` +
          'navigation links to a page the generated routes cannot load',
      );
    }
  }

  if (
    problems.length === 0 &&
    counts.published + counts.folded + counts.exempt !== entryPoints.length
  ) {
    problems.push(
      `accounted for ${counts.published} published + ${counts.folded} folded + ${counts.exempt} ` +
        `exempt entry point(s) against the ${entryPoints.length} that ship an ng-package.json — the ` +
        'scan and the library disagree, so a green run proves nothing about the difference',
    );
  }

  return { problems, counts };
}
