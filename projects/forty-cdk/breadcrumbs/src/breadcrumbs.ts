import { Directive, inject, input } from '@angular/core';

import { hostAriaLabel } from 'forty-cdk/core';
import { FOR_BREADCRUMBS_DEFAULTS } from './breadcrumbs-defaults';

/**
 * Headless breadcrumb trail implementing the
 * [WAI-ARIA Breadcrumb pattern](https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/):
 * a `navigation` landmark wrapping a set of links that reveal the page's
 * position within the site hierarchy.
 *
 * The directive contributes only the landmark role + accessible name; the
 * consumer owns the markup structure (an `<ol>` of `<li>` links is the APG
 * recommendation) and applies their own styles. Each link decorated with
 * `[forBreadcrumbItem]` can mark itself the current page via `current`, and
 * visual dividers decorated with `[forBreadcrumbSeparator]` are hidden from
 * assistive technology.
 *
 * There is no keyboard interaction or focus management beyond what the native
 * links provide — breadcrumb links are ordinary tab stops.
 *
 * @example
 * ```html
 * <nav forBreadcrumbs>
 *   <ol>
 *     <li><a forBreadcrumbItem href="/">Home</a></li>
 *     <li forBreadcrumbSeparator aria-hidden="true">/</li>
 *     <li><a forBreadcrumbItem href="/library">Library</a></li>
 *     <li forBreadcrumbSeparator aria-hidden="true">/</li>
 *     <li><a forBreadcrumbItem href="/library/data" current>Data</a></li>
 *   </ol>
 * </nav>
 * ```
 */
@Directive({
  selector: '[forBreadcrumbs]',
  exportAs: 'forBreadcrumbs',
  host: {
    role: 'navigation',
    '[attr.aria-label]': 'resolvedAriaLabel()',
  },
})
export class ForBreadcrumbs {
  readonly #defaults = inject(FOR_BREADCRUMBS_DEFAULTS);

  /**
   * Accessible label for the navigation landmark. Defaults to the scope's
   * `label` (`'Breadcrumb'` unless overridden via
   * `provideForBreadcrumbsDefaults`), so a bare `<nav forBreadcrumbs>` is
   * already a correctly labelled landmark — the conventional name for this
   * pattern. Override it per-instance via `[ariaLabel]` (or point a native
   * `aria-labelledby` at a visible heading) when the page hosts more than one
   * breadcrumb trail and they need to be told apart; set it to `null` to drop
   * the attribute and rely on `aria-labelledby`.
   */
  readonly ariaLabel = input<string | null>(this.#defaults.label);

  protected readonly resolvedAriaLabel = hostAriaLabel(() => this.ariaLabel() || null);
}
