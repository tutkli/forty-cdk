import { ElementRef, inject, signal, type Signal } from '@angular/core';

/**
 * Resolves the `type` attribute a piece must emit to force `type="button"`:
 * `'button'` on a native `<button>` host, `null` on any other element.
 *
 * Pieces that want submit protection host-bind it as
 * `'[attr.type]': 'buttonType()'`. A host binding always beats a consumer's
 * static template attribute, so `<button forCheckbox type="submit">` still emits
 * `type="button"`.
 *
 * The consumer's own `type` is therefore **not** adopted — the inverse of the
 * `hostId` / `hostAriaLabel` / `hostLabelledBy` seams. A piece that forces
 * `type="button"` treats a consumer `type="submit"` as an authoring error rather
 * than an override, so activating the control never submits a form.
 * `[forButton]` is the one piece that preserves the consumer's `type` (a
 * `[forButton]` on a real submit button is valid usage) and resolves it through
 * its own `resolvedType` instead of this helper.
 *
 * The host's tag name cannot change after construction, so the returned signal is
 * constant. Must be invoked in an injection context.
 */
export function hostButtonType(): Signal<string | null> {
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  return signal(host.tagName === 'BUTTON' ? 'button' : null).asReadonly();
}
