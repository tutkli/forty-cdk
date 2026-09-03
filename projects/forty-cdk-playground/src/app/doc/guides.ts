import { GUIDE_GROUPS, GUIDES } from '../../generated/guides.generated';

/**
 * One guide the site publishes, as its registry entry rather than as its
 * content.
 *
 * Only `group` is authored beside the guide: the title is the document's own
 * `# ` heading and the description its lede, which the compiler lifts out of
 * the intro so that the page header showing it is not quoting the body below
 * ([#1808](https://github.com/tutkli/forty-cdk/issues/1808)).
 */
export interface GuideMeta {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly group: string;
  /** Repository-relative path of the markdown the guide is compiled from. */
  readonly sourcePath: string;
}

export interface GuideGroup {
  readonly id: string;
  readonly label: string;
  readonly slugs: readonly string[];
}

export interface ResolvedGuideGroup {
  readonly id: string;
  readonly label: string;
  readonly guides: readonly GuideMeta[];
}

export function guideBySlug(slug: string): GuideMeta {
  const found = GUIDES.find((guide) => guide.slug === slug);
  if (!found) {
    throw new Error(`[playground] unknown guide slug: ${slug}`);
  }
  return found;
}

export const GUIDE_INDEX: readonly ResolvedGuideGroup[] = GUIDE_GROUPS.map((group) => ({
  id: group.id,
  label: group.label,
  guides: group.slugs.map((slug) => guideBySlug(slug)),
}));
