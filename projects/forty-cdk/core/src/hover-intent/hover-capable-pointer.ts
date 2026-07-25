/**
 * Whether a pointer event comes from a device that hovers.
 *
 * Hover-driven menu behaviour — sub-trigger hover-open / hover-close,
 * hover-follows-pointer highlighting, the submenu safe triangle, the menubar's
 * hover keepalive — is a mouse affordance: touch and pen are both reported as
 * non-hovering here, so on those pointer types the same primitives are driven
 * by tap (the native click) instead. The empty `pointerType` counts as
 * hover-capable: a synthetic `PointerEvent` leaves it `''` (browsers only
 * populate it for real input), and a synthetic hover must behave like a mouse
 * hover rather than being dropped.
 *
 * @param event The pointer event to classify — only `pointerType` is read.
 * @returns `true` for `'mouse'` and for the empty synthetic `pointerType`,
 *   `false` for `'touch'` / `'pen'` / any other value.
 */
export function isHoverCapablePointer(event: Pick<PointerEvent, 'pointerType'>): boolean {
  return event.pointerType === '' || event.pointerType === 'mouse';
}
