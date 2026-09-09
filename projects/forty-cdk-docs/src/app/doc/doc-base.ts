import { LocationStrategy } from '@angular/common';
import { inject } from '@angular/core';

import { DOC_BASE_TOKEN } from '../../../../../scripts/lib/doc-links.mjs';

/** Substitutes the site's base href into the markup a compiled page carries. */
export type DocBase = (html: string) => string;

/**
 * The one thing a compiled document cannot be rendered with at build time.
 *
 * Every href a page publishes is resolved before the build finishes, but the
 * path the site is served from is not knowable then — it is `/forty-cdk/` on
 * Pages and `/` on a dev server, and only the running app can say which. So the
 * renderer writes a token where the base belongs and this puts the real one in,
 * from the same `LocationStrategy` the router prepares its own URLs with.
 */
export function injectDocBase(): DocBase {
  const base = inject(LocationStrategy).prepareExternalUrl('/');
  return (html) => html.replaceAll(DOC_BASE_TOKEN, base);
}
