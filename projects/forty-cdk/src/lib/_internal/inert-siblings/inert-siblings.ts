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
 * SSR: the registry is `providedIn: 'root'` so its state is scoped to a
 * single Angular bootstrap (one per SSR request). On the server, every
 * operation is a no-op — overlays only call `activate()` from
 * `afterNextRender`, which doesn't run server-side.
 */

const PEER_ATTRIBUTE = 'data-for-modal-peer';

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

  /**
   * Push `owner` onto the inert-siblings stack and (re)apply the isolation
   * outcome for the new topmost owner. Returns a handle whose
   * `deactivate()` pops this specific owner — order-safe, so closing out
   * of LIFO order works.
   */
  activate(owner: HTMLElement): InertSiblingsHandle {
    if (!this.#isBrowser) {
      return { deactivate: () => {}, get isActive(): boolean { return false; } };
    }
    // Always revert before mutating the stack so the recompute below
    // starts from a clean DOM state — otherwise a sibling inerted by the
    // previous topmost would accumulate a second snapshot entry on the
    // next push.
    this.#revertAppliedSnapshot();
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
        }
      },
    };
  }

  #applyForCurrentTopmost(): void {
    const top = this.#stack[this.#stack.length - 1];
    if (!top) {
      return;
    }
    const protectedRoot = this.#bodyLevelAncestor(top) ?? top;

    for (const child of Array.from(this.#document.body.children)) {
      if (!(child instanceof HTMLElement)) {
        continue;
      }
      if (child === protectedRoot) {
        continue;
      }
      if (child.hasAttribute(PEER_ATTRIBUTE)) {
        continue;
      }

      this.#appliedSnapshot.push({
        el: child,
        hadInert: child.hasAttribute('inert'),
        prevAriaHidden: child.getAttribute('aria-hidden'),
      });

      child.setAttribute('inert', '');
      child.setAttribute('aria-hidden', 'true');
    }
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

