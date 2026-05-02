import { computed, signal, type Signal } from '@angular/core';

/**
 * Minimal contract every `Collection` entry must satisfy: it carries the
 * host element so the collection can sort entries by DOM document order.
 */
export interface CollectionHandle {
  readonly host: HTMLElement;
}

/**
 * Generic, signal-backed registry of handles for a primitive's children
 * (e.g. tab triggers, radios, listbox options, dialog titles). Items are
 * exposed in DOM document order so consumers don't have to reason about
 * registration timing — late inserts (via `@if`/`@for`) end up in the
 * right place automatically.
 *
 * The collection itself is not Angular-aware; instantiate it directly on
 * the host directive and call `register` / `unregister` from each child's
 * constructor / `DestroyRef.onDestroy`.
 */
export class Collection<H extends CollectionHandle> {
  readonly #items = signal<readonly H[]>([]);

  /** All registered handles, sorted by DOM document order. */
  readonly items: Signal<readonly H[]> = computed(() => {
    const snap = this.#items();
    if (snap.length < 2) {
      return snap;
    }
    return [...snap].sort(byDomOrder);
  });

  register(handle: H): void {
    this.#items.update((arr) => (arr.includes(handle) ? arr : [...arr, handle]));
  }

  unregister(handle: H): void {
    this.#items.update((arr) => arr.filter((h) => h !== handle));
  }

  /** Lookup by host element. Returns `undefined` if no handle has that host. */
  findByHost(el: HTMLElement): H | undefined {
    return this.items().find((h) => h.host === el);
  }

  /** Index in DOM order, or -1 if not registered. */
  indexOfHost(el: HTMLElement): number {
    return this.items().findIndex((h) => h.host === el);
  }
}

function byDomOrder<H extends CollectionHandle>(a: H, b: H): number {
  if (a.host === b.host) {
    return 0;
  }
  const pos = a.host.compareDocumentPosition(b.host);
  if (pos & Node.DOCUMENT_POSITION_FOLLOWING) {
    return -1;
  }
  if (pos & Node.DOCUMENT_POSITION_PRECEDING) {
    return 1;
  }
  return 0;
}
