import { computed, inject, type Signal, signal } from '@angular/core';

import { registerHandle } from 'forty-cdk/core';
import { asDraggableContext, FOR_DRAGGABLE_CONTEXT } from './drag-drop-context';

/**
 * Per-directive pointer drag-start guard shared by `ForDraggable` and
 * `ForFreeDrag`: tracks `[forDragHandle]` elements and the draggables nested
 * inside the host, decides whether a `pointerdown` may begin a drag (left mouse
 * button only; never from inside a nested draggable; if any handle is registered
 * the press must originate inside one), suppresses the browser's native drag
 * for the presses it accepts, and derives the `touch-action` styles that stop
 * native scrolling on the surfaces a drag can start from.
 */
export interface PointerHandleGuard {
  /** `'none'` while the host should suppress native touch scrolling, else `null`. */
  readonly touchAction: Signal<'none' | null>;
  /** `'none'` while a registered handle should suppress native touch scrolling, else `null`. */
  readonly handleTouchAction: Signal<'none' | null>;
  /** Register a `[forDragHandle]` element. */
  register(el: HTMLElement): void;
  /** Unregister a previously registered handle element. */
  unregister(el: HTMLElement): void;
  /** Register the host of a draggable nested inside this one; presses inside it are its own. */
  registerNested(el: HTMLElement): void;
  /** Unregister a previously registered nested draggable host. */
  unregisterNested(el: HTMLElement): void;
  /** Whether `node` belongs to this draggable rather than to a draggable nested inside it. */
  owns(node: Node): boolean;
  /** Whether a `pointerdown` event is allowed to start a drag. */
  canStart(event: PointerEvent): boolean;
  /** Cancel a `dragstart` raised from a press this guard would accept. */
  suppressNativeDrag(event: Event): void;
}

/**
 * Builds a {@link PointerHandleGuard}. Call from a directive's injection
 * context (field initializer or constructor) so the `computed`s register
 * correctly.
 *
 * @param disabled Signal reporting whether dragging is currently disabled.
 */
export function createPointerHandleGuard(disabled: Signal<boolean>): PointerHandleGuard {
  const handles = signal<readonly HTMLElement[]>([]);
  const nested = signal<readonly HTMLElement[]>([]);

  const owns = (node: Node): boolean => !nested().some((host) => host.contains(node));

  const accepts = (eventTarget: EventTarget | null): boolean => {
    const target = eventTarget as Node | null;
    if (disabled() || (target !== null && !owns(target))) {
      return false;
    }
    const registered = handles();
    return (
      registered.length === 0 ||
      (target !== null && registered.some((handle) => handle.contains(target)))
    );
  };

  return {
    touchAction: computed<'none' | null>(() =>
      !disabled() && handles().length === 0 ? 'none' : null,
    ),
    handleTouchAction: computed<'none' | null>(() => (disabled() ? null : 'none')),
    register(el: HTMLElement): void {
      handles.update((list) => [...list, el]);
    },
    unregister(el: HTMLElement): void {
      handles.update((list) => list.filter((handle) => handle !== el));
    },
    registerNested(el: HTMLElement): void {
      nested.update((list) => [...list, el]);
    },
    unregisterNested(el: HTMLElement): void {
      nested.update((list) => list.filter((host) => host !== el));
    },
    owns,
    canStart(event: PointerEvent): boolean {
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return false;
      }
      return accepts(event.target);
    },
    suppressNativeDrag(event: Event): void {
      if (accepts(event.target)) {
        event.preventDefault();
      }
    },
  };
}

/**
 * Registers `host` with the nearest enclosing `[forDraggable]` / `[forFreeDrag]`, so a press
 * inside it never starts a drag of the one around it. Call from the nested directive's
 * injection context.
 */
export function registerWithEnclosingDraggable(host: HTMLElement, piece: string): void {
  const provided = inject(FOR_DRAGGABLE_CONTEXT, { optional: true, skipSelf: true });
  if (provided) {
    const enclosing = asDraggableContext(provided, piece);
    registerHandle(
      host,
      (el) => enclosing.registerNestedDraggable(el),
      (el) => enclosing.unregisterNestedDraggable(el),
    );
  }
}
