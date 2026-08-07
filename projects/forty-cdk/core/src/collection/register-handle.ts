import { afterNextRender, DestroyRef, ElementRef, inject } from '@angular/core';

import { resolveHostId } from '../host-attributes/host-id';

/**
 * Scheduling for the `register` call.
 *
 * - `'sync'` (default) — register inside the directive's constructor, at
 *   directive-construction time. Matches what most callsites do today.
 * - `'afterNextRender'` — defer the `register` call to `afterNextRender`, so the parent's lookups
 *   can read the handle's mandatory signals without hitting an unbound `input.required`.
 *
 * The hook never fires in a server render, so a deferred registration is invisible to SSR. Prefer
 * `'sync'` with `unsetInput` seeding and an `isUnset`-guarded lookup whenever the registration
 * drives markup the pre-hydration DOM needs; `'afterNextRender'` is only safe for a piece that
 * emits no registration-derived markup.
 *
 * `unregister` always runs eagerly via `DestroyRef.onDestroy`, so destroy-before-register is a safe
 * no-op as long as it is reference-based.
 */
export type RegistrationScheduling = 'sync' | 'afterNextRender';

/**
 * Registers `target` with an owning parent on construction and unregisters it on destroy.
 *
 * Works for any target shape — object handles, raw elements, id strings — since it only hands the
 * value back to the supplied callbacks.
 *
 * Must be invoked in an injection context.
 *
 * @param target The value to register. Passed verbatim to both callbacks.
 * @param register Registers the target with the owning parent.
 * @param unregister Called from `DestroyRef.onDestroy`. Must be reference-based and tolerant of
 *   running before `register` ever did, which happens when a deferred registration is destroyed
 *   before its render fires.
 * @param scheduling When the `register` callback runs. Defaults to `'sync'`.
 */
export function registerHandle<T>(
  target: T,
  register: (target: T) => void,
  unregister: (target: T) => void,
  scheduling: RegistrationScheduling = 'sync',
): void {
  if (scheduling === 'afterNextRender') {
    afterNextRender(() => register(target));
  } else {
    register(target);
  }
  inject(DestroyRef).onDestroy(() => unregister(target));
}

/**
 * Owner contract for {@link registerA11yName}. The owner is typically the
 * primitive's context object (e.g. `injectDialogContext('ForDialogTitle')`)
 * or the parent directive instance — duck-typed so cross-primitive code
 * reuse doesn't force a shared base type.
 */
export interface A11yLabelOwner {
  registerLabel(id: string): void;
  unregisterLabel(id: string): void;
}

/**
 * Owner contract for {@link registerA11yDescription}. See
 * {@link A11yLabelOwner} for the rationale.
 */
export interface A11yDescriptionOwner {
  registerDescription(id: string): void;
  unregisterDescription(id: string): void;
}

/**
 * Resolves a stable `id` for the host element and registers it with the owner's `aria-labelledby`
 * collection. Returns a plain `string` — the id never changes — for host-binding as `'[id]': 'id'`.
 *
 * A consumer-set static `id` is adopted rather than clobbered; see {@link resolveHostId} for the
 * static-only boundary. The host element is read optionally, so the helper falls back to a
 * generated id when invoked outside a directive host context.
 *
 * Must be invoked in an injection context.
 */
export function registerA11yName(owner: A11yLabelOwner, prefix: string): string {
  const host =
    inject<ElementRef<HTMLElement>>(ElementRef, { optional: true })?.nativeElement ?? null;
  const id = resolveHostId(host, prefix);
  registerHandle(
    id,
    (myId) => owner.registerLabel(myId),
    (myId) => owner.unregisterLabel(myId),
  );
  return id;
}

/**
 * Counterpart to {@link registerA11yName} for `aria-describedby`. See that
 * function for the rationale and usage — including the consumer-set static
 * `id` adoption.
 */
export function registerA11yDescription(owner: A11yDescriptionOwner, prefix: string): string {
  const host =
    inject<ElementRef<HTMLElement>>(ElementRef, { optional: true })?.nativeElement ?? null;
  const id = resolveHostId(host, prefix);
  registerHandle(
    id,
    (myId) => owner.registerDescription(myId),
    (myId) => owner.unregisterDescription(myId),
  );
  return id;
}
