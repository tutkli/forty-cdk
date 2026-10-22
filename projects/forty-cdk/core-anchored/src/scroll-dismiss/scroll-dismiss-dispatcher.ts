import { DestroyRef, DOCUMENT, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { composedContains } from 'forty-cdk/core';

/** Window (ms) hover opens stay suppressed after the last scroll that concerns an overlay. */
export const DEFAULT_SCROLL_DISMISS_SUPPRESSION_MS = 200;

/**
 * Which scrolls concern one registered overlay. Both accessors are read when a
 * scroll is dispatched or a suppression is queried, so a trigger or surface
 * registered after the overlay is picked up.
 */
export interface ScrollDismissScope {
  /**
   * The element the overlay is anchored to. A scroll of an element that does
   * not contain it moves nothing the overlay is positioned against, so it
   * neither dismisses nor suppresses. `null`, or an anchor no longer in the
   * document, leaves every scroll in scope.
   */
  readonly anchor: () => Element | null;
  /**
   * The overlay's own surface. A scroll inside it (an `overflow: auto` region
   * in the content) neither dismisses nor suppresses.
   */
  readonly surface: () => Element | null;
}

/** Inputs for {@link ScrollDismissDispatcher.register}. */
export interface ScrollDismissOptions {
  /**
   * Closes the overlay and cancels its pending timers. Called synchronously on
   * every scroll in scope while {@link active} holds.
   */
  readonly dismiss: () => void;
  /** Narrows which scrolls dismiss and suppress. Omitted, every scroll does. */
  readonly scope?: ScrollDismissScope;
  /**
   * Whether a scroll has anything to dismiss: the overlay is open, or an open /
   * close timer is pending. Read before the scope, so an idle overlay costs one
   * call per scroll. Omitted, the registration is always active.
   */
  readonly active?: () => boolean;
}

/** Handle returned by {@link ScrollDismissDispatcher.register}. */
export interface ScrollDismissRegistration {
  /**
   * Whether a scroll in this registration's scope happened within the
   * suppression window. Hover opens bail while this returns `true`, so content
   * sliding under a stationary pointer cannot flicker the overlay open.
   * Always `false` on the server and after {@link unregister}.
   */
  isSuppressed(): boolean;
  /** Removes this registration. Idempotent; call it from a `DestroyRef` hook. */
  unregister(): void;
}

interface Registration {
  readonly dismiss: () => void;
  readonly scope: ScrollDismissScope | undefined;
  readonly active: () => boolean;
}

const ALWAYS_ACTIVE = (): boolean => true;

const SERVER_REGISTRATION: ScrollDismissRegistration = {
  isSuppressed: () => false,
  unregister: () => {},
};

/**
 * Application-scoped owner of the single capture-phase document `scroll`
 * listener shared by every hover-driven anchored overlay (Tooltip, HoverCard).
 *
 * When an ancestor scroll container moves its content under a stationary
 * cursor, the browser does not reliably dispatch `pointerleave` /
 * `pointerenter` on the triggers sliding past the pointer. On each scroll the
 * dispatcher therefore dismisses every active registration whose scope the
 * scroll concerns, and records the scrolled element with a timestamp. A
 * registration is suppressed while a recorded scroll within
 * {@link DEFAULT_SCROLL_DISMISS_SUPPRESSION_MS} concerns its own scope, so a
 * scroll elsewhere on the page, or inside the overlay's own surface, never
 * blocks its hover opens.
 *
 * One listener is installed with the first registration and removed with the
 * last. Per scroll the work is one map write plus one `active()` call per
 * registration; the containment walk runs only for active registrations, and
 * for idle ones only when their own hover asks whether it is suppressed.
 *
 * `providedIn: 'root'`, so it is one instance per application injector and is
 * garbage-collected with it. Internal core tier, exported for the tooltip /
 * hover-card entry points, never for consumers.
 */
@Injectable({ providedIn: 'root' })
export class ScrollDismissDispatcher {
  readonly #doc = inject(DOCUMENT);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly #registrations = new Set<Registration>();
  readonly #recentScrolls = new Map<EventTarget | null, number>();
  #listener: AbortController | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.#listener?.abort();
      this.#listener = null;
      this.#registrations.clear();
      this.#recentScrolls.clear();
    });
  }

  /**
   * Registers an overlay for scroll dismissal and per-overlay suppression. Each
   * call is an independent registration, so registering the same callback
   * twice yields two handles that must both be unregistered. A no-op handle on
   * the server.
   */
  register(options: ScrollDismissOptions): ScrollDismissRegistration {
    if (!this.#isBrowser) {
      return SERVER_REGISTRATION;
    }
    const registration: Registration = {
      dismiss: options.dismiss,
      scope: options.scope,
      active: options.active ?? ALWAYS_ACTIVE,
    };
    this.#registrations.add(registration);
    this.#listen();
    return {
      isSuppressed: () =>
        this.#registrations.has(registration) && this.#suppresses(registration.scope),
      unregister: () => this.#unregister(registration),
    };
  }

  #listen(): void {
    if (this.#listener) {
      return;
    }
    this.#listener = new AbortController();
    this.#doc.addEventListener('scroll', (event) => this.#onScroll(event), {
      capture: true,
      passive: true,
      signal: this.#listener.signal,
    });
  }

  #unregister(registration: Registration): void {
    if (!this.#registrations.delete(registration) || this.#registrations.size > 0) {
      return;
    }
    this.#listener?.abort();
    this.#listener = null;
    this.#recentScrolls.clear();
  }

  #onScroll(event: Event): void {
    const now = Date.now();
    this.#recentScrolls.delete(event.target);
    this.#recentScrolls.set(event.target, now + DEFAULT_SCROLL_DISMISS_SUPPRESSION_MS);
    this.#pruneExpired(now);
    for (const registration of this.#registrations) {
      if (
        registration.active() &&
        (!registration.scope || scrollConcerns(event.target, registration.scope))
      ) {
        registration.dismiss();
      }
    }
  }

  #pruneExpired(now: number): void {
    for (const [target, until] of this.#recentScrolls) {
      if (until > now) {
        return;
      }
      this.#recentScrolls.delete(target);
    }
  }

  #suppresses(scope: ScrollDismissScope | undefined): boolean {
    const now = Date.now();
    this.#pruneExpired(now);
    for (const target of this.#recentScrolls.keys()) {
      if (!scope || scrollConcerns(target, scope)) {
        return true;
      }
    }
    return false;
  }
}

function scrollConcerns(target: EventTarget | null, scope: ScrollDismissScope): boolean {
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
