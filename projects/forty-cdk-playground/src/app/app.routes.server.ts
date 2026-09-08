import { RenderMode, type ServerRoute } from '@angular/ssr';

import { ERROR_CODE_INDEX } from './doc/error-codes';

/**
 * Every route is prerendered, and the one parameterised route says which
 * parameters exist ([#1736](https://github.com/tutkli/forty-cdk/issues/1736)).
 *
 * The params come from the same generated roster the pages read, so a code
 * reaches the emit for the one reason it exists in library source — there is no
 * list of routes to keep beside it. Client rendering is not an option here: the
 * site is served as static files from a path prefix, where an un-emitted
 * `/errors/FORCDK-DIALOG-001` is a 404 before any router runs.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: 'errors/:code',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => ERROR_CODE_INDEX.map((entry) => ({ code: entry.code })),
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
