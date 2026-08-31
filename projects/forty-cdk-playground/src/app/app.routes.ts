import type { Routes } from '@angular/router';

import { DOC_ROUTES } from '../generated/routes.generated';

/**
 * The site's routes: its own chrome, plus the document routes generated from
 * the content tree ([#1811](https://github.com/tutkli/forty-cdk/issues/1811)).
 *
 * Nothing per-primitive is authored here. A primitive appears because its README
 * declares a nav group and `demos/<slug>/` holds the page — the same two facts
 * the nav is derived from — so there is no third place to forget.
 */
export const routes: Routes = [
  { path: '', redirectTo: 'accordion', pathMatch: 'full' },
  {
    path: 'guides',
    loadComponent: () => import('./guides/guides.page').then((m) => m.GuidesPage),
  },
  ...DOC_ROUTES,
  { path: '**', redirectTo: 'accordion' },
];
