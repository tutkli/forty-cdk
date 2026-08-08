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
import { fortyWarn } from '../errors/errors';

/**
 * Returns the first focusable descendant of `container`, or `null` if none exists.
 *
 * Excludes `[hidden]`, `[inert]` subtrees and elements hidden via CSS. A candidate carrying
 * `tabindex="-1"` still qualifies — this is the focusable set, not the Tab cycle. Descends into
 * open shadow roots.
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
   * Sets up Tab cycling and captures the return-focus target, but skips the imperative `.focus()`
   * call so focus stays wherever the consumer put it. Default `false`.
   */
  preventInitialFocus?: boolean;
  /**
   * Element to restore focus to on `deactivate({ returnFocus: true })`. Defaults to
   * `document.activeElement` at activation time.
   *
   * Pass it explicitly when the return target must be locked in before a side effect that moves
   * focus itself, such as applying `inert` to sibling elements.
   */
  returnFocus?: HTMLElement | null;
}

export interface FocusTrapDeactivateOptions {
  /** Whether to restore focus to whatever held it at activation time. Default `true`. */
  returnFocus?: boolean;
}

/**
 * Application-scoped LIFO registry of active {@link FocusTrap} instances.
 *
 * Only the topmost trap handles Tab; shallower traps stay registered with inert keydown handlers,
 * so nested overlays cycle focus inside the innermost surface.
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
 * Cycles Tab / Shift+Tab focus inside a container element.
 *
 * When several traps are active, only the topmost one handles Tab; the rest stay registered with
 * inert handlers until it deactivates.
 *
 * Both the tabbable set and the containment check are resolved against the composed tree, so
 * controls inside an open shadow root take part in the cycle. A closed shadow root stays opaque.
 *
 * Marking the rest of the page `inert` is out of scope — pointer isolation is the consumer's job.
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
   * Only `deactivate()` clears it — {@link releaseKeyboardChannel} leaves it set. It is therefore
   * not a reading of the keyboard channel, and it is still `true` during a `DestroyRef.onDestroy`
   * hook that runs before the owner's own `deactivate()`.
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
   * Removes the keydown listener, unregisters from the stack and — unless `returnFocus: false` —
   * restores focus to the element captured on activation.
   *
   * Return focus is skipped when that element is no longer connected to the document, leaving the
   * browser's own default in place rather than dropping focus to `<body>`.
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
   * Removes the `document` keydown listener and the {@link FocusTrapStack} entry, leaving focus,
   * {@link isActive} and the temporary container `tabindex` untouched. A no-op on an inactive trap.
   *
   * Idempotent, and safe to call before or after `deactivate()` — a later
   * `deactivate({ returnFocus: true })` still performs its focus move.
   *
   * Not a substitute for `deactivate()`: calling it on a trap still in use leaves one that reports
   * `isActive` yet cycles nothing, and whose `activate()` is a silent no-op.
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
 * Reports an owner that activated a trap and was destroyed without calling `deactivate()`.
 *
 * Must be scheduled as a microtask rather than run inside the destroy hook: `onDestroy` callbacks
 * fire in registration order, so {@link FocusTrap.isActive} is only settled once the whole chain
 * has run.
 */
function warnIfNeverDeactivated(trap: FocusTrap): void {
  if (!trap.isActive) {
    return;
  }
  fortyWarn({
    code: 'FORCDK-CORE-004',
    message:
      'A focus trap was still active when its owner was destroyed, so focus was not returned.',
    cause:
      'The owner never called `deactivate()`. The teardown safety net released the keyboard ' +
      'channel (the `document` keydown listener and the stack entry), but only the owner can ' +
      'decide where focus goes.',
    fix: "Call `trap.deactivate({ returnFocus })` from the owner's own `DestroyRef.onDestroy`.",
  });
}

/**
 * Creates a {@link FocusTrap} for the current directive's host element.
 *
 * Activation and teardown are the caller's responsibility: call `trap.activate()` when the surface
 * opens and `trap.deactivate({ returnFocus })` from a `DestroyRef.onDestroy` when it closes.
 *
 * On injector destroy the helper releases the keyboard channel unconditionally, so a trap whose
 * owner skipped `deactivate()` cannot keep intercepting Tab. It never moves focus — only the owner
 * can decide where focus goes — and warns in dev mode when it finds that repair necessary.
 *
 * SSR-safe: off-browser the trap registers no listener and `activate()` is a no-op.
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
