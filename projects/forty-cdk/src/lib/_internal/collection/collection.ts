import { signal, type Signal } from '@angular/core';

/**
 * Minimal contract every `Collection` entry must satisfy: it carries the
 * host element so consumers can correlate handles with DOM nodes (e.g.
 * `findByHost`, focus moves, `aria-activedescendant` lookups).
 */
export interface CollectionHandle {
  readonly host: HTMLElement;
}

/**
 * Generic, signal-backed registry of handles for a primitive's children
 * (e.g. tab triggers, radios, listbox options, dialog titles). Items are
 * exposed in registration order, which matches DOM document order under
 * standard `@for` / `@if` template usage because Angular constructs child
 * directives in template order.
 *
 * The collection itself is not Angular-aware; instantiate it directly on
 * the host directive and call `register` / `unregister` from each child's
 * constructor / `DestroyRef.onDestroy`.
 */
export class Collection<H extends CollectionHandle> {
  readonly #items = signal<readonly H[]>([]);

  /**
   * All registered handles, in registration order.
   *
   * Under standard Angular template usage (`@for`, `@if`, static children)
   * registration order matches DOM document order, because each child
   * directive constructs as the framework walks the template top-to-bottom
   * and unregisters when its view is destroyed. Consumers that need
   * authoritative DOM-order resolution against arbitrary external DOM
   * mutations should compute it locally with `MutationObserver`.
   */
  readonly items: Signal<readonly H[]> = this.#items.asReadonly();

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

  /** Index in registration order, or -1 if not registered. */
  indexOfHost(el: HTMLElement): number {
    return this.items().findIndex((h) => h.host === el);
  }
}