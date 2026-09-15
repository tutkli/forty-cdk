import { GITHUB_BLOB_BASE, resolveDocLink } from '../lib/doc-links.mjs';
import { markdownLinksOf } from './doc-markdown.mjs';
import { cellsOf } from './doc-model.mjs';

/**
 * Every piece of markdown one compiled document holds, in document order.
 *
 * The same walk {@link documentMarkdown} serialises, plus the caption `##
 * Examples` had lifted out of it — a page publishes that sentence above its
 * hero, so a link written there is a link the document writes.
 *
 * Table cells are walked with the rest: the corpus writes a large share of its
 * cross-references inside API and attribute tables, and a graph blind to them
 * would call two documents unrelated because the link between them is in a row.
 */
function* markdownOf(document) {
  yield document.title;
  if (document.lede !== null) {
    yield document.lede;
  }
  if (document.caption !== null) {
    yield document.caption;
  }
  for (const block of document.intro) {
    yield* markdownIn(block);
  }
  for (const section of document.sections) {
    yield section.title;
    for (const block of section.blocks) {
      yield* markdownIn(block);
    }
  }
}

function* markdownIn(block) {
  if (block.kind === 'prose') {
    yield block.markdown;
    return;
  }
  const { columns, rows } = cellsOf(block.table);
  yield* columns;
  for (const cells of rows) {
    yield* cells;
  }
}

/** A route with its fragment taken off — the page it lands on. */
function pageRoute(route) {
  return route.split('#')[0];
}

/**
 * Which page publishes each documented path.
 *
 * Read off the route map rather than from the shape of a path, so this knows
 * nothing `buildDocRoutes` has not already decided: two paths that resolve to
 * the same route belong to the same page, which is what makes `../table` and
 * `../table/README.md` one destination — and a folded document, whose route is
 * an anchor inside its host's, part of the host page rather than a page of its
 * own.
 */
function ownersOf(pages, routes) {
  const byRoute = new Map();
  for (const { key, documents } of pages) {
    for (const document of documents) {
      const route = routes.get(document.path);
      if (route !== undefined) {
        byRoute.set(pageRoute(route), key);
      }
    }
  }

  const owners = new Map();
  for (const [repoPath, route] of routes) {
    const key = byRoute.get(pageRoute(route));
    if (key !== undefined) {
      owners.set(repoPath, key);
    }
  }
  return owners;
}

/**
 * The pages one document links, deduplicated and in document order.
 *
 * Only a link the site publishes a page for counts. A fragment, an absolute
 * URL and a path that resolves to a GitHub blob are all left out — the first
 * lands on the document itself, and neither of the others names a page the
 * reader could be sent on to.
 */
function linkedPagesOf(document, routes, owners) {
  const linked = [];
  for (const markdown of markdownOf(document)) {
    for (const { href } of markdownLinksOf(markdown)) {
      const link = resolveDocLink(href, {
        sourcePath: document.path,
        routes,
        blobBase: GITHUB_BLOB_BASE,
      });
      if (link === null || link.kind !== 'route') {
        continue;
      }
      const key = owners.get(link.repoPath);
      if (key !== undefined && !linked.includes(key)) {
        linked.push(key);
      }
    }
  }
  return linked;
}

/**
 * The corpus read as a graph: for every page, the pages related to it
 * ([#1938](https://github.com/tutkli/forty-cdk/issues/1938)).
 *
 * Nothing here is authored. A relationship exists because one document links
 * the other in its prose, which the pipeline already resolves and
 * `pnpm check:doc-links` already gates — so a link removed from a document
 * removes the entry, and a _Related_ block cannot state a connection the
 * documents do not.
 *
 * **The relation is symmetric**, which is the decision this issue was opened to
 * take. Outbound alone leaves every leaf page empty exactly where the block is
 * worth most: `styling-floating-content` links no primitive and is linked by
 * fourteen, `wrapping-non-form-roots` by thirty-two. A reader on either wants the
 * pages that sent them there, and direction is not a distinction they can act
 * on — so the two sets are unioned rather than published apart, outbound first
 * for a caller that keeps this order. The page does not: it lists the union the
 * way the navigation lists documents, which is the order a reader already knows.
 *
 * A page is one or more documents, so an entry point folded into another page's
 * section contributes its links to that page and receives none of its own.
 *
 * @param pages One entry per published page: the key it is addressed by, and
 * the compiled documents whose content it publishes.
 * @param routes Repository path to published route, as `buildDocRoutes` maps
 * them.
 * @returns Every key in `pages`, mapped to the keys related to it — empty for a
 * document that neither links nor is linked.
 */
export function relatedIndexOf(pages, routes) {
  const owners = ownersOf(pages, routes);

  const outbound = new Map();
  for (const { key, documents } of pages) {
    const linked = outbound.get(key) ?? [];
    outbound.set(key, linked);
    for (const document of documents) {
      for (const target of linkedPagesOf(document, routes, owners)) {
        if (target !== key && !linked.includes(target)) {
          linked.push(target);
        }
      }
    }
  }

  const related = new Map([...outbound].map(([key, linked]) => [key, [...linked]]));
  for (const [key, linked] of outbound) {
    for (const target of linked) {
      const inbound = related.get(target);
      if (inbound !== undefined && !inbound.includes(key)) {
        inbound.push(key);
      }
    }
  }
  return related;
}
