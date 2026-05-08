import type { OutputEmitterRef } from '@angular/core';

/**
 * An event a consumer can veto by calling `preventDefault()`. The directive
 * inspects `defaultPrevented` after emitting and skips its default action
 * (close, focus move, etc.) when set.
 *
 * Replaces the prior pattern of passing a real DOM `CustomEvent`, which
 * was a Radix transplant: Angular `output()` is a synchronous in-process
 * emitter — events don't bubble, don't propagate, and have no `target` /
 * `currentTarget`. `CustomEvent` cost an allocation per emit and gave
 * consumers a misleading "looks like a DOM event" surface.
 */
export interface VetoableEvent {
  /** Mark this event as vetoed; the directive will skip its default action. */
  preventDefault(): void;
  /** True after `preventDefault()` has been called. */
  readonly defaultPrevented: boolean;
}

/**
 * Vetoable event that also carries the original DOM event that triggered
 * it. Used for outputs whose semantic action is anchored to a real
 * keyboard / pointer / focus event: `(escapeKeyDown)` (`KeyboardEvent`),
 * `(pointerDownOutside)` (`PointerEvent`), `(focusOutside)` (`FocusEvent`),
 * `(interactOutside)` (`PointerEvent | FocusEvent`).
 */
export interface VetoableNativeEvent<E extends Event> extends VetoableEvent {
  /** Original DOM event the directive received. */
  readonly event: E;
}

/**
 * Builds a `VetoableEvent` (no native payload). The returned object's
 * `defaultPrevented` flips to `true` once any handler calls `preventDefault()`.
 */
export function createVetoableEvent(): VetoableEvent {
  let prevented = false;
  return {
    preventDefault() {
      prevented = true;
    },
    get defaultPrevented() {
      return prevented;
    },
  };
}

/**
 * Builds a `VetoableNativeEvent` wrapping `event`. Useful when the same
 * physical interaction must be observable through more than one output —
 * e.g. a pointer-down-outside emits the same wrapper through
 * `(pointerDownOutside)` and `(interactOutside)` so a `preventDefault()`
 * in either handler vetoes the close.
 */
export function createVetoableNativeEvent<E extends Event>(event: E): VetoableNativeEvent<E> {
  let prevented = false;
  return {
    event,
    preventDefault() {
      prevented = true;
    },
    get defaultPrevented() {
      return prevented;
    },
  };
}

/**
 * Builds a fresh `VetoableEvent`, emits it through `emitter`, and returns
 * whether the consumer vetoed. Use for one-shot outputs whose veto state
 * doesn't need to be observed by sibling outputs (e.g. `(autoFocusOnOpen)`,
 * a menu item's `(select)`).
 */
export function emitVetoableEvent(emitter: OutputEmitterRef<VetoableEvent>): boolean {
  const veto = createVetoableEvent();
  emitter.emit(veto);
  return veto.defaultPrevented;
}

/**
 * Builds a `VetoableNativeEvent` wrapping `event`, emits it through
 * `emitter`, and returns whether the consumer vetoed. Use for outputs
 * whose veto is scoped to a single emit (e.g. `(escapeKeyDown)`).
 */
export function emitVetoableNativeEvent<E extends Event>(
  emitter: OutputEmitterRef<VetoableNativeEvent<E>>,
  event: E,
): boolean {
  const veto = createVetoableNativeEvent(event);
  emitter.emit(veto);
  return veto.defaultPrevented;
}
