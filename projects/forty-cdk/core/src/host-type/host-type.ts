import { ElementRef, inject, signal, type Signal } from '@angular/core';

/**
 * Resolves the `type` attribute a piece must emit to force `type="button"`:
 * `'button'` on a native `<button>` host, `null` on any other element.
 *
 * The seam every piece that wants submit protection host-binds as
 * `'[attr.type]': 'buttonType()'`. It replaces the **static** host attribute
 * `type: 'button'`, which was wrong in both directions:
 *
 * - A static host attribute is stamped on whatever element the consumer picked,
 *   and `type` is not a valid attribute of `<div>` / `<span>` — the markup was
 *   invalid and the attribute inert. Returning `null` off a native button emits
 *   nothing at all.
 * - Angular lets a consumer's **static** template attribute win over a
 *   directive's static host attribute, so `<button forCheckbox type="submit">`
 *   kept `type="submit"` and submitted its surrounding `<form>` on every click.
 *   A host **binding** always wins, which is what makes the submit protection
 *   the pieces document actually exist.
 *
 * The consumer's own `type` is therefore **not** adopted — this is the deliberate
 * inverse of the `hostId` / `hostAriaLabel` / `hostLabelledBy` seams, where a
 * value the consumer wrote in the template replaces the library's. A piece that
 * forces `type="button"` treats a consumer `type="submit"` as an authoring error
 * rather than an override: the whole point is that activating the control never
 * submits a form. `[forButton]` is the one piece that legitimately preserves the
 * consumer's `type` (a `[forButton]` on a real submit button is valid usage), and
 * it resolves that with its own `resolvedType` rather than through this helper.
 *
 * The host's tag name cannot change after construction, so the returned signal is
 * constant — it exists to match the shape of the surrounding host seams and to be
 * readable from a host binding.
 *
 * Must be invoked in an injection context — internally injects {@link ElementRef}.
 */
export function hostButtonType(): Signal<string | null> {
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  return signal(host.tagName === 'BUTTON' ? 'button' : null).asReadonly();
}
