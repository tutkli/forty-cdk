import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  DOCUMENT,
  ElementRef,
  Injectable,
  inject,
  isDevMode,
  PLATFORM_ID,
} from '@angular/core';

import { composedContains, resolveActiveElement } from '../composed-tree/composed-tree';
import {
  isFocusableCandidate,
  isTabbableCandidate,
  queryFocusableCandidates,
} from './focusable-candidate';

/**
 * Returns the first focusable descendant of `container`, or `null` if none
 * exists. Uses the shared `isFocusableCandidate` filter (excludes `[hidden]`,
 * elements carrying or nested under an `[inert]` ancestor below the
 * container, and elements hidden via CSS `display: none` / `visibility:
 * hidden`, none of which can receive focus). This is the focusable set — a
 * candidate carrying `tabindex="-1"` is a valid initial-focus target even
 * though it never participates in the Tab cycle.
 *
 * Descends into open shadow roots, so a surface whose first control is
 * rendered inside a consumer's web component focuses that control rather than
 * skipping past the host.
 */
export function findFirstFocusable(container: HTMLElement): HTMLElement | null {
  const candidates = queryFocusableCandidates(container);
  for (const el of candidates) {
    if (isFocusableCandidate(el, container)) {
      return el;
    }
  }
  return null;
}

export interface FocusTrapActivateOptions {
  /**
   * Where to send focus on activation.
   * - `'first'` (default): the first focusable descendant. Falls back to the container.
   * - `'container'`: the trap container itself (gains `tabindex="-1"` if needed).
   * - explicit element: focuses that element directly.
   */
  initialFocus?: 'first' | 'container' | HTMLElement;
  /**
   * When `true`, sets up Tab cycling and captures the previously-focused
   * element for return on deactivate, but skips the imperative `.focus()`
   * call. Lets the consumer keep focus elsewhere on open while still
   * benefitting from the trap's keyboard cycling once focus enters the
   * surface. Default `false`.
   */
  preventInitialFocus?: boolean;
  /**
   * Explicit element to restore focus to on `deactivate({ returnFocus: true })`.
   * When omitted (default), the trap captures `document.activeElement` at
   * activation time. Pass this when the caller needs to lock the return
   * target *before* a side-effect that mutates focus — e.g. `ForDialog`
   * capturing the trigger before applying `inert` on siblings, since
   * WebKit auto-blurs descendants of a freshly-inert ancestor.
   */
  returnFocus?: HTMLElement | null;
}

export interface FocusTrapDeactivateOptions {
  /** Whether to restore focus to whatever held it at activation time. Default `true`. */
  returnFocus?: boolean;
}

/**
 * Application-scoped LIFO registry of currently-active `FocusTrap`
 * instances. Each trap registers itself on `activate` and removes itself
 * on `deactivate`. The topmost trap is the only one that handles Tab — all
 * earlier (shallower) traps' keydown listeners are no-ops while shadowed,
 * which is what makes nested overlays (e.g. a drawer inside a drawer) trap
 * focus inside the topmost surface instead of the parent's "focus jumped
 * outside" guard yanking focus back to the parent.
 *
 * Why a service rather than module-level state:
 *
 * - Bootstrap-safety: a module-level array survives
 *   `TestBed.resetTestingModule()`, micro-frontend reloads and any other
 *   code that destroys `ApplicationRef`, so a stale LIFO can leak across
 *   bootstraps. A `providedIn: 'root'` service is instantiated per
 *   application injector and garbage-collected with it, so every bootstrap
 *   starts with an empty stack.
 * - SSR isolation: module-level globals leak between simultaneous server
 *   requests in the same Node process; a root-scoped service is per-request.
 *
 * This mirrors the storage strategy of `DismissibleLayerStack`: all
 * overlay-nesting LIFO stacks are root-scoped DI services, never
 * module-level. The two remain separate services on purpose because they
 * own different responsibilities — `DismissibleLayerStack` centrally owns
 * the shared `document` listeners for Escape / outside-interaction, whereas
 * each `FocusTrap` owns its own keydown listener and only consults this
 * registry to decide whether it is topmost. This holder therefore needs no
 * `DOCUMENT` / `PLATFORM_ID` / `DestroyRef` injection: it is a
 * dependency-free LIFO of trap instances.
 */
@Injectable({ providedIn: 'root' })
export class FocusTrapStack {
  readonly #stack: FocusTrap[] = [];

  /** Pushes a newly-activated trap onto the top of the stack. */
  push(trap: FocusTrap): void {
    this.#stack.push(trap);
  }

  /** Removes a deactivated trap from the stack (last occurrence). */
  remove(trap: FocusTrap): void {
    const idx = this.#stack.lastIndexOf(trap);
    if (idx >= 0) {
      this.#stack.splice(idx, 1);
    }
  }

  /** Returns `true` when `trap` is the topmost (most recently pushed) trap. */
  isTopmost(trap: FocusTrap): boolean {
    return this.#stack[this.#stack.length - 1] === trap;
  }
}

/**
 * Cycles Tab / Shift+Tab focus inside a container element. Used by Dialog,
 * Drawer, Sheet, and any other primitive that needs to keep keyboard focus
 * scoped to a section of the page.
 *
 * When multiple traps are active simultaneously (nested overlays), only
 * the LIFO topmost trap handles Tab. Outer traps stay registered (so
 * cleanup ordering is preserved) but their keydown handlers are no-ops
 * until the deeper trap deactivates.
 *
 * Shadow DOM: every question the trap asks is answered against the composed
 * tree — the tabbable set descends into open shadow roots, and "is focus still
 * mine?" climbs back out of them instead of reading the `document.activeElement`
 * host — so controls a consumer's web component renders inside its shadow root
 * take part in the cycle rather than collapsing onto their host, which is what
 * let Tab escape the surface ([#1586](https://github.com/tutkli/forty-cdk/issues/1586)).
 * A closed shadow root stays opaque, by construction.
 *
 * Out of scope: marking the rest of the page `inert` (focus trap alone is
 * enough for keyboard users; pointer-isolation is the consumer's job via
 * a backdrop).
 */
export class FocusTrap {
  readonly #container: HTMLElement;
  readonly #stack: FocusTrapStack;
  readonly #document: Document;
  readonly #isBrowser: boolean;
  #returnTo: HTMLElement | null = null;
  #active = false;
  #containerHadTabindex = false;
  #keyboardChannel: AbortController | null = null;

  readonly #onKeyDown = (event: KeyboardEvent): void => this.#handleKeyDown(event);

  constructor(container: HTMLElement, stack: FocusTrapStack, doc?: Document, isBrowser = true) {
    this.#container = container;
    this.#stack = stack;
    this.#document = doc ?? container.ownerDocument;
    this.#isBrowser = isBrowser;
  }

  get container(): HTMLElement {
    return this.#container;
  }

  /**
   * Whether the trap has been activated and not yet deactivated.
   *
   * This is **not** a reading of the keyboard channel. `injectFocusTrap`'s
   * safety-net teardown calls {@link releaseKeyboardChannel}, which removes the
   * `document` listener and the {@link FocusTrapStack} entry while deliberately
   * leaving this flag set — so a trap whose owner was destroyed without
   * deactivating still reports `true` forever.
   *
   * The corollary is that this is the wrong gate for anything running from a
   * `DestroyRef.onDestroy` hook: the consumer's own `deactivate()` has not run
   * yet at that point, so every correctly-closed surface in the library reads
   * `true` there too. A check that needs the settled answer defers past the
   * whole hook chain instead — which is what the helper's dev-mode warning does
   * with a `queueMicrotask` scheduled from the net, where `true` finally means
   * "nobody deactivated" ([#1617](https://github.com/tutkli/forty-cdk/issues/1617)).
   */
  get isActive(): boolean {
    return this.#active;
  }

  activate(options: FocusTrapActivateOptions = {}): void {
    if (this.#active || !this.#isBrowser) {
      return;
    }
    this.#active = true;
    this.#containerHadTabindex = this.#container.hasAttribute('tabindex');
    this.#returnTo =
      options.returnFocus !== undefined
        ? options.returnFocus
        : (resolveActiveElement(this.#document) as HTMLElement | null);
    this.#keyboardChannel = new AbortController();
    this.#document.addEventListener('keydown', this.#onKeyDown, {
      capture: true,
      signal: this.#keyboardChannel.signal,
    });
    this.#stack.push(this);

    if (options.preventInitialFocus) {
      // Tab cycling and return-focus are still set up; the imperative
      // focus move is the only thing skipped. Focus stays wherever the
      // consumer wants until they choose to enter the trap.
      return;
    }

    const initial = options.initialFocus ?? 'first';
    if (initial === 'first') {
      const first = this.#focusables()[0];
      if (first) {
        first.focus();
      } else {
        this.#focusContainer();
      }
    } else if (initial === 'container') {
      this.#focusContainer();
    } else {
      initial.focus();
    }
  }

  /**
   * Deactivates the trap: removes the keydown listener, unregisters from the
   * stack, and (unless `returnFocus: false`) restores focus to the element
   * captured on activation.
   *
   * Return focus is skipped when the captured target is no longer connected
   * to the document — e.g. the trigger was unmounted while the surface was
   * open. Focusing a disconnected node is a no-op that silently drops focus
   * to `<body>`; skipping the imperative move instead lets the browser apply
   * its own default (focus stays on the surface's last-focused element until
   * that element is itself removed), which is the least-surprising behavior.
   */
  deactivate(options: FocusTrapDeactivateOptions = {}): void {
    if (!this.#active) {
      return;
    }
    this.releaseKeyboardChannel();
    this.#active = false;

    if (this.#containerHadTabindex === false && this.#container.getAttribute('tabindex') === '-1') {
      // We added it on activation; remove it so we don't leak.
      this.#container.removeAttribute('tabindex');
    }
    this.#containerHadTabindex = false;

    const returnFocus = options.returnFocus !== false;
    if (returnFocus && this.#returnTo?.isConnected) {
      this.#returnTo.focus();
    }
    this.#returnTo = null;
  }

  /**
   * Removes the `document` keydown listener and the {@link FocusTrapStack}
   * entry — the half of teardown that is never a judgement call — while
   * leaving focus and the trap's active state untouched. A no-op on a trap
   * that is not active.
   *
   * Two properties make this callable from a safety-net hook that may run
   * *before* the owner's own cleanup (`DestroyRef.onDestroy` callbacks fire in
   * registration order): the trap stays `isActive`, so a later
   * `deactivate({ returnFocus: true })` still performs its focus move rather
   * than bailing on an already-torn-down trap; and both removals are
   * idempotent, so the two may run in either order, or twice.
   *
   * The temporary container `tabindex="-1"` is deliberately left alone —
   * undoing it belongs to `deactivate`, and a container nobody deactivated is
   * being destroyed along with the attribute.
   *
   * Not a substitute for `deactivate()`: this exists for the safety-net hook,
   * and calling it on a trap that is still in use leaves one that reports
   * `isActive` yet cycles nothing, whose `activate()` is a silent no-op.
   */
  releaseKeyboardChannel(): void {
    if (!this.#active) {
      return;
    }
    this.#keyboardChannel?.abort();
    this.#keyboardChannel = null;
    this.#stack.remove(this);
  }

  #focusContainer(): void {
    if (!this.#containerHadTabindex && !this.#container.hasAttribute('tabindex')) {
      this.#container.setAttribute('tabindex', '-1');
    }
    this.#container.focus();
  }

  #handleKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') {
      return;
    }
    // Only the topmost active trap handles Tab. Earlier (shadowed) traps
    // bail so a parent drawer's "focus jumped outside" guard does not
    // pull focus out of a nested child drawer's surface.
    if (!this.#stack.isTopmost(this)) {
      return;
    }
    const tabbables = this.#tabbables();
    const active = resolveActiveElement(this.#document);
    if (tabbables.length === 0) {
      event.preventDefault();
      if (!composedContains(this.#container, active)) {
        this.#focusContainer();
      }
      return;
    }
    const first = tabbables[0]!;
    const last = tabbables[tabbables.length - 1]!;

    if (!composedContains(this.#container, active)) {
      // Focus jumped outside the trap (e.g. user clicked address bar then
      // tabbed back). Pull it back in.
      event.preventDefault();
      first.focus();
      return;
    }
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  #focusables(): HTMLElement[] {
    const all = queryFocusableCandidates(this.#container);
    return all.filter((el) => isFocusableCandidate(el, this.#container));
  }

  #tabbables(): HTMLElement[] {
    const all = queryFocusableCandidates(this.#container);
    return all.filter((el) => isTabbableCandidate(el, this.#container));
  }
}

/**
 * Reports an owner that activated a trap and was destroyed without ever calling
 * `deactivate()` — the defect the teardown net repairs, which would otherwise
 * leave no trace beyond focus silently not returning.
 *
 * Scheduled as a microtask by the net rather than run inside it, because
 * {@link FocusTrap.isActive} is not yet final there: `DestroyRef.onDestroy`
 * callbacks fire in registration order, so the consumer's own `deactivate()` —
 * registered after the `injectFocusTrap()` call that set the net up — has not
 * run when the net does. Angular runs the whole chain synchronously during view
 * destruction, so a microtask scheduled from the net observes the settled flag:
 * `false` for an owner that deactivated (on either hook order), `true` only for
 * one that never did. The net deliberately leaves the flag set, so no extra
 * bookkeeping is needed to tell the two apart.
 *
 * The residual false positive is an owner that deactivates from something
 * asynchronous. Nothing in the library does — `injectModalShell` is the only
 * caller of {@link injectFocusTrap}, and its `deactivate()` is a plain
 * statement inside its own destroy hook — and a surface that defers its close
 * focus move past the destroy tick has already lost return focus for the same
 * reason the warning names.
 *
 * Kept module-private: `injectFocusTrap` is the only net in the library today.
 * `injectDismissibleLayer` and `InertSiblingsStack` share the hook-order
 * problem and would share this shape, so the second one to want it extracts a
 * core helper rather than copying this.
 */
function warnIfNeverDeactivated(trap: FocusTrap): void {
  if (!trap.isActive) {
    return;
  }
  console.warn(
    `[forty-cdk/core] injectFocusTrap: a focus trap was still active when its owner was ` +
      `destroyed, so the owner never called \`deactivate()\`. The teardown safety net released ` +
      `the keyboard channel (the \`document\` keydown listener and the stack entry), but focus ` +
      `was not returned — only the owner can decide where it goes. Call ` +
      `\`trap.deactivate({ returnFocus })\` from the owner's own \`DestroyRef.onDestroy\`.`,
  );
}

/**
 * Creates a `FocusTrap` for the directive's host element. Activation is the
 * consumer's responsibility, and so is the focus move on teardown — call
 * `trap.activate()` when the surface opens and
 * `trap.deactivate({ returnFocus })` from a `DestroyRef.onDestroy` (or
 * equivalent) when it closes.
 *
 * The two halves of teardown have different owners, so only one of them gets a
 * safety net. **Where focus goes on close** is a decision only the consumer can
 * make — forcing `returnFocus: false` from here would race a cleanup that wants
 * `true`, and an unconditional `true` could dump focus on a removed element —
 * so the helper never moves focus. **Removing the `document` keydown listener
 * and the {@link FocusTrapStack} entry** is not a decision at all: a keyboard
 * channel that outlives its container becomes topmost again as soon as the trap
 * above it deactivates, then `preventDefault()`s Tab and focuses a detached
 * node, which drops focus on `<body>` and breaks keyboard navigation for the
 * rest of the session. The helper therefore registers
 * {@link FocusTrap.releaseKeyboardChannel} unconditionally on injector destroy,
 * so an owner that never calls `deactivate()` — a new overlay activating a trap
 * on its own, an early-return path that skips the call — cannot leave one
 * behind.
 *
 * The net is deliberately not a `deactivate({ returnFocus: false })`, which
 * would only look equivalent: `DestroyRef.onDestroy` callbacks fire in
 * registration order, so this hook runs *before* the hook of the consumer that
 * called `injectFocusTrap()`, and a full deactivate here would flip the trap
 * inactive first and make the consumer's own
 * `deactivate({ returnFocus: true })` bail. That loses return focus on every
 * correctly-written surface — the helper would win the race it is not entitled
 * to arbitrate, rather than avoid it.
 *
 * The net repairs the leak and reports nothing, which would leave the missing
 * `deactivate()` invisible — so in dev mode it also schedules
 * {@link warnIfNeverDeactivated} to name it. Both halves of the gate are read
 * in the hook itself: a production build schedules no microtask, and neither
 * does a trap that was never activated.
 *
 * SSR-safe: the trap is constructed with the resolved platform, so
 * `activate()` is a no-op off-browser (no `document` keydown listener)
 * rather than relying on the caller to gate it behind `afterNextRender`.
 * The safety net inherits that gate — it bails on an inactive trap, so it
 * touches no `document` off-browser either, and the warning inherits it in
 * turn (a trap that never activated reads `false` here).
 */
export function injectFocusTrap(): FocusTrap {
  const host = inject<ElementRef<HTMLElement>>(ElementRef);
  const trap = new FocusTrap(
    host.nativeElement,
    inject(FocusTrapStack),
    inject(DOCUMENT),
    isPlatformBrowser(inject(PLATFORM_ID)),
  );
  inject(DestroyRef).onDestroy(() => {
    const wasActive = trap.isActive;
    trap.releaseKeyboardChannel();
    if (isDevMode() && wasActive) {
      queueMicrotask(() => warnIfNeverDeactivated(trap));
    }
  });
  return trap;
}
