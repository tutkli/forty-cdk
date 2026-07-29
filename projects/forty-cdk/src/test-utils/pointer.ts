/**
 * Canonical way for a spec to fabricate the `PointerEvent`s that drive a
 * pointer session (drag-reorder, column resize, pane resize, thumb drag).
 *
 * Three byte-identical local builders used to exist in the suite, each
 * casting `new Event(type) as PointerEvent` and hand-patching `clientX`,
 * `clientY`, `button` and `pointerId` with `Object.defineProperty`. On such a
 * cast every *other* `PointerEvent` member reads back `undefined` rather than
 * its spec default — `buttons` is `undefined` instead of `0`, `isPrimary`
 * instead of `false`, `pointerType` instead of `''`. That is not
 * hypothetical: `swipe-dismiss` already gates on `event.buttons === 0` to
 * detect a released button, so a gate like it added to a resize or reorder
 * path would compare against `undefined` under test and silently take the
 * wrong branch while behaving correctly in a browser.
 *
 * The real constructor is available in the jsdom this repo runs and honours
 * every member these specs need through its init dict, so nothing has to be
 * redefined.
 *
 * Internal to the test suite — never re-exported from `public-api.ts`.
 */

/**
 * Build a `PointerEvent` of `type` for the caller to dispatch.
 *
 * Unlike `pressKey` this does not dispatch: a pointer session listens on the
 * host for `pointerdown` and on the document for `pointermove` / `pointerup`,
 * so the target differs per event and belongs to the caller.
 *
 * Defaults are `bubbles: true`, `cancelable: true` and `pointerId: 1` —
 * bubbling and cancelable match how a real press reaches the document-level
 * listeners a session installs, and `pointerId: 1` is what a mouse yields in a
 * browser. Every other member takes its spec default from the constructor
 * (`buttons: 0`, `isPrimary: false`, `pointerType: ''`); a spec driving a gate
 * that reads them — `swipe-dismiss`'s released-button branch, say — passes the
 * value it needs explicitly (`{ buttons: 1 }`).
 *
 * Example:
 *
 *   handle.dispatchEvent(pointerEvent('pointerdown', { clientX: 100 }));
 *   document.dispatchEvent(pointerEvent('pointermove', { clientX: 140 }));
 *   document.dispatchEvent(pointerEvent('pointerup', { clientX: 140 }));
 *
 * Internal to the test suite — never re-exported from `public-api.ts`.
 */
export function pointerEvent(type: string, init: PointerEventInit = {}): PointerEvent {
  return new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, ...init });
}
