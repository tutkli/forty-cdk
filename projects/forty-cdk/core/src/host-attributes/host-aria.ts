import { computed, ElementRef, inject, type Signal } from '@angular/core';

/**
 * Resolves the `aria-labelledby` a piece should expose: the host element's
 * pre-existing **static** `aria-labelledby` when present, else the library's
 * own generated fallback (a trigger / heading / label id).
 *
 * A name has one owner, so a value the consumer wrote in the template always wins over the
 * fallback. A surface with no consumer value keeps its fallback verbatim.
 *
 * Only **static** values are adopted: a `[attr.aria-labelledby]="expr"` binding evaluates after
 * directive construction, so it is invisible here and still fights the host binding. This mirrors
 * the static-only boundary of `resolveHostId` / `adoptHostId`.
 *
 * Must be invoked in an injection context.
 *
 * @param fallback The library-generated value, evaluated only when the host
 *   carries no static `aria-labelledby`.
 */
export function hostLabelledBy(fallback: () => string | null): Signal<string | null> {
  const consumer = staticHostAttribute('aria-labelledby');
  return computed(() => consumer ?? fallback());
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
 * Resolves the `aria-describedby` a piece should expose: the host element's
 * pre-existing **static** `aria-describedby` **composed** with the library's
 * own description ids, consumer ids first.
 *
 * Descriptions are additive — assistive tech reads every referenced element — so unlike
 * {@link hostLabelledBy} this composes instead of replacing, and a consumer's
 * `aria-describedby="hint"` keeps announcing alongside a registered description piece.
 *
 * Only **static** values are adopted; see {@link hostLabelledBy} for the boundary.
 *
 * Must be invoked in an injection context.
 *
 * @param fallback The library-owned description ids, composed after the
 *   consumer's own.
 */
export function hostDescribedBy(fallback: () => string | null): Signal<string | null> {
  const consumer = staticHostAttribute('aria-describedby');
  return computed(() => composeIds(consumer, fallback()));
}

/**
 * Composes a consumer's own id-reference list with the library's own ids: the
 * consumer's ids first, then any library id not already present. Returns `null`
 * when both sides are empty so the caller removes the attribute rather than
 * setting it to `""`.
 *
 * @param consumer The consumer-authored value, captured before the library
 *   touched the element.
 * @param libraryIds The library-owned ids to append.
 */
export function composeIds(consumer: string | null, libraryIds: string | null): string | null {
  if (!consumer) {
    return libraryIds;
  }
  if (!libraryIds) {
    return consumer;
  }
  const seen = new Set(consumer.split(/\s+/).filter(Boolean));
  const extra = libraryIds.split(/\s+/).filter((id) => id && !seen.has(id));
  return extra.length > 0 ? `${consumer} ${extra.join(' ')}` : consumer;
}

function staticHostAttribute(name: string): string | null {
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  return host.getAttribute(name) || null;
}
