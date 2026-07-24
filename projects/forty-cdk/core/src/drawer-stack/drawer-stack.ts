import { Injectable, type Signal, signal } from '@angular/core';

import { type ForDrawerSide } from './drawer-side';

/**
 * Snapshot of a single drawer registered with {@link ForDrawerStack}. The
 * stack is LIFO ordered (root → topmost) and exposes only what other
 * coordinators need — `host` for ancestry checks, `side` (a `Signal`, so a
 * runtime side flip recomputes dependent transforms) for layout heuristics,
 * `parent` for topology, `dragging` so visual coordinators (e.g.
 * `ForDrawerScaleCoordinator`'s nested-transform pass) can yield the
 * surface to imperative drag handlers, and the resolved nested-transform
 * tunables so the coordinator never needs to re-read scope-dependent
 * defaults.
 */
export interface DrawerStackNode {
  readonly host: HTMLElement;
  /**
   * Reactive edge the drawer is anchored to. Read inside the coordinator's
   * nested-transform effect so a runtime `[side]` rebind recomputes the
   * parent surface's transform axis, mirroring the reactive `dragging`
   * channel.
   */
  readonly side: Signal<ForDrawerSide>;
  readonly parent: HTMLElement | null;
  /**
   * Reactive flag that flips to `true` while a swipe gesture is in flight
   * on this drawer's surface. Visual coordinators must yield the host's
   * inline transform to the drag handlers while this is `true`.
   */
  readonly dragging: Signal<boolean>;
  /**
   * Scale factor applied to *this* drawer's host while it owns one or
   * more direct child drawers (the nested-drawer visual). Resolved from
   * the drawer's own injector scope at push time so per-scope
   * `provideForDrawerDefaults` overrides flow through.
   */
  readonly nestedScaleAmount: number;
  /**
   * Pixels of translation applied to *this* drawer's host while it owns
   * one or more direct child drawers, in the direction *away* from its
   * anchored edge.
   */
  readonly nestedTranslateYpx: number;
}

/**
 * Returned by {@link ForDrawerStack.push}. `depth` is the number of
 * ancestor drawers currently registered above this one (0 for a root
 * drawer, 1 for a single-nested child, …). `cleanup` pops the node;
 * calling it while descendants are still registered throws so consumers
 * surface their own destroy-order bugs instead of silently leaking.
 */
export interface DrawerStackHandle {
  readonly depth: number;
  cleanup(): void;
}

/**
 * App-scoped LIFO registry of every active `[forDrawer]`. Mounted drawers
 * push themselves on first render and pop on destroy; the stack's signal
 * is the single source of truth for nesting topology consumed by:
 *
 *  - `[forDrawer]` itself, to derive `data-depth` and `data-state-nested`
 *    on its host (the latter when the stack contains a node whose
 *    `parent` is this drawer's host).
 *  - `ForDrawerScaleCoordinator`, when `scaleBackground` is opted in by
 *    multiple levels of nesting and the visual effect must compose along
 *    the LIFO topmost.
 *
 * The companion to {@link DismissableLayerStack} and `InertSiblingsStack`:
 * those keep the focus / dismiss / inert behaviour LIFO-correct, this one
 * keeps the *visual* / *topology* layer LIFO-correct. Both are read-only
 * to consumers — there is no public API for explicit ordering, the LIFO
 * is determined by mount order.
 *
 * SSR: `providedIn: 'root'` so state is per Angular bootstrap. The
 * directives that call `push` only do so from `afterNextRender`, which
 * doesn't run on the server, so there is nothing to guard here.
 *
 * Internal — not re-exported from `public-api.ts`.
 */
@Injectable({ providedIn: 'root' })
export class ForDrawerStack {
  readonly #stack = signal<readonly DrawerStackNode[]>([]);

  /**
   * Reactive view of the current drawer stack (root → topmost). Reading
   * this from a `computed`/`effect` lets primitives react to nesting
   * changes synchronously when a child drawer mounts or unmounts.
   */
  readonly stack: Signal<readonly DrawerStackNode[]> = this.#stack.asReadonly();

  /**
   * Push a drawer onto the stack. Returns a {@link DrawerStackHandle}
   * carrying the computed `depth` and a `cleanup` that pops the same
   * node. `depth` is derived from the node's `parent` chain at push time:
   * a root drawer (no `parent`) is depth 0; a child of a depth-N drawer
   * is depth N+1.
   *
   * `cleanup` is idempotent on a node that's already gone, but throws if
   * the node still has descendants in the stack — the canonical signal
   * that the consumer's template tore down a parent before its child
   * (typically because the parent's `@if` flipped to `false` while the
   * child sits in a separate template branch). Nest the child's
   * `@if (childOpen())` *inside* the parent's `@if (parentOpen())` to
   * inherit Angular's bottom-up destroy order automatically.
   */
  push(node: DrawerStackNode): DrawerStackHandle {
    const depth = this.#computeDepth(node);
    this.#stack.update((s) => [...s, node]);
    return {
      depth,
      cleanup: () => this.#cleanup(node),
    };
  }

  #cleanup(node: DrawerStackNode): void {
    const current = this.#stack();
    const idx = current.indexOf(node);
    if (idx === -1) {
      return;
    }
    const hasDescendant = current.some(
      (other) => other !== node && this.#isDescendant(other, node, current),
    );
    if (hasDescendant) {
      throw new Error(
        '[forty-cdk/drawer] DrawerStack out-of-order cleanup: a parent drawer was destroyed while a nested child is still registered. Make sure the child @if is wrapped inside the parent @if so the child unmounts first.',
      );
    }
    const next = current.slice();
    next.splice(idx, 1);
    this.#stack.set(next);
  }

  #computeDepth(node: DrawerStackNode): number {
    if (node.parent === null) {
      return 0;
    }
    const stack = this.#stack();
    let depth = 0;
    let cursor: HTMLElement | null = node.parent;
    while (cursor) {
      depth += 1;
      const ancestor = stack.find((n) => n.host === cursor);
      if (!ancestor) {
        break;
      }
      cursor = ancestor.parent;
    }
    return depth;
  }

  #isDescendant(
    candidate: DrawerStackNode,
    ancestor: DrawerStackNode,
    stack: readonly DrawerStackNode[],
  ): boolean {
    let cursor: HTMLElement | null = candidate.parent;
    while (cursor) {
      if (cursor === ancestor.host) {
        return true;
      }
      const next = stack.find((n) => n.host === cursor);
      if (!next) {
        return false;
      }
      cursor = next.parent;
    }
    return false;
  }
}
