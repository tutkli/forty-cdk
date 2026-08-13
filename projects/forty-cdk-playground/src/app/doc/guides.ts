import { GUIDE_GROUPS, GUIDES } from './guides.generated';

export interface GuideSection {
  readonly title: string;
  readonly anchor: string;
}

export interface GuideMeta {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly group: string;
  readonly sourcePath: string;
  readonly sections: readonly GuideSection[];
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
