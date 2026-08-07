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
 * This is the stricter of the library's two hover vocabularies — see
 * {@link isNonTouchPointer} for the pen-inclusive twin used by the tooltip /
 * hover-card family. The two are deliberately kept apart: a pen genuinely
 * hovers a tooltip, and genuinely should not hover-open a submenu.
 *
 * @param event The pointer event to classify — only `pointerType` is read.
 * @returns `true` for `'mouse'` and for the empty synthetic `pointerType`,
 *   `false` for `'touch'` / `'pen'` / any other value.
 */
export function isHoverCapablePointer(event: Pick<PointerEvent, 'pointerType'>): boolean {
  return event.pointerType === '' || event.pointerType === 'mouse';
}

/**
 * Whether a pointer event comes from a device whose hover is meaningful for
 * descriptive, supplementary content.
 *
 * Tooltip / hover-card triggers and the `injectHovered` hover state treat a pen
 * as a hovering device — a stylus reports `pointerover` / `pointerenter` while
 * it is detected above the digitizer, so a pen user gets the same preview a
 * mouse user does. Only `'touch'` is rejected: a tap emits an emulated
 * `pointerenter` that would otherwise leave the element stuck in a hovered
 * state after the finger lifts, and the APG flags hover-revealed content as
 * problematic on touch (no hover, no obvious dismiss). The empty synthetic
 * `pointerType` passes, matching {@link isHoverCapablePointer}.
 *
 * This is the pen-inclusive twin of {@link isHoverCapablePointer}, which is
 * mouse-only because the menu family drives submenu hover-open by tap on both
 * touch and pen. Pick the predicate that matches the family you are writing
 * for; do not fold one onto the other.
 *
 * Neither predicate covers the non-hover `pointerType` checks in the library —
 * the twelve primary-button guards (`pointerType === 'mouse' && button !== 0`
 * in `pressed`, the drag-session handle guard, swipe-dismiss, listbox reorder,
 * virtual reorder, table row reorder, tree node drag, the pane resizer, the
 * table column resizer, the slider, the scroll-area thumb and the scroll-area
 * track press) and the context-menu long-press gate
 * (`pointerType !== 'touch'`). Those classify a press, not a hover, so they
 * stay inline by design.
 *
 * @param event The pointer event to classify — only `pointerType` is read.
 * @returns `false` for `'touch'`, `true` for every other `pointerType`
 *   (`'mouse'`, `'pen'`, the empty synthetic value, or a future device type).
 */
export function isNonTouchPointer(event: Pick<PointerEvent, 'pointerType'>): boolean {
  return event.pointerType !== 'touch';
}
