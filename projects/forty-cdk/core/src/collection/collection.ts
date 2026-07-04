import { computed, DestroyRef, inject, signal, type Signal } from '@angular/core';

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
 * resolution is reactive: an internal `MutationObserver` re-orders the
 * exposed array when nodes move, and consumers' `computed`s recompute
 * automatically.
 *
 * The observer watches `childList` (without `subtree`) on each distinct
 * **direct parent** of the registered hosts, so it only fires for additions,
 * removals, and reorders of this collection's own members. In a nested
 * composition (e.g. a Tree of `forTreeGroup` containers, each owning its own
 * `Collection`) a single mutation deep in the tree no longer cascades through
 * every ancestor's observer — only the owning collection is invalidated.
 *
 * The collection itself is not Angular-aware, but when instantiated inside an
 * Angular injection context (the common case — a field initializer on the
 * host directive) it registers `destroy()` with the ambient `DestroyRef`, so
 * the `MutationObserver` is disconnected when the owner is destroyed without
 * relying on every child unregistering first. Call `register` / `unregister`
 * from each child's constructor / `DestroyRef.onDestroy`; outside an injection
 * context, call `destroy()` manually.
 *
 * Membership is tracked in a mutable `Set` with a companion epoch signal, so
 * `register` / `unregister` mutate the set in place (O(1)) and bump the epoch
 * instead of copying the whole set per call — mounting N members stays O(N)
 * rather than O(N²). Document order is computed lazily and memoized: reading
 * `items()` returns the cached (frozen) array reference until membership or DOM
 * order actually changes, so reads stay O(1) and a single mutation is
 * O(N log N) (the sort) in the current size. The `MutationObserver` resync is
 * deferred to a microtask so a burst of same-turn registrations coalesces into
 * one wiring pass rather than one per member.
 */
export class Collection<H extends CollectionHandle> {
  readonly #membersSet = new Set<H>();
  readonly #membersEpoch = signal(0);
  readonly #domEpoch = signal(0);

  #observer: MutationObserver | null = null;
  readonly #observedParents = new Set<Node>();
  #destroyed = false;
  #syncScheduled = false;

  constructor() {
    try {
      inject(DestroyRef).onDestroy(() => this.destroy());
    } catch {
      // Constructed outside an injection context (e.g. a bare `new Collection()`
      // in a unit test); the owner is responsible for calling `destroy()`.
    }
  }

  /**
   * All registered handles, in DOM document order.
   *
   * Order is resolved from each handle's `host` via `compareDocumentPosition`
   * and refreshed reactively when membership changes or the shared parents'
   * children are reordered, so it stays correct under runtime reordering
   * (`@for` sort / drag-reorder), not just under static `@for` / `@if`.
   * Handles whose host is detached (or shares an exact position with another)
   * keep a stable relative order at the end.
   *
   * The returned array is frozen — it is shared across reads and is the
   * memoized cache backing this `computed`, so callers must treat it as
   * read-only (copy before sorting / splicing).
   */
  readonly items: Signal<readonly H[]> = computed(() => {
    this.#membersEpoch();
    this.#domEpoch();
    return Object.freeze(this.#sortByDomOrder([...this.#membersSet]));
  });

  register(handle: H): void {
    if (this.#destroyed || this.#membersSet.has(handle)) {
      return;
    }
    this.#membersSet.add(handle);
    this.#membersEpoch.update((e) => e + 1);
    this.#scheduleSync();
  }

  unregister(handle: H): void {
    if (!this.#membersSet.has(handle)) {
      return;
    }
    this.#membersSet.delete(handle);
    this.#membersEpoch.update((e) => e + 1);
    this.#scheduleSync();
  }

  /** Lookup by host element. Returns `undefined` if no handle has that host. */
  findByHost(el: HTMLElement): H | undefined {
    return this.items().find((h) => h.host === el);
  }

  /** Index in DOM document order, or -1 if not registered. */
  indexOfHost(el: HTMLElement): number {
    return this.items().findIndex((h) => h.host === el);
  }

  /**
   * Disconnects the `MutationObserver` and clears membership. Idempotent and
   * safe to call from a `DestroyRef.onDestroy` hook — wired automatically when
   * the collection is constructed in an injection context. After `destroy()`,
   * further `register` calls are ignored.
   */
  destroy(): void {
    this.#destroyed = true;
    this.#syncScheduled = false;
    this.#observer?.disconnect();
    this.#observer = null;
    this.#observedParents.clear();
    if (this.#membersSet.size > 0) {
      this.#membersSet.clear();
      this.#membersEpoch.update((e) => e + 1);
    }
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

  #scheduleSync(): void {
    if (this.#syncScheduled || this.#destroyed) {
      return;
    }
    this.#syncScheduled = true;
    queueMicrotask(() => {
      this.#syncScheduled = false;
      if (this.#destroyed) {
        return;
      }
      this.#syncObserver();
    });
  }

  #syncObserver(): void {
    if (typeof MutationObserver === 'undefined' || this.#destroyed) {
      return;
    }
    const parents = this.#resolveParents();
    if (this.#sameParents(parents)) {
      return;
    }
    this.#observer ??= new MutationObserver(() => this.#domEpoch.update((e) => e + 1));
    this.#observer.disconnect();
    this.#observedParents.clear();
    for (const parent of parents) {
      this.#observer.observe(parent, { childList: true });
      this.#observedParents.add(parent);
    }
  }

  #resolveParents(): Set<Node> {
    const parents = new Set<Node>();
    for (const member of this.#membersSet) {
      const parent = member.host.parentNode;
      if (parent) {
        parents.add(parent);
      }
    }
    return parents;
  }

  #sameParents(parents: Set<Node>): boolean {
    if (parents.size !== this.#observedParents.size) {
      return false;
    }
    for (const parent of parents) {
      if (!this.#observedParents.has(parent)) {
        return false;
      }
    }
    return true;
  }
}
