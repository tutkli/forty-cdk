import { SITE_PAGE_INDEX } from '../doc/site-pages';
import { FIRST_PRIMITIVE_SLUG } from '../primitives';

export type SiteSectionId = 'docs' | 'guides';

export interface SiteLink {
  readonly label: string;
  readonly path: string;
}

export interface SiteSection extends SiteLink {
  readonly id: SiteSectionId;
}

export const SITE_SECTIONS: readonly SiteSection[] = [
  { id: 'docs', label: 'Docs', path: `/${SITE_PAGE_INDEX[0]?.slug ?? 'installation'}` },
  { id: 'guides', label: 'Guides', path: '/guides' },
];

export const LANDING_LINKS: readonly SiteLink[] = [
  ...SITE_SECTIONS,
  { label: 'Primitives', path: `/${FIRST_PRIMITIVE_SLUG}` },
];

export function sectionForUrl(url: string): SiteSectionId {
  const first =
    url
      .split(/[?#]/)[0]
      ?.split('/')
      .find((segment) => segment.length > 0) ?? '';

  return first === 'guides' ? 'guides' : 'docs';
}
