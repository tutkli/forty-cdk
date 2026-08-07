import { computed, DestroyRef, inject, signal, type Signal } from '@angular/core';

/**
 * Minimal contract every `Collection` entry must satisfy: it carries the DOM
 * node that positions the handle, so the collection can order handles by
 * document position and consumers can correlate a handle with a node
 * (`findByHost`, `indexOfHost`).
 *
 * The node is typed `Node`, not `HTMLElement`, because that is everything the
 * collection reads on it — `isConnected`, `compareDocumentPosition`,
 * `parentNode`, and identity. A handle anchored on a comment node therefore
 * satisfies the contract honestly: a piece declared on an `<ng-container>` or
 * an `<ng-template>` has a comment node for its `ElementRef.nativeElement`, and
 * `forty-cdk/table`'s def registry orders exactly those.
 *
 * A handle whose host is focused, scrolled or measured declares
 * `readonly host: HTMLElement` on its own interface rather than inheriting the
 * assumption from here — `DisableableHandle` and `HostRovingItemHandle` are the
 * shared ones.
 */
export interface CollectionHandle {
  readonly host: Node;
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
 * exposed in **DOM document order**, resolved from each handle's `host` node
 * regardless of the order children registered in.
 *
 * Document order rather than registration order is what keeps `items()` and `indexOfHost` correct
 * under a template that reorders its list at runtime: `@for (…; track id)` moves existing DOM nodes
 * without re-running child constructors, so registration order would freeze and corrupt
 * `aria-posinset` / `aria-setsize` and the keyboard navigation order. An internal
 * `MutationObserver` re-orders the exposed array when nodes move.
 *
 * The observer watches `childList` on every node from each host's direct parent up to the deepest
 * common ancestor of all registered hosts, so a reorder applied at an intermediate wrapper — moving
 * `<li>` elements inside a `<ul>` without touching any host's own parent — is still seen, while a
 * mutation confined to a sibling subtree does not invalidate the collection.
 *
 * Must be constructed in an injection context: it registers `destroy()` with the ambient
 * `DestroyRef`, so the observer is disconnected with the owner even if children never unregister.
 * Call `register` / `unregister` from each child's constructor and `DestroyRef.onDestroy`.
 *
 * Reads are memoized — `items()` returns the same array reference until membership or DOM order
 * changes, and `findByHost` / `indexOfHost` resolve through a companion index instead of scanning.
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
    inject(DestroyRef).onDestroy(() => this.destroy());
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
   * The contract is type-level: the `readonly H[]` return type is what stops a
   * caller sorting or splicing in place. It is enforced at compile time rather
   * than by freezing the array, because the returned reference is the memoized
   * cache backing this `computed` and freezing it would cost a pass over every
   * recomputation for a guarantee the type already gives. Copy before sorting.
   */
  readonly items: Signal<readonly H[]> = computed(
    () => {
      this.#membersEpoch();
      this.#domEpoch();
      return this.#sortByDomOrder([...this.#membersSet]);
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
   * Position of each registered host in {@link items}, keyed by node.
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
    const index = new Map<Node, number>();
    const ordered = this.items();
    for (let i = 0; i < ordered.length; i++) {
      const host = ordered[i]!.host;
      if (!index.has(host)) {
        index.set(host, i);
      }
    }
    return index;
  });

  /** Lookup by host node. Returns `undefined` if no handle has that host. */
  findByHost(node: Node): H | undefined {
    const index = this.#indexByHost().get(node);
    return index === undefined ? undefined : this.items()[index];
  }

  /** Index in DOM document order, or -1 if not registered. */
  indexOfHost(node: Node): number {
    return this.#indexByHost().get(node) ?? -1;
  }

  /**
   * Disconnects the `MutationObserver` and clears membership. Idempotent and
   * safe to call from a `DestroyRef.onDestroy` hook — which the constructor
   * wires automatically. After `destroy()`, further `register` calls are
   * ignored.
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
    const hosts: Node[] = [];
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

  #commonAncestor(hosts: Node[]): Node | null {
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
