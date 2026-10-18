import { InjectionToken, type Signal } from '@angular/core';

import type { CollectionHandle } from '../collection/collection';
import type {
  ListNavigationAction,
  WritingDirection,
} from '../keyboard-navigation/keyboard-navigation';
import type { RovingTabindex } from './roving-tabindex';

/**
 * The handle an embedded item registers with a host-roving container: its
 * host element and a `disabled` signal the container reads to skip it during
 * arrow-key navigation. Container-specific extras, such as a toggle item's
 * `value`, live on the container's own handle.
 */
export interface HostRovingItemHandle extends CollectionHandle {
  /**
   * Narrowed from {@link CollectionHandle}'s `Node`: the host owns focus moves
   * and the roving tab stop, both of which are element operations.
   */
  readonly host: HTMLElement;
  readonly disabled: Signal<boolean>;
}

/**
 * Coordination contract of a container that owns the roving tab stop and
 * arrow-key navigation for the items it composes, including items that
 * belong to a nested primitive and delegate focus management upward.
 *
 * Embedded items inject the token with `{ optional: true, skipSelf: true }`:
 * `optional` because an item used outside any such container has none, and
 * `skipSelf` so a container implementing the contract never resolves its
 * own provider.
 */
export interface HostRovingContext {
  /** Layout direction the host wants its items to navigate along. */
  readonly orientation: Signal<'horizontal' | 'vertical'>;
  /** Reading direction. RTL swaps ArrowLeft / ArrowRight semantics. */
  readonly dir: Signal<WritingDirection>;
  /** When true, every embedded item is disabled regardless of its own state. */
  readonly disabled: Signal<boolean>;

  /**
   * Roving-tabindex tracker owned by the host. Embedded items call
   * `setActive` on `(focus)` and prefer `active()` in their tabindex
   * computed so the host's single tab stop follows the last focused item
   * (APG re-entry), exactly like Tabs / Tree. Before any focus `active()`
   * is `null` and the item falls back to {@link isFirstFocusableItem}.
   */
  readonly roving: RovingTabindex;

  /**
   * Predicate for the per-item `tabindex` host binding. Returns `true`
   * for the single item that should currently carry `tabindex=0`
   * (the host's "entry point"); every other registered item is `-1`.
   * Only consulted before the roving tracker has an active item.
   */
  isFirstFocusableItem(el: HTMLElement): boolean;

  /**
   * Move focus from `currentItem` to the next item in registration order
   * matching `action`, respecting the host's `loop` policy and skipping
   * disabled handles.
   */
  navigate(currentItem: HTMLElement, action: ListNavigationAction): void;

  registerItem(handle: HostRovingItemHandle): void;
  unregisterItem(handle: HostRovingItemHandle): void;
}

/**
 * Injection token for `HostRovingContext`. Internal to the library — must
 * NOT be re-exported from `public-api.ts`. Containers that implement the
 * contract provide it via `useExisting` alongside their own primitive
 * context token.
 */
export const FOR_HOST_ROVING_CONTEXT = new InjectionToken<HostRovingContext>(
  'FOR_HOST_ROVING_CONTEXT',
);
