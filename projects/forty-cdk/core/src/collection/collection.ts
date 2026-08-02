import { computed, DestroyRef, inject, signal, type Signal } from '@angular/core';

/**
 * Minimal contract every `Collection` entry must satisfy: it carries the
 * host element so consumers can correlate handles with DOM nodes (e.g.
 * `findByHost`, focus moves, `aria-activedescendant` lookups).
 */
export interface CollectionHandle {
  readonly host: HTMLElement;
}

function sameSequence<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
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
 * The observer watches `childList` (without `subtree`) on every node from each
 * host's **direct parent up to and including the deepest common ancestor** of
 * all registered hosts. Observing that ancestor chain — not just each host's
 * direct parent — catches reorders that happen at an intermediate wrapper above
 * the hosts: in the common `<ul><li><button forTab></li>…</ul>` markup,
 * reordering the `<li>` wrappers moves the hosts in document order by mutating
 * the `<ul>`'s child list without touching any host's direct parent (`<li>`),
 * so a direct-parent-only observer would miss it and freeze `items()` at the
 * stale order. The `<ul>` is on the common-ancestor chain, so its reorder is
 * seen. Bounding the observed nodes to the chain up to the common ancestor (and
 * still using `childList` rather than `subtree`) keeps the observation local: a
 * mutation confined to a sibling subtree — e.g. a nested `forTreeGroup`
 * container's own `Collection` reordering deeper down — does not touch any node
 * on this collection's chain and so does not invalidate it.
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
 * O(N log N) (the sort) in the current size. `findByHost` / `indexOfHost`
 * resolve through a companion index derived from that same memo, so a lookup is
 * O(1) rather than a scan of the ordered array. The `MutationObserver` resync is
 * deferred to a microtask so a burst of same-turn registrations coalesces into
 * one wiring pass rather than one per member. The observer callback both bumps
 * the DOM epoch (recomputing `items()`) and reschedules that resync, so an
 * observed mutation that re-parents a registered host — moved to a different
 * branch without re-registering — re-anchors the watched ancestor chain to the
 * hosts' new positions on the next microtask; `#sameNodes` keeps this a no-op
 * whenever the chain is unchanged, so steady-state cost stays nil.
 *
 * [#1584](https://github.com/tutkli/forty-cdk/issues/1584) measured that
 * memoization against the library's largest composition — a 2000-row × 10-column
 * non-virtualized `[forTable]`, which builds 2002 collections — and two of its
 * findings are worth keeping here, because both contradict a reading the code
 * invites. **The resort is not re-run per registration**: the whole mount spends
 * `length - 1` comparisons per collection — the count V8's sort needs for an
 * already-ordered array, 20 008 `compareDocumentPosition` calls for 22 010
 * registered handles — because registrations complete in the creation pass before
 * any binding reads `items()`, and `sameSequence` absorbs the DOM-epoch bumps that
 * follow. **And one observer
 * per collection is the cheap shape, not the expensive one**: wiring all 2002 of
 * them costs 5.3 ms, linear in count and 0.7% of the mount, because the sync is
 * deferred and coalesced and a settled table delivers no records at all. The
 * alternative — one observer owned by the outermost collection — needs
 * `subtree: true` to see a nested reorder, so it would trade 2002 registrations
 * that each watch one `childList` for a single registration notified by every
 * mutation anywhere inside the primitive. Neither is the bottleneck a large
 * mount actually has; that one lived in the consumers of `items()`.
 */
export class Collection<H extends CollectionHandle> {
  readonly #membersSet = new Set<H>();
  readonly #membersEpoch = signal(0);
  readonly #domEpoch = signal(0);

  #observer: MutationObserver | null = null;
  readonly #observedNodes = new Set<Node>();
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
   * and refreshed reactively when membership changes or a node on the hosts'
   * common-ancestor chain reorders its children, so it stays correct under
   * runtime reordering (`@for` sort / drag-reorder), not just under static
   * `@for` / `@if`.
   * Handles whose host is detached (or shares an exact position with another)
   * keep a stable relative order at the end.
   *
   * The returned array is frozen — it is shared across reads and is the
   * memoized cache backing this `computed`, so callers must treat it as
   * read-only (copy before sorting / splicing).
   */
  readonly items: Signal<readonly H[]> = computed(
    () => {
      this.#membersEpoch();
      this.#domEpoch();
      return Object.freeze(this.#sortByDomOrder([...this.#membersSet]));
    },
    { equal: sameSequence },
  );

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

  /**
   * Position of each registered host in {@link items}, keyed by element.
   *
   * Derived from `items` rather than from the member set so it inherits the
   * `sameSequence` equality — a DOM-epoch bump that resolves to the same order
   * does not rebuild it. It is lazy like any `computed`, so a collection whose
   * consumers never look a host up never pays for the map.
   *
   * Two handles may share a host (a piece composed onto the same element
   * twice); the first in document order wins, matching the `find` /
   * `findIndex` scan this replaced.
   */
  readonly #indexByHost = computed(() => {
    const index = new Map<HTMLElement, number>();
    const ordered = this.items();
    for (let i = 0; i < ordered.length; i++) {
      const host = ordered[i]!.host;
      if (!index.has(host)) {
        index.set(host, i);
      }
    }
    return index;
  });

  /** Lookup by host element. Returns `undefined` if no handle has that host. */
  findByHost(el: HTMLElement): H | undefined {
    const index = this.#indexByHost().get(el);
    return index === undefined ? undefined : this.items()[index];
  }

  /** Index in DOM document order, or -1 if not registered. */
  indexOfHost(el: HTMLElement): number {
    return this.#indexByHost().get(el) ?? -1;
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
    this.#observedNodes.clear();
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
    const nodes = this.#resolveObservedNodes();
    if (this.#sameNodes(nodes)) {
      return;
    }
    this.#observer ??= new MutationObserver(() => {
      this.#domEpoch.update((e) => e + 1);
      this.#scheduleSync();
    });
    this.#observer.disconnect();
    this.#observedNodes.clear();
    for (const node of nodes) {
      this.#observer.observe(node, { childList: true });
      this.#observedNodes.add(node);
    }
  }

  #resolveObservedNodes(): Set<Node> {
    const hosts: HTMLElement[] = [];
    for (const member of this.#membersSet) {
      if (member.host.isConnected) {
        hosts.push(member.host);
      }
    }
    const nodes = new Set<Node>();
    if (hosts.length === 0) {
      return nodes;
    }
    if (hosts.length === 1) {
      const parent = hosts[0]!.parentNode;
      if (parent) {
        nodes.add(parent);
      }
      return nodes;
    }
    const commonAncestor = this.#commonAncestor(hosts);
    for (const host of hosts) {
      for (let node: Node | null = host.parentNode; node; node = node.parentNode) {
        nodes.add(node);
        if (node === commonAncestor) {
          break;
        }
      }
    }
    return nodes;
  }

  #commonAncestor(hosts: HTMLElement[]): Node | null {
    const chain: Node[] = [];
    const chainIndex = new Map<Node, number>();
    for (let node: Node | null = hosts[0]!; node; node = node.parentNode) {
      chainIndex.set(node, chain.length);
      chain.push(node);
    }
    let ancestorIndex = 0;
    for (let i = 1; i < hosts.length; i++) {
      let node: Node | null = hosts[i]!;
      while (node && !chainIndex.has(node)) {
        node = node.parentNode;
      }
      if (!node) {
        return null;
      }
      const index = chainIndex.get(node)!;
      if (index > ancestorIndex) {
        ancestorIndex = index;
      }
    }
    return chain[ancestorIndex]!;
  }

  #sameNodes(nodes: Set<Node>): boolean {
    if (nodes.size !== this.#observedNodes.size) {
      return false;
    }
    for (const node of nodes) {
      if (!this.#observedNodes.has(node)) {
        return false;
      }
    }
    return true;
  }
}
