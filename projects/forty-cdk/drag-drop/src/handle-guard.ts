import { computed, type Signal } from '@angular/core';

/**
 * Per-directive pointer drag-start guard shared by `ForDraggable` and
 * `ForFreeDrag`: tracks `[forDragHandle]` elements, decides whether a
 * `pointerdown` may begin a drag (left mouse button only; if any handle is
 * registered the press must originate inside one), and derives the
 * `touch-action` style that suppresses native scrolling on a handle-less host.
 */
export interface PointerHandleGuard {
  /** `'none'` while the host should suppress native touch scrolling, else `null`. */
  readonly touchAction: Signal<'none' | null>;
  /** Register a `[forDragHandle]` element. */
  register(el: HTMLElement): void;
  /** Unregister a previously registered handle element. */
  unregister(el: HTMLElement): void;
  /** Whether a `pointerdown` event is allowed to start a drag. */
  canStart(event: PointerEvent): boolean;
}

/**
 * Builds a {@link PointerHandleGuard}. Call from a directive's injection
 * context (field initializer or constructor) so `touchAction`'s `computed`
 * registers correctly.
 *
 * @param disabled Signal reporting whether dragging is currently disabled.
 */
export function createPointerHandleGuard(disabled: Signal<boolean>): PointerHandleGuard {
  const handles = new Set<HTMLElement>();
  return {
    touchAction: computed<'none' | null>(() => (!disabled() && handles.size === 0 ? 'none' : null)),
    register(el: HTMLElement): void {
      handles.add(el);
    },
    unregister(el: HTMLElement): void {
      handles.delete(el);
    },
    canStart(event: PointerEvent): boolean {
      if (disabled()) {
        return false;
      }
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return false;
      }
      if (handles.size === 0) {
        return true;
      }
      const target = event.target as Node | null;
      return target !== null && [...handles].some((h) => h.contains(target));
    },
  };
}
