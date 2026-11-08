import { InjectionToken } from '@angular/core';

import type { ForMenuContext } from './menu-context';

/**
 * A submenu as its parent menu sees it while it holds the parent's open-child
 * slot.
 */
export interface MenuOpenChild {
  /** The submenu's own menu context, which keys the slot of its own open child. */
  readonly context: ForMenuContext;
  /**
   * Closes the submenu because a menu above it is closing: its `open` model is
   * written `false` and its `(openChange)` emits, no focus moves, and the close
   * does not propagate up the chain.
   */
  closeWithParent(): void;
  /**
   * Closes the submenu because a sibling took its parent's slot. Focus returns
   * to its trigger only when it was inside the submenu's open chain.
   */
  closeForSibling(): void;
  /**
   * Whether the pointer is travelling from the submenu's trigger toward its
   * content inside the armed pointer-grace corridor.
   */
  pointerGraceArmed(): boolean;
}

/**
 * Which submenu each menu holds open. A menu holds at most one open submenu, so
 * the registry is the chain of open levels below every menu context: a root
 * closes that chain before it closes, and a sub-trigger reads a sibling's
 * pointer-grace state through it before it schedules a hover-open.
 */
export class MenuOpenChain {
  readonly #openChildren = new WeakMap<ForMenuContext, MenuOpenChild>();
  readonly #graceWaiters = new WeakMap<ForMenuContext, () => void>();

  /** The submenu `parent` holds open, or `null`. */
  openChild(parent: ForMenuContext): MenuOpenChild | null {
    return this.#openChildren.get(parent) ?? null;
  }

  /**
   * Makes `child` the open submenu of `parent`, closing the previous holder
   * through {@link MenuOpenChild.closeForSibling} when it is a different submenu.
   */
  claim(parent: ForMenuContext, child: MenuOpenChild): void {
    const previous = this.#openChildren.get(parent);
    this.#openChildren.set(parent, child);
    if (previous && previous !== child) {
      previous.closeForSibling();
    }
  }

  /** Clears `parent`'s open-child slot when `child` holds it. */
  release(parent: ForMenuContext, child: MenuOpenChild): void {
    if (this.#openChildren.get(parent) === child) {
      this.#openChildren.delete(parent);
    }
  }

  /**
   * Closes every submenu open below `parent`, deepest first, through
   * {@link MenuOpenChild.closeWithParent}. Every menu context calls it from the
   * close transition all of its close paths pass through.
   */
  closeOpenChildChain(parent: ForMenuContext): void {
    const chain: MenuOpenChild[] = [];
    let child = this.#openChildren.get(parent);
    while (child && !chain.includes(child)) {
      chain.push(child);
      child = this.#openChildren.get(child.context);
    }
    for (const level of chain.reverse()) {
      level.closeWithParent();
    }
  }

  /**
   * Holds a hover-open of a submenu of `parent` until the pointer-grace corridor
   * of the open sibling ends. A later call replaces the waiting one.
   */
  deferUntilGraceEnds(parent: ForMenuContext, resume: () => void): void {
    this.#graceWaiters.set(parent, resume);
  }

  /**
   * The pointer-grace corridor of `parent`'s open submenu ended without the
   * pointer reaching its content: runs the hover-open waiting on it, if any.
   */
  graceEnded(parent: ForMenuContext): void {
    const resume = this.#graceWaiters.get(parent);
    if (resume) {
      this.#graceWaiters.delete(parent);
      resume();
    }
  }
}

/** The application's {@link MenuOpenChain}. */
export const MENU_OPEN_CHAIN = new InjectionToken<MenuOpenChain>('MENU_OPEN_CHAIN', {
  providedIn: 'root',
  factory: () => new MenuOpenChain(),
});
