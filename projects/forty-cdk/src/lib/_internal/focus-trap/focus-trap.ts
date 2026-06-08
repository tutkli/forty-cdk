import { DOCUMENT, ElementRef, Injectable, inject } from '@angular/core';

/**
 * Shared CSS selector for tabbable elements. Single source of truth for the
 * library — primitives that need their own focus-finding logic (e.g. the
 * dialog directive's non-modal initial focus, the programmatic dialog
 * manager's bootstrap, future menu / popover initial-focus paths) import
 * this rather than maintaining a private copy that drifts.
 */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
  'audio[controls]',
  'video[controls]',
].join(',');

/**
 * Returns the first tabbable descendant of `container`, or `null` if none
 * exists. Mirrors the filter used by `FocusTrap` (excludes `[hidden]` and
 * descendants of `[inert]` ancestors below the container).
 */
export function findFirstFocusable(container: HTMLElement): HTMLElement | null {
  const candidates = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  for (const el of candidates) {
    if (el.hasAttribute('hidden')) {
      continue;
    }
    if (hasInertAncestor(el, container)) {
      continue;
    }
    return el;
  }
  return null;
}

function hasInertAncestor(el: HTMLElement, root: HTMLElement): boolean {
  let cur: HTMLElement | null = el.parentElement;
  while (cur && cur !== root) {
    if (cur.hasAttribute('inert')) {
      return true;
    }
    cur = cur.parentElement;
  }
  return false;
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
 * This mirrors the storage strategy of `DismissableLayerStack`: all
 * overlay-nesting LIFO stacks are root-scoped DI services, never
 * module-level. The two remain separate services on purpose because they
 * own different responsibilities — `DismissableLayerStack` centrally owns
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
 * Out of scope: marking the rest of the page `inert` (focus trap alone is
 * enough for keyboard users; pointer-isolation is the consumer's job via
 * a backdrop).
 */
export class FocusTrap {
  readonly #container: HTMLElement;
  readonly #stack: FocusTrapStack;
  readonly #document: Document;
  #returnTo: HTMLElement | null = null;
  #active = false;
  #containerHadTabindex = false;

  readonly #onKeyDown = (event: KeyboardEvent): void => this.#handleKeyDown(event);

  constructor(container: HTMLElement, stack: FocusTrapStack, doc?: Document) {
    this.#container = container;
    this.#stack = stack;
    this.#document = doc ?? container.ownerDocument;
  }

  get container(): HTMLElement {
    return this.#container;
  }

  get isActive(): boolean {
    return this.#active;
  }

  activate(options: FocusTrapActivateOptions = {}): void {
    if (this.#active) {
      return;
    }
    this.#active = true;
    this.#containerHadTabindex = this.#container.hasAttribute('tabindex');
    this.#returnTo =
      options.returnFocus !== undefined
        ? options.returnFocus
        : ((this.#document.activeElement as HTMLElement | null) ?? null);
    this.#document.addEventListener('keydown', this.#onKeyDown, true);
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

  deactivate(options: FocusTrapDeactivateOptions = {}): void {
    if (!this.#active) {
      return;
    }
    this.#active = false;
    this.#document.removeEventListener('keydown', this.#onKeyDown, true);
    this.#stack.remove(this);

    if (this.#containerHadTabindex === false && this.#container.getAttribute('tabindex') === '-1') {
      // We added it on activation; remove it so we don't leak.
      this.#container.removeAttribute('tabindex');
    }
    this.#containerHadTabindex = false;

    const returnFocus = options.returnFocus !== false;
    if (returnFocus && this.#returnTo) {
      this.#returnTo.focus();
    }
    this.#returnTo = null;
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
    const focusables = this.#focusables();
    if (focusables.length === 0) {
      event.preventDefault();
      this.#focusContainer();
      return;
    }
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    const active = this.#document.activeElement;

    if (!this.#container.contains(active)) {
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
    const all = Array.from(this.#container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    return all.filter((el) => !el.hasAttribute('hidden') && !this.#hasInertAncestor(el));
  }

  #hasInertAncestor(el: HTMLElement): boolean {
    let cur: HTMLElement | null = el;
    while (cur && cur !== this.#container) {
      if (cur.hasAttribute('inert')) {
        return true;
      }
      cur = cur.parentElement;
    }
    return false;
  }
}

/**
 * Creates a `FocusTrap` for the directive's host element. Activation and
 * deactivation are the consumer's responsibility — call `trap.activate()`
 * when the surface opens and `trap.deactivate({ returnFocus })` from a
 * `DestroyRef.onDestroy` (or equivalent) when it closes.
 *
 * The helper deliberately does NOT register a safety-net teardown: forcing
 * `returnFocus: false` from the helper would race consumer cleanups that
 * want `returnFocus: true`, and an unconditional `returnFocus: true` could
 * dump focus on a removed element. The consumer always knows the right
 * answer; do the deactivate yourself.
 */
export function injectFocusTrap(): FocusTrap {
  const host = inject<ElementRef<HTMLElement>>(ElementRef);
  return new FocusTrap(host.nativeElement, inject(FocusTrapStack), inject(DOCUMENT));
}
