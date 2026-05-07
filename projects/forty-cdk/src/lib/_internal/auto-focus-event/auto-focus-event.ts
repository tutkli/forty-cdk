/**
 * Helpers to construct and emit the cancelable `CustomEvent`s that overlay
 * primitives (Dialog, Popover, Menu, Select) fire before / after their
 * automatic focus moves.
 *
 * Consumers veto the focus move by calling `event.preventDefault()` from
 * their `(autoFocusOnOpen)` / `(autoFocusOnClose)` listener; the directive
 * inspects `event.defaultPrevented` and skips the imperative `.focus()`.
 *
 * Centralized here so the event `type` strings stay consistent across
 * primitives and the construction stays a single line at the call site.
 */

import type { OutputEmitterRef } from '@angular/core';

/**
 * Constructs a cancelable `CustomEvent` of type `'autoFocusOnOpen'`,
 * emits it through `emitter`, and returns whether the consumer vetoed
 * the upcoming focus move via `event.preventDefault()`.
 */
export function emitAutoFocusOnOpen(emitter: OutputEmitterRef<CustomEvent>): boolean {
  const event = new CustomEvent('autoFocusOnOpen', { cancelable: true, bubbles: false });
  emitter.emit(event);
  return event.defaultPrevented;
}

/**
 * Constructs a cancelable `CustomEvent` of type `'autoFocusOnClose'`,
 * emits it through `emitter`, and returns whether the consumer vetoed
 * the upcoming return-focus via `event.preventDefault()`.
 */
export function emitAutoFocusOnClose(emitter: OutputEmitterRef<CustomEvent>): boolean {
  const event = new CustomEvent('autoFocusOnClose', { cancelable: true, bubbles: false });
  emitter.emit(event);
  return event.defaultPrevented;
}
