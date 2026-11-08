/**
 * Presses `target` with the primary mouse button, raises the cancelable `dragstart` the browser
 * fires for an image, a link or selected text under that press, releases the press, and returns
 * the `dragstart`. A pointer drag surface that accepted the press has cancelled it, so its
 * `defaultPrevented` reads `true`.
 *
 * `src/lib/drag-press-defaults-adopters.spec.ts` requires one call per pointer session adopter, in
 * the spec it names for that adopter.
 */
export function dragStartFromPress(target: Element, x = 10, y = 10): Event {
  const init: PointerEventInit = {
    clientX: x,
    clientY: y,
    button: 0,
    buttons: 1,
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
    bubbles: true,
    cancelable: true,
    composed: true,
  };
  target.dispatchEvent(new PointerEvent('pointerdown', init));
  const dragStart = new Event('dragstart', { bubbles: true, cancelable: true, composed: true });
  target.dispatchEvent(dragStart);
  target.ownerDocument.dispatchEvent(new PointerEvent('pointerup', { ...init, buttons: 0 }));
  return dragStart;
}
