import { Directive, inject } from '@angular/core';

import { FOR_AVATAR_CONTEXT } from './avatar-context';

/**
 * Marker for the avatar's fallback content (initials, generic icon, …).
 * Reflects `data-status` from the parent `[forAvatar]` so the consumer can
 * style for the `error` state separately from `idle` / `loading` if needed.
 *
 * The decision of *whether* to render the fallback lives on the root —
 * drive `@if` with `forAvatar.shouldShowFallback()`.
 */
@Directive({
  selector: '[forAvatarFallback]',
  exportAs: 'forAvatarFallback',
  host: {
    '[attr.data-status]': 'parent.status()',
  },
})
export class ForAvatarFallback {
  protected readonly parent = inject(FOR_AVATAR_CONTEXT, { optional: true })!;

  constructor() {
    if (!this.parent) {
      throw new Error(
        '[forty-cdk/avatar] ForAvatarFallback must be used inside a [forAvatar] element.',
      );
    }
  }
}
