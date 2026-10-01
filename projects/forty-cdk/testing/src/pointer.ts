/**
 * Builds a `PointerEvent` of `type` for the caller to dispatch.
 *
 * It bubbles, is cancelable and carries `pointerId: 1`, as a mouse press does in a browser, so it
 * reaches the document-level listeners a drag or resize session installs. Every other member keeps
 * its spec default (`buttons: 0`, `isPrimary: false`, `pointerType: ''`); pass the ones a handler
 * reads. A `new Event(type)` cast to `PointerEvent` reads those members back as `undefined`
 * instead, so a handler gating on `event.buttons === 0` takes the wrong branch under test.
 *
 * It does not dispatch: a pointer session listens on its handle for `pointerdown` and on the
 * document for `pointermove` / `pointerup`, so the target is the caller's.
 *
 * ```ts
 * handle.dispatchEvent(pointerEvent('pointerdown', { clientX: 100, buttons: 1 }));
 * document.dispatchEvent(pointerEvent('pointermove', { clientX: 140, buttons: 1 }));
 * document.dispatchEvent(pointerEvent('pointerup', { clientX: 140 }));
 * ```
 */
export function pointerEvent(type: string, init: PointerEventInit = {}): PointerEvent {
  return new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, ...init });
}

const MOUSE_FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]';

/**
 * Presses `target` with the primary mouse button: `pointerdown`, `mousedown`, the focus move a
 * browser makes, `pointerup`, `mouseup`, then `click`.
 *
 * `target.click()` dispatches only the `click`. A dismissible overlay decides an outside press on
 * `pointerdown`, so a spec clicking outside an open popover with `.click()` never closes it, and
 * one clicking inside never proves the press was recognised as inside. Focus does not move either.
 *
 * The focus move follows the browser: the nearest focusable ancestor of `target` takes focus, or
 * the focused element blurs when there is none, and nothing moves when a `mousedown` listener
 * called `preventDefault()`.
 */
export function pressWithMouse(target: HTMLElement): void {
  const press = { button: 0, buttons: 1, isPrimary: true, pointerType: 'mouse' };
  target.dispatchEvent(pointerEvent('pointerdown', press));
  const mousedown = new MouseEvent('mousedown', { bubbles: true, cancelable: true, buttons: 1 });
  target.dispatchEvent(mousedown);
  if (!mousedown.defaultPrevented) {
    const focusable = target.closest<HTMLElement>(MOUSE_FOCUSABLE);
    if (focusable) {
      focusable.focus();
    } else {
      (target.ownerDocument.activeElement as HTMLElement | null)?.blur();
    }
  }
  target.dispatchEvent(pointerEvent('pointerup', { ...press, buttons: 0 }));
  target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
  target.click();
}
