import { SITE_PAGES } from '../../generated/site-pages.generated';

/**
 * One page the site publishes about itself rather than about an entry point
 * ([#1812](https://github.com/tutkli/forty-cdk/issues/1812)).
 *
 * Nothing here is authored twice: the title is the document's own `# ` heading
 * and the description its lede, both read by `readSitePages` at build time.
 */
export interface SitePageMeta {
  /** The route the page is served under, from the site root. */
  readonly slug: string;
  readonly title: string;
  readonly description: string;
}

export function sitePageBySlug(slug: string): SitePageMeta {
  const found = SITE_PAGES.find((page) => page.slug === slug);
  if (!found) {
    throw new Error(`[playground] unknown site page slug: ${slug}`);
  }
  return found;
}

/** The site's pages in navigation order, which is their reading order. */
export const SITE_PAGE_INDEX: readonly SitePageMeta[] = SITE_PAGES;
