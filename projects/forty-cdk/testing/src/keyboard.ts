/**
 * Options accepted by {@link pressKey}: any `KeyboardEventInit` member except `key`, plus the
 * event type. `type` defaults to `'keydown'`, `bubbles` and `cancelable` to `true`.
 */
export interface PressKeyOptions extends Omit<KeyboardEventInit, 'key'> {
  /** The event to dispatch. Defaults to `'keydown'`. */
  type?: 'keydown' | 'keyup';
}

/**
 * Dispatches a `KeyboardEvent` for `key` on `target` and returns it, so a spec can assert on
 * `event.defaultPrevented` once the handlers have run.
 *
 * The event bubbles and is cancelable by default, as a key press is in a browser. A bare
 * `new KeyboardEvent('keydown', { key })` is neither: it never reaches a listener on an ancestor
 * or on the document, and a handler's `preventDefault()` on it does nothing, so
 * `defaultPrevented` reads `false` even when the primitive claimed the key.
 *
 * ```ts
 * pressKey(trigger, 'ArrowDown');
 * const event = pressKey(trigger, 'Enter', { shiftKey: true });
 * expect(event.defaultPrevented).toBe(true);
 * ```
 */
export function pressKey(
  target: EventTarget,
  key: string,
  options: PressKeyOptions = {},
): KeyboardEvent {
  const { type = 'keydown', bubbles = true, cancelable = true, ...rest } = options;
  const event = new KeyboardEvent(type, { key, bubbles, cancelable, ...rest });
  target.dispatchEvent(event);
  return event;
}
