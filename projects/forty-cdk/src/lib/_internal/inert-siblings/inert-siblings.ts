import { DOCUMENT, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Marks every direct child of `document.body` other than the topmost active
 * owner (and any element flagged as a peer-of-owner via the
 * `data-for-modal-peer` attribute) as `inert` and `aria-hidden="true"` while
 * at least one owner is active. Restores each touched element to its exact
 * prior state once the last owner deactivates.
 *
 * Why this exists: `aria-modal="true"` alone is insufficient. Safari +
 * VoiceOver and several other AT combinations still announce siblings of an
 * aria-modal node unless the rest of the document is explicitly hidden. The
 * WAI-ARIA APG modal-dialog pattern recommends combining `aria-modal` with
 * isolating the rest of the page; both Radix and Base UI ship this.
 *
 * Stacking model (LIFO with safe out-of-order teardown):
 *
 * - A stack of active owners is maintained. The element-level outcome is
 *   computed from the *current topmost owner* every time the stack changes.
 * - When the topmost owner changes, the previous outcome is fully reverted
 *   to the snapshot captured before it was applied, then a fresh outcome is
 *   computed and applied for the new topmost.
 * - This means closing dialogs out of LIFO order still leaves the document
 *   in a coherent state: the topmost remaining dialog gets its expected
 *   isolation, and full restoration runs only when the stack empties.
 *
 * Portal compatibility: the owner does not need to be a direct child of
 * `document.body`. We resolve the *body-level ancestor* of the owner and
 * exclude that subtree, so an in-place (non-portaled) dialog still keeps
 * its enclosing app shell interactive while everything else is inerted.
 *
 * Peers: any element carrying the `data-for-modal-peer` attribute is
 * excluded from the snapshot (e.g. a dialog backdrop portaled to body
 * alongside the dialog).
 *
 * Late siblings: an element portaled to `body` *after* the topmost owner
 * activated (e.g. a toast shown while a Dialog is open) would otherwise
 * escape the isolation, since the initial sweep only sees the children
 * present at activation. While any owner is active a `MutationObserver`
 * watches `body`'s child list and inerts each newly added sibling under
 * the same skip/snapshot rules, so it is restored on teardown too. The
 * observer starts on the 0→1 owner transition and disconnects when the
 * stack empties.
 *
 * SSR: the registry is `providedIn: 'root'` so its state is scoped to a
 * single Angular bootstrap (one per SSR request). On the server, every
 * operation is a no-op — overlays only call `activate()` from
 * `afterNextRender`, which doesn't run server-side.
 */

/**
 * Attribute that exempts a `document.body` child from the modal inert pass.
 * Carried by dialog / drawer backdrops (portaled to body alongside the modal)
 * and stamped by `injectOverlayShell` onto anchored-overlay hosts that were
 * opened from inside the protected root (#676), so the initial sweep and the
 * late-sibling observer skip them instead of inerting them like background
 * siblings. The backdrops host-bind the literal; imperative callers use this
 * exported constant.
 */
export const MODAL_PEER_ATTRIBUTE = 'data-for-modal-peer';

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

@Injectable({ providedIn: 'root' })
export class InertSiblingsStack {
  readonly #document = inject(DOCUMENT);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly #stack: HTMLElement[] = [];
  #appliedSnapshot: SnapshotEntry[] = [];
  #observer: MutationObserver | null = null;

  /**
   * Push `owner` onto the inert-siblings stack and (re)apply the isolation
   * outcome for the new topmost owner. Returns a handle whose
   * `deactivate()` pops this specific owner — order-safe, so closing out
   * of LIFO order works.
   */
  activate(owner: HTMLElement): InertSiblingsHandle {
    if (!this.#isBrowser) {
      return {
        deactivate: () => {},
        get isActive(): boolean {
          return false;
        },
      };
    }
    // Always revert before mutating the stack so the recompute below
    // starts from a clean DOM state — otherwise a sibling inerted by the
    // previous topmost would accumulate a second snapshot entry on the
    // next push.
    this.#revertAppliedSnapshot();
    if (this.#stack.length === 0) {
      this.#startObserving();
    }
    this.#stack.push(owner);
    this.#applyForCurrentTopmost();

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
        const idx = this.#stack.indexOf(owner);
        if (idx === -1) {
          return;
        }
        this.#revertAppliedSnapshot();
        this.#stack.splice(idx, 1);
        if (this.#stack.length > 0) {
          this.#applyForCurrentTopmost();
        } else {
          this.#stopObserving();
        }
      },
    };
  }

  /**
   * Whether an overlay anchored to `anchor` should be left interactive over
   * the active modal — i.e. treated as a peer of the topmost owner instead of
   * inerted. Returns `true` only while at least one owner is active AND
   * `anchor` lives inside the current protected root, which means the overlay
   * was opened from within the modal (e.g. a Select / DropdownMenu opened from
   * a form inside a Dialog).
   *
   * Returns `false` when no owner is active — so an overlay opened with no
   * modal present is never pre-marked, and a modal opened later inerts it like
   * any other background sibling — and when `anchor` sits in an already-inerted
   * background subtree (a toast or a tooltip anchored to a backdrop element).
   *
   * `injectOverlayShell` calls this when an anchored-overlay host is portaled,
   * to decide whether to stamp `MODAL_PEER_ATTRIBUTE` on it so the
   * inert-siblings observer skips forty's own overlays instead of swallowing
   * them (#676). SSR-safe: on the server the stack is always empty (no owner
   * activates), so this returns `false`.
   */
  ownsAnchor(anchor: Element): boolean {
    const protectedRoot = this.#currentProtectedRoot();
    return protectedRoot !== null && protectedRoot.contains(anchor);
  }

  #applyForCurrentTopmost(): void {
    const protectedRoot = this.#currentProtectedRoot();
    if (!protectedRoot) {
      return;
    }

    for (const child of Array.from(this.#document.body.children)) {
      this.#inertChild(child, protectedRoot);
    }
  }

  /**
   * Inert + `aria-hidden` a single direct `body` child and snapshot its prior
   * state, unless it is the protected root, a peer, a non-element, or already
   * snapshotted. Shared by the initial sweep and the observer callback so the
   * skip/snapshot rules stay identical.
   */
  #inertChild(child: Element, protectedRoot: HTMLElement): void {
    if (!(child instanceof HTMLElement)) {
      return;
    }
    if (child === protectedRoot) {
      return;
    }
    if (child.hasAttribute(MODAL_PEER_ATTRIBUTE)) {
      return;
    }
    if (this.#appliedSnapshot.some((entry) => entry.el === child)) {
      return;
    }

    this.#appliedSnapshot.push({
      el: child,
      hadInert: child.hasAttribute('inert'),
      prevAriaHidden: child.getAttribute('aria-hidden'),
    });

    child.setAttribute('inert', '');
    child.setAttribute('aria-hidden', 'true');
  }

  #currentProtectedRoot(): HTMLElement | null {
    const top = this.#stack[this.#stack.length - 1];
    if (!top) {
      return null;
    }
    return this.#bodyLevelAncestor(top) ?? top;
  }

  #startObserving(): void {
    const win = this.#document.defaultView;
    if (this.#observer || !win || typeof win.MutationObserver !== 'function') {
      return;
    }
    this.#observer = new win.MutationObserver((records) => {
      const protectedRoot = this.#currentProtectedRoot();
      if (!protectedRoot) {
        return;
      }
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
          if (node instanceof HTMLElement && node.parentElement === this.#document.body) {
            this.#inertChild(node, protectedRoot);
          }
        }
      }
    });
    this.#observer.observe(this.#document.body, { childList: true });
  }

  #stopObserving(): void {
    this.#observer?.disconnect();
    this.#observer = null;
  }

  #revertAppliedSnapshot(): void {
    for (const entry of this.#appliedSnapshot) {
      if (!entry.hadInert) {
        entry.el.removeAttribute('inert');
      }
      if (entry.prevAriaHidden === null) {
        entry.el.removeAttribute('aria-hidden');
      } else {
        entry.el.setAttribute('aria-hidden', entry.prevAriaHidden);
      }
    }
    this.#appliedSnapshot = [];
  }

  #bodyLevelAncestor(el: HTMLElement): HTMLElement | null {
    const body = this.#document.body;
    let cur: HTMLElement | null = el;
    while (cur && cur.parentElement && cur.parentElement !== body) {
      cur = cur.parentElement;
    }
    return cur && cur.parentElement === body ? cur : null;
  }
}
