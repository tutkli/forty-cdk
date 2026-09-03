import { buildDocRoutes, resolveDocLink } from '../../../../../scripts/lib/doc-links.mjs';
import { DOC_INDEX } from '../../generated/doc-index.generated';
import { GUIDES } from './guides.generated';
import { buildSearchEntries } from './search-index';
import { SITE_PAGE_INDEX } from './site-pages';
import { compile } from './testing/compile';
import { APP_ROUTES, PAGE_DOCS, PRIMITIVE_DOCS } from './testing/doc-corpus';

/**
 * The pages the site publishes about itself
 * ([#1812](https://github.com/tutkli/forty-cdk/issues/1812)).
 *
 * They are documents like every other, so the compiler, the anchor invariants
 * and the structure snapshots already sweep them — `SITE_DOCS` carries them and
 * nothing here restates what those files assert. What is left is the part that
 * is specific to being served from the **root**: a slug that has to stay clear
 * of every primitive's, links that resolve from a directory one level deeper
 * than the guides, and a root route that is a page rather than a redirect.
 */

/** A floor rather than a count: writing a fourth page is not a test failure. */
const PAGE_FLOOR = 3;

const publishedPrimitives = PRIMITIVE_DOCS.map((doc) => compile(doc)).filter(
  (document) => document.meta?.group !== 'none',
);

const pages = PAGE_DOCS.map((doc) => compile(doc));

describe('the site pages as they stand', () => {
  it('publishes the four entry points a reader arrives through', () => {
    const slugs = SITE_PAGE_INDEX.map((page) => page.slug);

    expect(slugs).toContain('installation');
    expect(slugs).toContain('getting-started');
    expect(slugs).toContain('concepts');
    expect(APP_ROUTES).toContain("import('./pages/home.page').then((m) => m.HomePage)");
  });

  it('compiles each one as prose the site can render, with sections to navigate', () => {
    expect(pages.length).toBeGreaterThanOrEqual(PAGE_FLOOR);

    for (const page of pages) {
      expect(page.kind).toBe('page');
      expect(page.meta).toBeNull();
      expect(page.title).not.toBe('');
      expect(page.sections.length).toBeGreaterThan(0);
    }
  });

  /**
   * The one failure a site page can cause that a guide cannot: it is served from
   * the root, so a slug shared with an entry point is two routes for one path.
   * `readSitePages` refuses that at build time; this states it over the corpus
   * the library actually ships, which is the half the build-time check cannot
   * prove on its own.
   */
  it('takes no slug a primitive already owns', () => {
    const taken = new Set(publishedPrimitives.map((document) => document.slug));
    const clashing = pages.filter((page) => taken.has(page.slug));

    expect(taken.size).toBeGreaterThan(0);
    expect(clashing.map((page) => page.slug)).toEqual([]);
  });

  it('takes neither the guide index route nor a guide slug', () => {
    const guides = new Set(GUIDES.map((guide) => guide.slug));

    for (const page of pages) {
      expect(page.slug).not.toBe('guides');
      expect(guides.has(page.slug)).toBe(false);
    }
  });

  it('reads its navigation title and description off the document itself', () => {
    expect(SITE_PAGE_INDEX).toHaveLength(pages.length);

    for (const page of SITE_PAGE_INDEX) {
      expect(page.title.trim()).not.toBe('');
      expect(page.description.trim()).not.toBe('');
    }
  });

  /**
   * The description *is* the lede, so a page that also renders it in its body
   * publishes the same sentence twice — the duplication
   * [#1808](https://github.com/tutkli/forty-cdk/issues/1808) found in four
   * README pages in production. The compiler lifts it out for every kind but a
   * guide, and this is what would notice if a site page stopped being one of
   * them.
   */
  it('publishes its lede once, in the header rather than the body as well', () => {
    for (const page of pages) {
      expect(page.lede).not.toBeNull();

      const intro = page.intro.map((block) => block.markdown).join('\n');
      expect(intro).not.toContain(page.lede!);
    }
  });
});

describe('a link into or out of a site page', () => {
  const routes = buildDocRoutes({
    primitiveSlugs: ['switch'],
    guideSlugs: ['styling'],
    pageSlugs: ['installation', 'getting-started'],
  });

  const resolve = (href: string, sourcePath: string) =>
    resolveDocLink(href, { sourcePath, routes, blobBase: 'https://example.test/blob/main/' });

  it('resolves a sibling page to a root route rather than to a repository blob', () => {
    expect(resolve('./getting-started.md', 'docs/site/installation.md')).toMatchObject({
      kind: 'route',
      route: '/getting-started',
    });
  });

  it('resolves a guide one directory up, where the guides actually live', () => {
    expect(resolve('../styling.md', 'docs/site/installation.md')).toMatchObject({
      kind: 'route',
      route: '/guides/styling',
    });
  });

  it('resolves a primitive README from two directories up', () => {
    expect(
      resolve('../../projects/forty-cdk/switch/README.md', 'docs/site/concepts.md'),
    ).toMatchObject({ kind: 'route', route: '/switch' });
  });

  it('resolves a link written from a guide into a site page', () => {
    expect(resolve('./site/installation.md', 'docs/styling.md')).toMatchObject({
      kind: 'route',
      route: '/installation',
    });
  });

  it('leaves an unregistered page pointing at its source, not at a route that would 404', () => {
    expect(resolve('./concepts.md', 'docs/site/installation.md')).toMatchObject({
      kind: 'source',
      href: 'https://example.test/blob/main/docs/site/concepts.md',
    });
  });
});

describe('the root route', () => {
  /**
   * The redirect is the finding itself: `/` served a 282-byte refresh stub
   * pointing at *accordion*, so a reader arriving from npm landed on an
   * accordion's API reference. The wildcard did the same to a mistyped URL.
   */
  it('redirects nowhere — neither the root nor the wildcard', () => {
    expect(APP_ROUTES).not.toContain('redirectTo');
  });

  it('answers an unknown path with a page of its own', () => {
    expect(APP_ROUTES).toContain("path: '**'");
    expect(APP_ROUTES).toContain("import('./pages/not-found.page').then((m) => m.NotFoundPage)");
  });
});

describe('the ⌘K palette', () => {
  const entries = buildSearchEntries([], DOC_INDEX, [], SITE_PAGE_INDEX);

  it('carries one entry per site page', () => {
    const found = entries.filter((entry) => entry.kind === 'page');

    expect(found.map((entry) => entry.path)).toEqual(
      SITE_PAGE_INDEX.map((page) => `/${page.slug}`),
    );
  });

  it('carries the sections of each one, anchored at the ids its page emits', () => {
    const sections = entries.filter((entry) => entry.kind === 'section');
    const declared = pages.reduce((total, page) => total + page.sections.length, 0);

    expect(sections).toHaveLength(declared);
    for (const page of pages) {
      for (const section of page.sections) {
        expect(sections.map((entry) => entry.path)).toContain(`/${page.slug}#${section.slug}`);
      }
    }
  });

  /**
   * A reader typing "install" wants the installation page, not the first
   * primitive whose README mentions installing — and `filterSearchEntries`
   * preserves insertion order, so ordering the index is the whole mechanism.
   */
  it('offers a site page before a primitive that merely mentions the same word', () => {
    const withPrimitives = buildSearchEntries(
      [{ label: 'Primitives', primitives: [{ slug: 'switch', title: 'Switch', description: '' }] }],
      DOC_INDEX,
      [],
      SITE_PAGE_INDEX,
    );

    const first = withPrimitives.findIndex((entry) => entry.kind === 'page');
    const primitive = withPrimitives.findIndex((entry) => entry.kind === 'primitive');

    expect(first).toBeGreaterThanOrEqual(0);
    expect(primitive).toBeGreaterThan(first);
  });
});
