import { booleanAttribute, Directive, input } from '@angular/core';

/**
 * Decorative marker for links inside a navigation-menu content. Reflects
 * `data-active` for CSS hooks (the consumer flips it based on the
 * router's current URL — the directive doesn't know about routing).
 *
 * Apply on `<a>`.
 */
@Directive({
  selector: '[forNavigationMenuLink]',
  exportAs: 'forNavigationMenuLink',
  host: {
    '[attr.data-active]': 'active() ? "" : null',
    '[attr.aria-current]': 'active() ? ariaCurrent() : null',
  },
})
export class ForNavigationMenuLink {
  /** When true, this link points at the current page. Reflects `aria-current`. */
  readonly active = input(false, { transform: booleanAttribute });

  /**
   * Value forwarded to `aria-current` when `active` is true. Defaults to
   * `'page'` (the most common case for top-level navigation).
   */
  readonly ariaCurrent = input<'page' | 'step' | 'location' | 'date' | 'time' | 'true'>(
    'page',
  );
}
