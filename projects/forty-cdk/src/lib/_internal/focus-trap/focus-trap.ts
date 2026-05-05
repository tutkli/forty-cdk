import { ElementRef, inject } from '@angular/core';

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
  const candidates = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  );
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
}

export interface FocusTrapDeactivateOptions {
  /** Whether to restore focus to whatever held it at activation time. Default `true`. */
  returnFocus?: boolean;
}

/**
 * Cycles Tab / Shift+Tab focus inside a container element. Used by Dialog,
 * Drawer, Sheet, and any other primitive that needs to keep keyboard focus
 * scoped to a section of the page.
 *
 * Out of scope: marking the rest of the page `inert` (focus trap alone is
 * enough for keyboard users; pointer-isolation is the consumer's job via
 * a backdrop).
 */
export class FocusTrap {
  readonly #container: HTMLElement;
  #returnTo: HTMLElement | null = null;
  #active = false;
  #containerHadTabindex = false;

  readonly #onKeyDown = (event: KeyboardEvent): void => this.#handleKeyDown(event);

  constructor(container: HTMLElement) {
    this.#container = container;
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
    this.#returnTo = (document.activeElement as HTMLElement | null) ?? null;
    document.addEventListener('keydown', this.#onKeyDown, true);

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
    document.removeEventListener('keydown', this.#onKeyDown, true);

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
    if (!this.#container.hasAttribute('tabindex')) {
      this.#container.setAttribute('tabindex', '-1');
      this.#containerHadTabindex = false;
    } else {
      this.#containerHadTabindex = true;
    }
    this.#container.focus();
  }

  #handleKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') {
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
    const active = document.activeElement;

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
    const all = Array.from(
      this.#container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
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
  return new FocusTrap(host.nativeElement);
}
