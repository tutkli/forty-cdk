import { DestroyRef, ElementRef, inject } from '@angular/core';

import { composedParentElement, resolveEventTarget } from '../composed-tree/composed-tree';
import { FOCUSABLE_SELECTOR } from '../focus-trap/focusable-candidate';

export function preventPointerFocus(when: (event: MouseEvent) => boolean = () => true): void {
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const onMouseDown = (event: MouseEvent): void => {
    if (when(event)) {
      event.preventDefault();
    }
  };
  host.addEventListener('mousedown', onMouseDown);
  inject(DestroyRef).onDestroy(() => host.removeEventListener('mousedown', onMouseDown));
}

const DISABLEABLE_CONTROLS = new Set(['button', 'input', 'select', 'textarea']);

export function pressFocusesDescendant(event: Event, host: Element): boolean {
  return mouseFocusTarget(resolveEventTarget(event), host) !== null;
}

export function mouseFocusTarget(
  node: Node | null,
  boundary: Element | null = null,
): HTMLElement | null {
  for (let current = node; current !== null && current !== boundary;) {
    if (current.nodeType === current.ELEMENT_NODE && isMouseFocusable(current as Element)) {
      return current as HTMLElement;
    }
    current = composedParentElement(current);
  }
  return null;
}

function isMouseFocusable(el: Element): boolean {
  return (el.hasAttribute('tabindex') || el.matches(FOCUSABLE_SELECTOR)) && !isDisabledControl(el);
}

function isDisabledControl(el: Element): boolean {
  if (!DISABLEABLE_CONTROLS.has(el.localName)) {
    return false;
  }
  if (el.hasAttribute('disabled')) {
    return true;
  }
  const fieldset = el.closest('fieldset[disabled]');
  return fieldset !== null && !fieldset.querySelector(':scope > legend')?.contains(el);
}

export function focusAfterPress(host: HTMLElement): void {
  host.focus({ preventScroll: true });
}

/** How long (ms) after a press, or its release, a focus still counts as caused by it. */
export const DEFAULT_PRESS_FOCUS_WINDOW_MS = 500;

/**
 * Tells a focus a pointer press caused from a keyboard focus, for a trigger that
 * opens on keyboard focus only.
 *
 * A press counts for a bounded window only, so a press that never focuses its
 * target (a `<button>` or `<a>` in macOS Safari and Firefox, a `mousedown` whose
 * default is prevented) cannot make a later keyboard focus read as
 * pointer-induced.
 */
export interface PressFocus {
  /** Records a press on the element. Call it from `pointerdown`. */
  press(): void;
  /**
   * Restarts the window when a recorded press ends, since a touch tap focuses
   * its target only after the release. Call it from `pointerup`; a no-op when
   * no press is recorded.
   */
  release(): void;
  /** Whether a focus arriving now was caused by the recorded press. Forgets the press. */
  consume(): boolean;
  /** Forgets the recorded press. Call it from `blur`. */
  reset(): void;
}

/**
 * Creates a {@link PressFocus} backed by a timestamp window.
 *
 * @param windowMs How long a press stays able to explain a focus. Defaults to
 *   {@link DEFAULT_PRESS_FOCUS_WINDOW_MS}.
 */
export function createPressFocus(windowMs: number = DEFAULT_PRESS_FOCUS_WINDOW_MS): PressFocus {
  let pressed = false;
  let stampedAt = 0;
  return {
    press(): void {
      pressed = true;
      stampedAt = Date.now();
    },
    release(): void {
      if (pressed) {
        stampedAt = Date.now();
      }
    },
    consume(): boolean {
      const induced = pressed && Date.now() - stampedAt < windowMs;
      pressed = false;
      return induced;
    },
    reset(): void {
      pressed = false;
    },
  };
}
