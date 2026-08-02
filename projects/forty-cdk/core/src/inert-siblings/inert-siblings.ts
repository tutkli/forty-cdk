import { DOCUMENT, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { composedContains, composedParentElement } from '../composed-tree/composed-tree';

/**
 * Marks every direct child of a **root element** (default `document.body`,
 * or a positioned container when a region-scoped modal passes one — #819)
 * other than the topmost active owner (and any element flagged as a
 * peer-of-owner via the `data-for-modal-peer` attribute) as `inert` and
 * `aria-hidden="true"` while at least one owner is active on that root.
 * Restores each touched element to its exact prior state once the last
 * owner deactivates.
 *
 * Why this exists: `aria-modal="true"` alone is insufficient. Safari +
 * VoiceOver and several other AT combinations still announce siblings of an
 * aria-modal node unless the rest of the document is explicitly hidden. The
 * WAI-ARIA APG modal-dialog pattern recommends combining `aria-modal` with
 * isolating the rest of the page.
 *
 * Stacking model (LIFO with safe out-of-order teardown) — per root:
 *
 * - Each root has its own owner-stack, applied snapshot, and
 *   `MutationObserver`. A `document.body` root and a container root are
 *   fully independent — locking one does not affect the other.
 * - A stack of active owners is maintained per root. The element-level
 *   outcome is computed from the *current topmost owner* every time the
 *   stack changes.
 * - When the topmost owner changes, the previous outcome is fully reverted
 *   to the snapshot captured before it was applied, then a fresh outcome is
 *   computed and applied for the new topmost.
 * - This means closing dialogs out of LIFO order still leaves the document
 *   in a coherent state: the topmost remaining dialog gets its expected
 *   isolation, and full restoration runs only when the stack empties.
 *
 * Portal compatibility: the owner does not need to be a direct child of the
 * root. We resolve the *root-level child* that is an ancestor of the owner
 * and exclude that subtree, so an in-place (non-portaled) dialog still keeps
 * its enclosing app shell interactive while everything else is inerted. That
 * walk climbs the composed tree: an owner rendered inside a consumer's shadow
 * root still resolves to the root-level child hosting it, where a
 * `parentElement` walk would stop at the boundary, find no root-level child,
 * and fall back to inerting the very subtree the modal lives in
 * ([#1586](https://github.com/tutkli/forty-cdk/issues/1586)).
 *
 * Peers: any element carrying the `data-for-modal-peer` attribute is
 * excluded from the snapshot (e.g. a dialog backdrop portaled to body
 * alongside the dialog). The `data-for-modal-exempt` attribute is excluded
 * the same way — it additionally opts the element out of the dismissible
 * layer (e.g. a toast viewport), see {@link MODAL_EXEMPT_ATTRIBUTE}.
 *
 * Late siblings: an element portaled to the root *after* the topmost owner
 * activated would otherwise escape the isolation, since the initial sweep
 * only sees the children present at activation. While any owner is active a
 * `MutationObserver` watches the root's child list and inerts each newly
 * added sibling under the same skip/snapshot rules, so it is restored on
 * teardown too. The observer starts on the 0→1 owner transition and
 * disconnects when the stack empties.
 *
 * SSR: the registry is `providedIn: 'root'` so its state is scoped to a
 * single Angular bootstrap (one per SSR request). On the server, every
 * operation is a no-op — overlays only call `activate()` from
 * `afterNextRender`, which doesn't run server-side.
 */

/**
 * Attribute that exempts a root-level child from the modal inert pass.
 * Carried by dialog / drawer backdrops (portaled alongside the modal)
 * and stamped by `injectOverlayShell` onto anchored-overlay hosts that were
 * opened from inside the protected root (#676), so the initial sweep and the
 * late-sibling observer skip them instead of inerting them like background
 * siblings. The backdrops host-bind the literal; imperative callers use this
 * exported constant.
 */
export const MODAL_PEER_ATTRIBUTE = 'data-for-modal-peer';

/**
 * Attribute that marks a root-level child as an **independent overlay surface**
 * which must stay fully usable while a modal is open. Stronger than
 * {@link MODAL_PEER_ATTRIBUTE}: like a peer it is skipped by the inert pass
 * (left interactive instead of inerted), and in addition every active modal's
 * dismissible layer treats interactions inside it as "inside", so a pointer-down
 * or focus within it never dismisses the modal (see
 * `resolveModalExemptOverlays` in the modal shell). A peer (dialog / drawer
 * backdrop) deliberately stays part of the dismiss-outside surface; an exempt
 * overlay does not.
 *
 * Carried by `ForToastViewport` so a toast shown over an open modal `ForDialog`
 * / `ForDrawer` stays interactive (when the viewport sits at the document-body
 * level) and a click on a toast never closes the modal. The viewport host-binds
 * the literal; imperative callers use this exported constant.
 */
export const MODAL_EXEMPT_ATTRIBUTE = 'data-for-modal-exempt';

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
   * container stay fully interactive (#819).
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
   * them (#676). SSR-safe: on the server the roots map is always empty (no
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
