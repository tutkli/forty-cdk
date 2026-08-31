/**
 * The site's document routes, derived from the corpus rather than announced
 * beside it ([#1811](https://github.com/tutkli/forty-cdk/issues/1811)).
 *
 * A primitive used to be registered three times — a `paths` entry, a nav entry
 * and a lazy route — of which only the first was gated, and the two unguarded
 * ones are what let five maintained READMEs go unreachable
 * ([#1809](https://github.com/tutkli/forty-cdk/issues/1809)). The nav went first
 * ([#1808](https://github.com/tutkli/forty-cdk/issues/1808)); the routes follow
 * here, leaving the content directory itself and the compiler configuration that
 * has to stay explicit.
 *
 * The emitted specifiers are literals rather than interpolated at runtime: a
 * lazy route only splits into a chunk of its own if the bundler can see the
 * module it names.
 */

const EXPORTED_CLASS = /^export class (\w+)/gm;

const pageModuleOf = (slug) => `../app/demos/${slug}/${slug}.page`;
const GUIDE_MODULE = '../app/guides/guide.page';

/**
 * The component a primitive's page is expected to export, derived from its slug.
 *
 * Derived rather than read, so the naming convention is enforced instead of
 * discovered: a page class named anything else fails {@link pageProblems} with
 * the name it should carry, rather than resolving to whatever the file happens
 * to export.
 */
export function pageSymbolOf(slug) {
  return `${slug.replace(/(?:^|-)([a-z0-9])/g, (_, char) => char.toUpperCase())}Page`;
}

/** The repository path the route generated for `slug` resolves to. */
export function pageFileOf(slug) {
  return `projects/forty-cdk-playground/src/app/demos/${slug}/${slug}.page.ts`;
}

/**
 * Every way a published document and the page component its route would load
 * disagree.
 *
 * @param pages One entry per published primitive: its slug and the source of its
 * page module, `null` when that file does not exist.
 */
export function pageProblems(pages) {
  const problems = [];

  for (const { slug, source } of pages) {
    const symbol = pageSymbolOf(slug);
    const path = pageFileOf(slug);

    if (source === null) {
      problems.push({
        path,
        line: 1,
        message:
          `${slug} declares a nav group and ships no page component to render it — write ` +
          `${symbol} here, or declare group: none until the page exists`,
      });
      continue;
    }

    const exported = [...source.matchAll(EXPORTED_CLASS)].map((match) => match[1]);
    if (!exported.includes(symbol)) {
      problems.push({
        path,
        line: 1,
        message:
          `the route generated for ${slug} imports "${symbol}", and this module exports ` +
          `${exported.length > 0 ? exported.map((name) => `"${name}"`).join(', ') : 'no class'} — ` +
          'a page component is named after the slug it is served under',
      });
    }
  }

  return problems;
}

function primitiveRoute(slug) {
  return [
    '  {',
    `    path: '${slug}',`,
    '    loadComponent: () =>',
    `      import('${pageModuleOf(slug)}').then((m) => m.${pageSymbolOf(slug)}),`,
    '  },',
  ].join('\n');
}

/**
 * Every guide route loads the one `GuidePage` and hands it its slug through
 * route data, which `withComponentInputBinding()` binds to the component's
 * `slug` input.
 */
function guideRoute(slug) {
  return [
    '  {',
    `    path: 'guides/${slug}',`,
    `    data: { slug: '${slug}' },`,
    `    loadComponent: () => import('${GUIDE_MODULE}').then((m) => m.GuidePage),`,
    '  },',
  ].join('\n');
}

/**
 * The generated route table: one lazy route per published primitive and one per
 * guide, in the order the corpus was read.
 */
export function routesModule({ primitiveSlugs, guideSlugs }) {
  const routes = [...primitiveSlugs.map(primitiveRoute), ...guideSlugs.map(guideRoute)].join('\n');

  return (
    `import type { Routes } from '@angular/router';\n\n` +
    `export const DOC_ROUTES: Routes = [\n${routes}\n];\n`
  );
}
