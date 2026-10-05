import { DestroyRef, DOCUMENT, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { composedContains } from 'forty-cdk/core';
import { attachScrollDismiss, type ScrollDismiss } from './scroll-dismiss';

/**
 * Which scrolls concern one registered overlay. Both accessors are read on
 * every scroll, so a trigger or surface registered after the overlay is picked
 * up.
 */
export interface ScrollDismissScope {
  /**
   * The element the overlay is anchored to. A scroll of an element that does
   * not contain it moves nothing the overlay is positioned against, so it does
   * not dismiss. `null`, or an anchor no longer in the document, leaves every
   * scroll in scope.
   */
  readonly anchor: () => Element | null;
  /**
   * The overlay's own surface. A scroll inside it (an `overflow: auto` region
   * in the content) does not dismiss.
   */
  readonly surface: () => Element | null;
}

interface ScrollDismissRegistration {
  readonly dismiss: () => void;
  readonly scope: ScrollDismissScope | undefined;
}

/**
 * Application-scoped owner of the single document `scroll` listener shared by
 * every hover-driven anchored overlay (Tooltip, HoverCard).
 *
 * Each overlay used to call {@link attachScrollDismiss} in its own constructor,
 * so a table with one tooltip per row installed N capture-phase `scroll`
 * listeners on `document` that all fired on every scroll anywhere — even with
 * every tooltip closed. This dispatcher installs exactly one listener on the
 * first registration and removes it with the last, fanning each scroll out to
 * every registered `dismiss` callback whose scope it concerns and sharing a
 * single suppression window.
 *
 * The refcounted install / teardown mirrors `ForToastManager`'s shared hotkey
 * listener. `providedIn: 'root'` so it is one instance per application injector
 * (garbage-collected with it, no listener leak between SSR requests); a
 * component-scoped `provideForTooltipDefaults` never re-provides it, so the
 * listener stays truly app-wide. Internal core tier — exported for the tooltip /
 * hover-card entry points, never for consumers.
 */
@Injectable({ providedIn: 'root' })
export class ScrollDismissDispatcher {
  readonly #doc = inject(DOCUMENT);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly #registrations = new Set<ScrollDismissRegistration>();
  #scrollDismiss: ScrollDismiss | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.#scrollDismiss?.destroy();
      this.#scrollDismiss = null;
      this.#registrations.clear();
    });
  }

  /**
   * Whether an ancestor scroll has opened the shared suppression window. Overlay
   * open handlers bail while this returns `true` so content sliding under a
   * stationary pointer can't flicker overlays open. Always `false` on the
   * server and while no scroll listener is installed. Every scroll opens the
   * window, whatever scope it falls in.
   */
  isSuppressed(): boolean {
    return this.#scrollDismiss?.isSuppressed() ?? false;
  }

  /**
   * Registers `dismiss` to run on every ancestor scroll in `scope`. Each call is
   * an independent registration tracked by its own token, so registering the
   * same callback twice yields two independent teardowns that fire it twice and
   * must both run to remove it. Installs the shared listener on the first
   * registration and returns a teardown that removes exactly this registration,
   * tearing the listener down with the last one. The teardown is idempotent —
   * calling it more than once has no effect on any sibling registration. A
   * no-op returning an empty teardown on the server.
   *
   * @param dismiss Called on every ancestor scroll in scope; implement it as a
   *   no-op when the overlay is neither open nor armed.
   * @param scope Narrows which scrolls reach `dismiss`. Omitted, every scroll
   *   does.
   * @returns A teardown to run from the caller's `DestroyRef` hook.
   */
  register(dismiss: () => void, scope?: ScrollDismissScope): () => void {
    if (!this.#isBrowser) {
      return () => {};
    }
    const registration: ScrollDismissRegistration = { dismiss, scope };
    this.#registrations.add(registration);
    if (!this.#scrollDismiss) {
      this.#scrollDismiss = attachScrollDismiss(this.#doc, {
        dismiss: (event) => {
          for (const reg of [...this.#registrations]) {
            if (!reg.scope || scrollConcerns(event, reg.scope)) {
              reg.dismiss();
            }
          }
        },
      });
    }
    return () => {
      if (!this.#registrations.delete(registration)) {
        return;
      }
      if (this.#registrations.size === 0) {
        this.#scrollDismiss?.destroy();
        this.#scrollDismiss = null;
      }
    };
  }
}

function scrollConcerns(event: Event, scope: ScrollDismissScope): boolean {
  const target = event.target;
  if (!(target instanceof Node)) {
    return true;
  }
  const surface = scope.surface();
  if (surface && composedContains(surface, target)) {
    return false;
  }
  const anchor = scope.anchor();
  if (!anchor || !anchor.isConnected) {
    return true;
  }
  return composedContains(target, anchor);
}
