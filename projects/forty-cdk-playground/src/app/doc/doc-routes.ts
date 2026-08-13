import { LocationStrategy } from '@angular/common';
import { inject } from '@angular/core';

import { buildDocRoutes, resolveDocLink } from '../../../../../scripts/lib/doc-links.mjs';
import { PLAYGROUND_GROUPS } from '../primitives';
import { GITHUB_BLOB_BASE } from '../ui/github';
import { GUIDES } from './guides.generated';
import type { DocLinkResolver } from './markdown';

const DOC_ROUTES = buildDocRoutes({
  primitiveSlugs: PLAYGROUND_GROUPS.flatMap((group) =>
    group.primitives.map((primitive) => primitive.slug),
  ),
  guideSlugs: GUIDES.map((guide) => guide.slug),
});

export function primitiveSourcePath(slug: string): string {
  return `projects/forty-cdk/${slug}/README.md`;
}

export function injectDocLinkResolver(): DocLinkResolver {
  const locationStrategy = inject(LocationStrategy);
  return (href, sourcePath) =>
    resolveDocLink(href, {
      sourcePath,
      routes: DOC_ROUTES,
      blobBase: GITHUB_BLOB_BASE,
      prepareUrl: (url) => locationStrategy.prepareExternalUrl(url),
    });
}
