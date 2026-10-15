import { computed, DestroyRef, effect, ElementRef, inject, type Signal } from '@angular/core';

import { composeIds, contributeDescribedBy } from './described-by-owner';
import { claimReplacedAttribute } from './replaced-attribute-owner';

/**
 * Writes the `aria-labelledby` a piece exposes onto its host and returns it: the host element's
 * pre-existing **static** `aria-labelledby` when present, else the library's own generated
 * fallback (a trigger / heading / label id). The host must not also bind the attribute.
 *
 * A name has one owner, so a value the consumer wrote in the template always wins over the
 * fallback. A surface with no consumer value keeps its fallback verbatim.
 *
 * Only **static** values are adopted: a `[attr.aria-labelledby]="expr"` binding evaluates after
 * directive construction, so it is invisible here and still fights the library's write. This
 * mirrors the static-only boundary of `resolveHostId` / `adoptHostId`.
 *
 * Must be invoked in an injection context.
 *
 * @param fallback The library-generated value, evaluated only when the host
 *   carries no static `aria-labelledby`.
 */
export function hostLabelledBy(fallback: () => string | null): Signal<string | null> {
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const claim = claimReplacedAttribute(host, 'aria-labelledby', fallback);
  effect(() => claim.write());
  inject(DestroyRef).onDestroy(() => claim.release());
  return computed(() => claim.consumer ?? fallback());
}

/**
 * Resolves the `aria-label` a piece should expose: the host element's
 * pre-existing **static** `aria-label` when present, else the library's own
 * value (an `ariaLabel` input, a scope default, or a computed name).
 *
 * Reuses {@link hostLabelledBy}'s replace semantics. Adoption matters more here: most of these host
 * bindings resolve to `null` when the library has no name of its own, and a `null` binding calls
 * `removeAttribute`, so without it a consumer's `aria-label` is deleted and the widget is left with
 * no accessible name at all.
 *
 * A piece emitting both channels must gate its {@link hostLabelledBy} fallback on this signal
 * rather than on the raw input, since `aria-labelledby` outranks `aria-label` in ARIA and a
 * generated fallback would otherwise beat the consumer's adopted name.
 *
 * Only **static** values are adopted; see {@link hostLabelledBy} for the boundary.
 *
 * Must be invoked in an injection context.
 *
 * @param fallback The library's own accessible name, evaluated only when the
 *   host carries no static `aria-label`.
 */
export function hostAriaLabel(fallback: () => string | null): Signal<string | null> {
  const consumer = staticHostAttribute('aria-label');
  return computed(() => consumer ?? fallback());
}

/**
 * Writes the library's own description ids into the host's `aria-describedby`,
 * **composed** after the host's pre-existing **static** value, consumer ids
 * first, and returns that composition. The host must not also bind the
 * attribute.
 *
 * Descriptions are additive — assistive tech reads every referenced element — so unlike
 * {@link hostLabelledBy} this composes instead of replacing, and a consumer's
 * `aria-describedby="hint"` keeps announcing alongside a registered description piece.
 * Ids another library piece contributes to the same element (the surrounding
 * `[forField]` of a control that is also a tooltip trigger) are kept beside these.
 *
 * Only **static** values are adopted; see {@link hostLabelledBy} for the boundary.
 *
 * Must be invoked in an injection context.
 *
 * @param fallback The library-owned description ids, composed after the
 *   consumer's own.
 */
export function hostDescribedBy(fallback: () => string | null): Signal<string | null> {
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const contribution = contributeDescribedBy(host, fallback);
  effect(() => contribution.write());
  inject(DestroyRef).onDestroy(() => contribution.release());
  return computed(() => composeIds(contribution.consumer, fallback()));
}

function staticHostAttribute(name: string): string | null {
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  return host.getAttribute(name) || null;
}
