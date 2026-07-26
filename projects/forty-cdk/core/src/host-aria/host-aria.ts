import { computed, ElementRef, inject, type Signal } from '@angular/core';

/**
 * Resolves the `aria-labelledby` a piece should expose: the host element's
 * pre-existing **static** `aria-labelledby` when present, else the library's
 * own generated fallback (a trigger / heading / label id).
 *
 * The consumer's accessible name is the one assistive tech should announce, so
 * a value they wrote in the template always wins over the fallback — the
 * generalisation of the static-`id` adoption contract to the naming attribute.
 * A surface with no consumer value keeps its fallback verbatim, so ordinary
 * usage is unaffected.
 *
 * Only **static** values are adopted: a consumer `[attr.aria-labelledby]="expr"`
 * binding evaluates after directive construction, so it is invisible here and
 * still fights the directive's own host binding (unpredictable last-writer).
 * This mirrors the static-only boundary of `resolveHostId` / `adoptHostId`.
 *
 * Must be invoked in an injection context — internally injects
 * {@link ElementRef}.
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
 * Reuses {@link hostLabelledBy}'s **replace** semantics — a name has one owner,
 * so composing two of them is meaningless and the consumer's is the one
 * assistive tech should announce. This matters more here than for
 * `aria-labelledby`: most of these host bindings resolve to `null` when the
 * library has no name of its own, and a `null` `[attr.x]` binding calls
 * `removeAttribute` on the first change-detection pass — so without adoption a
 * consumer's `aria-label="Toppings"` is deleted and the widget ends up with no
 * accessible name at all.
 *
 * When a piece emits both channels, keep the fallback of its
 * {@link hostLabelledBy} gated on this signal rather than on the raw input:
 * `aria-labelledby` wins over `aria-label` in ARIA, so a library-generated
 * `aria-labelledby` fallback would silently outrank the consumer's adopted
 * name.
 *
 * Only **static** values are adopted; see {@link hostLabelledBy} for the
 * static-only boundary.
 *
 * Must be invoked in an injection context — internally injects
 * {@link ElementRef}.
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
 * Descriptions are additive — assistive tech reads every referenced element —
 * so unlike {@link hostLabelledBy} this composes instead of replacing: a
 * consumer `aria-describedby="hint"` keeps announcing alongside a registered
 * `[for<Primitive>Description]`. Same composition the field wiring applies to
 * the controls it targets.
 *
 * Only **static** values are adopted; see {@link hostLabelledBy} for the
 * static-only boundary.
 *
 * Must be invoked in an injection context — internally injects
 * {@link ElementRef}.
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
