/**
 * Canonical way for a spec to drive the dismissal plumbing's
 * "something happened outside the layer" paths.
 *
 * The dismissible stack decides what is inside and what is outside by
 * reading the event's `composedPath()` (falling back to `target`) from a
 * listener installed on `document`. Two fabrication shapes used to exist in
 * the suite — one that redefined only `target`, one that also forged a
 * single-entry `composedPath` — and both dispatched the event **on
 * `document`** rather than on the node they claimed it came from. That
 * makes the assertions blind to exactly the regressions the plumbing can
 * suffer: an event dispatched on `document` never bubbles (it is already at
 * the root), its real `eventPhase` is `AT_TARGET` rather than
 * `BUBBLING_PHASE`, and its genuine `composedPath()` is `[document,
 * window]` — so a listener that switched to capture phase, moved to a
 * different node, or started reading ancestors out of the path would keep
 * every test green.
 *
 * These helpers dispatch a **real** event on a **real** element attached to
 * the document, so `target`, `eventPhase`, and `composedPath()` are all
 * produced by the DOM. Nothing is redefined.
 *
 * Internal to the test suite — never re-exported from `public-api.ts`.
 */

/**
 * Dispatch a genuine bubbling `pointerdown` on `target`, the way a real
 * pointer press outside an open overlay reaches the dismissal listener.
 */
export function pointerDownOn(target: Element): void {
  target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
}

/**
 * Dispatch a genuine bubbling `focusin` on `target`, the way focus landing
 * outside an open overlay reaches the dismissal listener.
 */
export function focusInOn(target: Element): void {
  target.dispatchEvent(new FocusEvent('focusin', { bubbles: true, cancelable: true }));
}
