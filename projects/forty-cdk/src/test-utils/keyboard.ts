/**
 * Options accepted by {@link pressKey}. Mirrors the relevant subset of
 * `KeyboardEventInit` plus a `type` knob for keyup vs keydown.
 *
 * Defaults: `type: 'keydown'`, `bubbles: true`, `cancelable: true`. These
 * defaults match how DOM events propagate in real browsers and are what
 * every dismissible-layer / roving-tabindex / typeahead handler expects.
 */
export interface PressKeyOptions extends Omit<KeyboardEventInit, 'key'> {
  type?: 'keydown' | 'keyup';
}

/**
 * Dispatch a synthetic `KeyboardEvent` on `target`.
 *
 * Returns the event so callers can assert on `event.defaultPrevented`
 * after the handler runs.
 *
 * Example:
 *
 *   pressKey(input, 'ArrowDown');
 *   pressKey(document, 'Escape');
 *   const ev = pressKey(trigger, 'Enter', { shiftKey: true });
 *   expect(ev.defaultPrevented).toBe(true);
 *
 * Internal to the test suite — never re-exported from `public-api.ts`.
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
