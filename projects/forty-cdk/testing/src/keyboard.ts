/**
 * Options accepted by {@link pressKey}: any `KeyboardEventInit` member except `key`, plus the
 * event type. `type` defaults to `'keydown'`, `bubbles`, `cancelable` and `composed` to `true`.
 */
export interface PressKeyOptions extends Omit<KeyboardEventInit, 'key'> {
  /** The event to dispatch. Defaults to `'keydown'`. */
  type?: 'keydown' | 'keyup';
}

/**
 * Dispatches a `KeyboardEvent` for `key` on `target` and returns it, so a spec can assert on
 * `event.defaultPrevented` once the handlers have run.
 *
 * The event bubbles, is cancelable and is composed by default, as a key press is in a browser. A
 * bare `new KeyboardEvent('keydown', { key })` is none of these: it never reaches a listener on an
 * ancestor or on the document, and a handler's `preventDefault()` on it does nothing, so
 * `defaultPrevented` reads `false` even when the primitive claimed the key. Composition is what
 * carries a key pressed inside a shadow root out to the document listeners an overlay dismisses on.
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
  const { type = 'keydown', bubbles = true, cancelable = true, composed = true, ...rest } = options;
  const event = new KeyboardEvent(type, { key, bubbles, cancelable, composed, ...rest });
  target.dispatchEvent(event);
  return event;
}
