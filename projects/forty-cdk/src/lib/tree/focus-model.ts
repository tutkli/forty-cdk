import { type Signal } from '@angular/core';

import { firstEnabledHost } from '../_internal/collection/first-enabled-host';
import {
  type ListNavigationAction,
  moveIndex,
} from '../_internal/keyboard-navigation/keyboard-navigation';
import type { RovingTabindex } from '../_internal/roving-tabindex/roving-tabindex';
import type { ForTreeItemHandle, ForTreeVisibleNode } from './tree-context';
import type { TreeVirtualizedNavigator } from './tree-virtualized-navigator';

/**
 * The currently-focused node, resolved by the active {@link FocusModel}. Carries
 * the facts the tree's expand / collapse and parent / child moves need —
 * regardless of whether focus rides the DOM (roving) or an
 * `aria-activedescendant` pointer (virtualized).
 */
export interface TreeFocusEntry {
  /** Stable node value. */
  readonly value: string;
  /** Whether the node is an expandable parent. */
  readonly expandable: boolean;
  /** Effective disabled state. */
  readonly disabled: boolean;
}

/**
 * The seam that unifies the tree's two focus engines. `ForTree` selects one
 * implementation from `virtualized` once and routes every navigation intent
 * through it, so the keyboard handler resolves intent a single time and never
 * re-tests the mode. Two implementations:
 *
 * - {@link RovingFocusModel} — DOM focus rides the `treeitem` (APG Approach A).
 * - {@link ActiveDescendantFocusModel} — focus stays on the container and an
 *   `aria-activedescendant` pointer tracks the active node (virtualized path).
 */
export interface FocusModel {
  /** Move focus to a specific node. */
  focusTarget(handle: ForTreeItemHandle): void;
  /** Resolve the currently-focused node, or `null` when nothing is focused. */
  current(): TreeFocusEntry | null;
  /** Move focus to the next / previous / first / last enabled node. */
  navigate(action: ListNavigationAction): void;
  /** Move focus to the first child of the current node (an open parent). */
  enterChild(): void;
  /** Move focus to the current node's parent. */
  moveToParent(): void;
  /** Move focus to a typeahead match. */
  typeaheadTo(handle: ForTreeItemHandle): void;
}

/** Wiring for {@link RovingFocusModel}. */
export interface RovingFocusModelDeps {
  /** The shared roving-tabindex tracker driving the single tab stop. */
  readonly roving: RovingTabindex;
  /** Flattened visible nodes (each with its resolved parent host). */
  readonly visibleNodes: Signal<readonly ForTreeVisibleNode[]>;
  /** Visible node handles in flattened order. */
  readonly visibleHandles: Signal<readonly ForTreeItemHandle[]>;
  /**
   * Selection-follows-focus hook. Called with the destination value after a
   * `navigate` when single-mode selection should track focus; a no-op when the
   * tree is multi-select or the option is off.
   */
  readonly selectOnFocus: (value: string) => void;
}

/**
 * Focus engine for the standard (non-virtualized) tree: DOM focus rides the
 * `treeitem`, tracked through {@link RovingTabindex}. The current node is the
 * roving-active host; navigation walks the flattened visible-node list.
 *
 * Internal — not re-exported from `tree/index.ts` or `public-api.ts`.
 */
export class RovingFocusModel implements FocusModel {
  readonly #deps: RovingFocusModelDeps;

  constructor(deps: RovingFocusModelDeps) {
    this.#deps = deps;
  }

  focusTarget(handle: ForTreeItemHandle): void {
    this.#deps.roving.focusActive(handle.host);
  }

  current(): TreeFocusEntry | null {
    const entry = this.#currentNode();
    if (!entry) {
      return null;
    }
    const handle = entry.handle;
    return { value: handle.value(), expandable: handle.expandable(), disabled: handle.disabled() };
  }

  navigate(action: ListNavigationAction): void {
    const active = this.#deps.roving.active();
    const items = this.#deps.visibleHandles();
    if (items.length === 0) {
      return;
    }
    const currentIndex = items.findIndex((item) => item.host === active);
    const next = moveIndex(currentIndex < 0 ? 0 : currentIndex, items.length, action, {
      loop: false,
      isDisabled: (i) => items[i]!.disabled(),
    });
    if (next === null) {
      return;
    }
    const target = items[next];
    if (!target) {
      return;
    }
    this.#deps.roving.focusActive(target.host);
    this.#deps.selectOnFocus(target.value());
  }

  enterChild(): void {
    const entry = this.#currentNode();
    if (!entry) {
      return;
    }
    const child = entry.handle.childContainer();
    const firstChild = child ? firstEnabledHost(child.items()) : null;
    if (firstChild) {
      this.#deps.roving.focusActive(firstChild);
    }
  }

  moveToParent(): void {
    const entry = this.#currentNode();
    if (entry?.parentHost) {
      this.#deps.roving.focusActive(entry.parentHost);
    }
  }

  typeaheadTo(handle: ForTreeItemHandle): void {
    this.#deps.roving.focusActive(handle.host);
  }

  #currentNode(): ForTreeVisibleNode | null {
    const active = this.#deps.roving.active();
    if (active === null) {
      return null;
    }
    return this.#deps.visibleNodes().find((entry) => entry.handle.host === active) ?? null;
  }
}

/** Wiring for {@link ActiveDescendantFocusModel}. */
export interface ActiveDescendantFocusModelDeps {
  /** The virtualization navigation engine resolving moves across the rendered window. */
  readonly navigator: () => TreeVirtualizedNavigator;
  /** Set the host's `aria-activedescendant` to a node id. */
  readonly setActiveId: (id: string | null) => void;
}

/**
 * Focus engine for the virtualized tree: DOM focus stays on the container and
 * an `aria-activedescendant` pointer tracks the active node, resolved through
 * {@link TreeVirtualizedNavigator} so navigation works across nodes outside the
 * rendered window. Selection never follows focus here.
 *
 * Internal — not re-exported from `tree/index.ts` or `public-api.ts`.
 */
export class ActiveDescendantFocusModel implements FocusModel {
  readonly #deps: ActiveDescendantFocusModelDeps;

  constructor(deps: ActiveDescendantFocusModelDeps) {
    this.#deps = deps;
  }

  focusTarget(handle: ForTreeItemHandle): void {
    this.#deps.setActiveId(handle.id());
  }

  current(): TreeFocusEntry | null {
    const cur = this.#deps.navigator().currentEntry();
    if (!cur) {
      return null;
    }
    return { value: cur.value, expandable: cur.expandable, disabled: cur.disabled };
  }

  navigate(action: ListNavigationAction): void {
    this.#deps.navigator().navigate(action);
  }

  enterChild(): void {
    this.#deps.navigator().enterChild();
  }

  moveToParent(): void {
    this.#deps.navigator().moveToParent();
  }

  typeaheadTo(handle: ForTreeItemHandle): void {
    this.#deps.setActiveId(handle.id());
    handle.host.scrollIntoView?.({ block: 'nearest' });
  }
}
