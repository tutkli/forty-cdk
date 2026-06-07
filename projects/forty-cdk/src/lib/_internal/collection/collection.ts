import { computed, signal, type Signal } from '@angular/core';

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
 * exposed in **DOM document order**, resolved from each handle's `host`
 * element regardless of the order children registered in.
 *
 * Resolving document order (rather than registration order) keeps
 * `items()` / `indexOfHost` correct under templates that reorder a list at
 * runtime — `@for (... ; track id)` driven by a sort or drag-reorder moves
 * existing DOM nodes without re-running child constructors, so registration
 * order would otherwise freeze at the original sequence and corrupt
 * `aria-posinset` / `aria-setsize` and keyboard navigation order. The
 * resolution is reactive: an internal `MutationObserver` on the shared
 * container re-orders the exposed array when nodes move, and consumers'
 * `computed`s recompute automatically.
 *
 * The collection itself is not Angular-aware; instantiate it directly on
 * the host directive and call `register` / `unregister` from each child's
 * constructor / `DestroyRef.onDestroy`.
 *
 * Membership is tracked in a `Set`, so `register` / `unregister` do an O(1)
 * duplicate check instead of scanning the array. Document order is computed
 * lazily and memoized: reading `items()` returns the cached array reference
 * until membership or DOM order actually changes, so reads stay O(1) and a
 * single mutation is O(N log N) (the sort) in the current size.
 */
export class Collection<H extends CollectionHandle> {
  readonly #members = signal<ReadonlySet<H>>(new Set<H>());
  readonly #domEpoch = signal(0);

  #observer: MutationObserver | null = null;
  #observedContainer: Node | null = null;

  /**
   * All registered handles, in DOM document order.
   *
   * Order is resolved from each handle's `host` via `compareDocumentPosition`
   * and refreshed reactively when membership changes or the shared container's
   * children are reordered, so it stays correct under runtime reordering
   * (`@for` sort / drag-reorder), not just under static `@for` / `@if`.
   * Handles whose host is detached (or shares an exact position with another)
   * keep a stable relative order at the end.
   */
  readonly items: Signal<readonly H[]> = computed(() => {
    this.#domEpoch();
    return this.#sortByDomOrder([...this.#members()]);
  });

  register(handle: H): void {
    const members = this.#members();
    if (members.has(handle)) {
      return;
    }
    const next = new Set(members);
    next.add(handle);
    this.#members.set(next);
    this.#syncObserver();
  }

  unregister(handle: H): void {
    const members = this.#members();
    if (!members.has(handle)) {
      return;
    }
    const next = new Set(members);
    next.delete(handle);
    this.#members.set(next);
    this.#syncObserver();
  }

  /** Lookup by host element. Returns `undefined` if no handle has that host. */
  findByHost(el: HTMLElement): H | undefined {
    return this.items().find((h) => h.host === el);
  }

  /** Index in DOM document order, or -1 if not registered. */
  indexOfHost(el: HTMLElement): number {
    return this.items().findIndex((h) => h.host === el);
  }

  #sortByDomOrder(handles: H[]): readonly H[] {
    if (handles.length < 2) {
      return handles;
    }
    const position = new Map<H, number>(handles.map((h, i) => [h, i]));
    const indexOrder = (a: H, b: H): number => position.get(a)! - position.get(b)!;
    return handles.sort((a, b) => {
      if (a.host === b.host) {
        return indexOrder(a, b);
      }
      const aConnected = a.host.isConnected;
      const bConnected = b.host.isConnected;
      if (aConnected !== bConnected) {
        return aConnected ? -1 : 1;
      }
      if (!aConnected) {
        return indexOrder(a, b);
      }
      const rel = a.host.compareDocumentPosition(b.host);
      if ((rel & Node.DOCUMENT_POSITION_FOLLOWING) !== 0) {
        return -1;
      }
      if ((rel & Node.DOCUMENT_POSITION_PRECEDING) !== 0) {
        return 1;
      }
      return indexOrder(a, b);
    });
  }

  #syncObserver(): void {
    if (typeof MutationObserver === 'undefined') {
      return;
    }
    const container = this.#resolveContainer();
    if (container === this.#observedContainer) {
      return;
    }
    this.#observer?.disconnect();
    this.#observedContainer = container;
    if (!container) {
      this.#observer = null;
      return;
    }
    this.#observer ??= new MutationObserver(() => this.#domEpoch.update((e) => e + 1));
    this.#observer.observe(container, { childList: true, subtree: true });
  }

  #resolveContainer(): Node | null {
    for (const member of this.#members()) {
      const parent = member.host.parentNode;
      if (parent) {
        return parent;
      }
    }
    return null;
  }
}
