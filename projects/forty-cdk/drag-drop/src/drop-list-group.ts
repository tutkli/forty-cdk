import { Directive, InjectionToken, signal, type Signal } from '@angular/core';

import type { ForDropListContext } from './drag-drop-context';

export const FOR_DROP_LIST_GROUP = new InjectionToken<ForDropListGroup>('FOR_DROP_LIST_GROUP');

/**
 * Groups sibling `[forDropList]` elements so items can be transferred between
 * them without hand-wiring `[connectedTo]` on each list. Every list nested
 * under `[forDropListGroup]` automatically becomes a connected transfer target
 * for every other member of the group.
 */
@Directive({
  selector: '[forDropListGroup]',
  exportAs: 'forDropListGroup',
  providers: [{ provide: FOR_DROP_LIST_GROUP, useExisting: ForDropListGroup }],
})
export class ForDropListGroup {
  readonly #members = signal<readonly ForDropListContext[]>([]);

  /** All registered drop lists in this group, in registration order. */
  readonly members: Signal<readonly ForDropListContext[]> = this.#members.asReadonly();

  /** @internal */
  register(ctx: ForDropListContext): void {
    const current = this.#members();
    if (current.includes(ctx)) {
      return;
    }
    this.#members.set([...current, ctx]);
  }

  /** @internal */
  unregister(ctx: ForDropListContext): void {
    this.#members.set(this.#members().filter((c) => c !== ctx));
  }
}
