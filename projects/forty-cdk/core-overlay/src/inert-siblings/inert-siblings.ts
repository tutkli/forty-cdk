import { DOCUMENT, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import {
  composedContains,
  composedParentElement,
  MODAL_EXEMPT_ATTRIBUTE,
  MODAL_PEER_ATTRIBUTE,
} from 'forty-cdk/core';

interface SnapshotEntry {
  readonly el: HTMLElement;
  readonly hadInert: boolean;
  readonly prevAriaHidden: string | null;
}

export interface InertSiblingsHandle {
  /** Pop this owner off the stack and recompute. */
  deactivate(): void;
  /** Whether this handle is still on the stack. */
  readonly isActive: boolean;
}

interface RootState {
  readonly root: HTMLElement;
  readonly stack: HTMLElement[];
  appliedSnapshot: SnapshotEntry[];
  observer: MutationObserver | null;
}

/**
 * Marks every direct child of a **root element** (default `document.body`,
 * or a positioned container when a region-scoped modal passes one)
 * other than the topmost active owner (and any element flagged as a
 * peer-of-owner via the `data-for-modal-peer` attribute) as `inert` and
 * `aria-hidden="true"` while at least one owner is active on that root.
 * Restores each touched element to its exact prior state once the last
 * owner deactivates.
 *
 * `aria-modal="true"` alone is insufficient: Safari with VoiceOver, among other combinations, still
 * announces siblings of an aria-modal node unless the rest of the document is explicitly hidden.
 *
 * **Stacking.** Each root keeps its own owner stack, snapshot and `MutationObserver`, so a
 * `document.body` root and a container root are fully independent. The element-level outcome is
 * recomputed from the current topmost owner whenever the stack changes: the previous outcome is
 * reverted to its snapshot first, then a fresh one is applied. Closing owners out of LIFO order
 * therefore still leaves a coherent document, and full restoration runs when the stack empties.
 *
 * **Portals.** The owner need not be a direct child of the root — the root-level child that is an
 * ancestor of the owner is resolved and its subtree excluded, so an in-place dialog keeps its
 * enclosing app shell interactive. That walk climbs the composed tree, so an owner rendered inside
 * a shadow root still resolves to the root-level child hosting it.
 *
 * **Peers.** Elements carrying `data-for-modal-peer` are excluded from the snapshot, as are those
 * carrying {@link MODAL_EXEMPT_ATTRIBUTE}, which additionally opts out of the dismissible layer.
 *
 * **Late siblings.** While any owner is active, a `MutationObserver` inerts each newly added
 * sibling under the same rules, so an element portaled to the root after activation is isolated and
 * restored too.
 *
 * SSR: every operation is a no-op on the server, since `activate()` is only ever called from
 * `afterNextRender`.
 */
@Injectable({ providedIn: 'root' })
export class InertSiblingsStack {
  readonly #document = inject(DOCUMENT);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly #roots = new Map<HTMLElement, RootState>();

  /**
   * Push `owner` onto the inert-siblings stack for `root` (default
   * `document.body`) and (re)apply the isolation outcome for the new topmost
   * owner. Returns a handle whose `deactivate()` pops this specific owner —
   * order-safe, so closing out of LIFO order works.
   *
   * When `root` is a positioned container (e.g. a region-scoped modal), only
   * that container's other children are inerted; body siblings outside the
   * container stay fully interactive.
   */
  activate(owner: HTMLElement, root: HTMLElement = this.#document.body): InertSiblingsHandle {
    if (!this.#isBrowser) {
      return {
        deactivate: () => {},
        get isActive(): boolean {
          return false;
        },
      };
    }
    const state = this.#stateFor(root);
    this.#revertAppliedSnapshot(state);
    if (state.stack.length === 0) {
      this.#startObserving(state);
    }
    state.stack.push(owner);
    this.#applyForCurrentTopmost(state);

    let active = true;
    return {
      get isActive(): boolean {
        return active;
      },
      deactivate: (): void => {
        if (!active) {
          return;
        }
        active = false;
        const idx = state.stack.indexOf(owner);
        if (idx === -1) {
          return;
        }
        this.#revertAppliedSnapshot(state);
        state.stack.splice(idx, 1);
        if (state.stack.length > 0) {
          this.#applyForCurrentTopmost(state);
        } else {
          this.#stopObserving(state);
          this.#roots.delete(root);
        }
      },
    };
  }

  /**
   * Whether an overlay anchored to `anchor` should be left interactive over
   * the active modal — i.e. treated as a peer of the topmost owner instead of
   * inerted. Returns `true` only while at least one owner is active AND
   * `anchor` lives inside the current protected root for any active root,
   * which means the overlay was opened from within a modal (e.g. a Select /
   * DropdownMenu opened from a form inside a Dialog).
   *
   * Returns `false` when no owner is active — so an overlay opened with no
   * modal present is never pre-marked, and a modal opened later inerts it like
   * any other background sibling — and when `anchor` sits in an already-inerted
   * background subtree (a toast or a tooltip anchored to a backdrop element).
   *
   * `injectOverlayShell` calls this when an anchored-overlay host is portaled,
   * to decide whether to stamp `MODAL_PEER_ATTRIBUTE` on it so the
   * inert-siblings observer skips forty's own overlays instead of swallowing
   * them. SSR-safe: on the server the roots map is always empty (no
   * owner activates), so this returns `false`.
   */
  ownsAnchor(anchor: Element): boolean {
    for (const state of this.#roots.values()) {
      const protectedRoot = this.#currentProtectedRoot(state);
      if (protectedRoot !== null && composedContains(protectedRoot, anchor)) {
        return true;
      }
    }
    return false;
  }

  #stateFor(root: HTMLElement): RootState {
    let state = this.#roots.get(root);
    if (!state) {
      state = { root, stack: [], appliedSnapshot: [], observer: null };
      this.#roots.set(root, state);
    }
    return state;
  }

  #applyForCurrentTopmost(state: RootState): void {
    const protectedRoot = this.#currentProtectedRoot(state);
    if (!protectedRoot) {
      return;
    }

    for (const child of Array.from(state.root.children)) {
      this.#inertChild(child, protectedRoot, state);
    }
  }

  #inertChild(child: Element, protectedRoot: HTMLElement, state: RootState): void {
    if (!(child instanceof HTMLElement)) {
      return;
    }
    if (child === protectedRoot) {
      return;
    }
    if (child.hasAttribute(MODAL_PEER_ATTRIBUTE) || child.hasAttribute(MODAL_EXEMPT_ATTRIBUTE)) {
      return;
    }
    if (state.appliedSnapshot.some((entry) => entry.el === child)) {
      return;
    }

    state.appliedSnapshot.push({
      el: child,
      hadInert: child.hasAttribute('inert'),
      prevAriaHidden: child.getAttribute('aria-hidden'),
    });

    child.setAttribute('inert', '');
    child.setAttribute('aria-hidden', 'true');
  }

  #currentProtectedRoot(state: RootState): HTMLElement | null {
    const top = state.stack[state.stack.length - 1];
    if (!top) {
      return null;
    }
    return this.#rootLevelChild(top, state.root) ?? top;
  }

  #startObserving(state: RootState): void {
    const win = this.#document.defaultView;
    if (state.observer || !win || typeof win.MutationObserver !== 'function') {
      return;
    }
    state.observer = new win.MutationObserver((records) => {
      const protectedRoot = this.#currentProtectedRoot(state);
      if (!protectedRoot) {
        return;
      }
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
          if (node instanceof HTMLElement && node.parentElement === state.root) {
            this.#inertChild(node, protectedRoot, state);
          }
        }
      }
    });
    state.observer.observe(state.root, { childList: true });
  }

  #stopObserving(state: RootState): void {
    state.observer?.disconnect();
    state.observer = null;
  }

  #revertAppliedSnapshot(state: RootState): void {
    for (const entry of state.appliedSnapshot) {
      if (!entry.hadInert) {
        entry.el.removeAttribute('inert');
      }
      if (entry.prevAriaHidden === null) {
        entry.el.removeAttribute('aria-hidden');
      } else {
        entry.el.setAttribute('aria-hidden', entry.prevAriaHidden);
      }
    }
    state.appliedSnapshot = [];
  }

  #rootLevelChild(el: HTMLElement, root: HTMLElement): HTMLElement | null {
    let cur: HTMLElement = el;
    let parent = composedParentElement(cur);
    while (parent && parent !== root) {
      cur = parent;
      parent = composedParentElement(cur);
    }
    return parent === root ? cur : null;
  }
}
