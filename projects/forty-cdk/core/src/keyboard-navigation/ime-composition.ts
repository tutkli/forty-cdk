/**
 * Whether `event` belongs to an IME composition rather than to the page.
 *
 * True while a composition is in progress (`isComposing`), and for the keydown an engine reports
 * with `keyCode` 229 — WebKit's keydown for the key that commits or cancels a composition arrives
 * after `compositionend` with `isComposing` already `false`. An Escape that cancels a CJK
 * conversion is one of these, so a handler that closes or clears on Escape returns early on it and
 * leaves the key to the IME.
 */
export function isImeComposing(event: KeyboardEvent): boolean {
  return event.isComposing || event.keyCode === 229;
}
