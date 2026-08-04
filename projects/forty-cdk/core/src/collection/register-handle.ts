import { afterNextRender, DestroyRef, ElementRef, inject } from '@angular/core';

import { resolveHostId } from '../host-attributes/host-id';

/**
 * Scheduling for the `register` call.
 *
 * - `'sync'` (default) — register inside the directive's constructor, at
 *   directive-construction time. Matches what most callsites do today.
 * - `'afterNextRender'` — defer the `register` call until Angular's
 *   `afterNextRender` hook fires. It buys one thing: the parent's lookups can
 *   read the handle's mandatory signals without hitting the not-yet-bound
 *   `input.required` throw, which is why the pieces still on it declare their
 *   value that way (`[forRadio]`, the date / time segment base). Note the hook
 *   never fires in a real server render, so a deferred registration is invisible
 *   to SSR: prefer `'sync'` plus `unsetInput` seeding and an `isUnset`-guarded
 *   lookup whenever the registration drives static markup the pre-hydration DOM
 *   needs — that is what Tabs
 *   ([#1409](https://github.com/tutkli/forty-cdk/issues/1409)) and
 *   NavigationMenu ([#1636](https://github.com/tutkli/forty-cdk/issues/1636))
 *   each shipped an unpaired `aria-controls` / `aria-labelledby` over, and what
 *   Tree ([#1639](https://github.com/tutkli/forty-cdk/issues/1639)) shipped
 *   `aria-posinset="0"` / `aria-setsize="0"` over — values WAI-ARIA defines no
 *   meaning for. The two pieces left on it emit no registration-derived markup:
 *   `[forRadio]` carries `role` / `aria-checked` only, and the segment base
 *   derives its `aria-value*` / `tabindex` from the field engine rather than
 *   from the segment registry. The `unregister` call always runs eagerly via
 *   `DestroyRef.onDestroy`, so destroy-before-register is a safe no-op as long
 *   as `unregister` is reference-based.
 */
export type RegistrationScheduling = 'sync' | 'afterNextRender';

/**
 * Generic register-on-construct / unregister-on-destroy helper.
 *
 * Collapses the boilerplate every child directive used to write by hand:
 *
 * ```ts
 * constructor() {
 *   const handle = { host: this.#host.nativeElement, value: this.value };
 *   this.parent.registerXxx(handle);
 *   inject(DestroyRef).onDestroy(() => this.parent.unregisterXxx(handle));
 * }
 * ```
 *
 * becomes
 *
 * ```ts
 * constructor() {
 *   const handle = { host: this.#host.nativeElement, value: this.value };
 *   registerHandle(handle, (h) => this.parent.registerXxx(h), (h) => this.parent.unregisterXxx(h));
 * }
 * ```
 *
 * Works for any target shape — object handles, raw `HTMLElement`s,
 * `aria-*` id strings — because the helper just hands `target` back to the
 * caller-supplied `register` / `unregister` callbacks.
 *
 * Must be invoked in an injection context (typically a directive
 * constructor) — internally calls `inject(DestroyRef)`.
 *
 * @param target The value to register. Passed verbatim to both callbacks.
 * @param register Called immediately (or deferred via `afterNextRender`,
 *   per `scheduling`) to register the target with the owning parent.
 * @param unregister Called from `DestroyRef.onDestroy` to unregister. Must
 *   be reference-based and tolerant of being called before `register` ever
 *   ran (when `scheduling` is `'afterNextRender'` and the directive is
 *   destroyed before the deferred render fires).
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
 * Generates a stable `id` for the host element and registers it with the
 * `owner`'s `aria-labelledby` collection (`registerLabel` /
 * `unregisterLabel`). Returns the id as a plain `string`; host-bind it via
 * `'[id]': 'id'` (the id never changes, so a signal added nothing).
 *
 * Replaces:
 *
 * ```ts
 * readonly id = signal(this.#idGen.next('for-dialog-title'));
 * constructor() {
 *   const myId = this.id();
 *   this.#ctx.registerLabel(myId);
 *   inject(DestroyRef).onDestroy(() => this.#ctx.unregisterLabel(myId));
 * }
 * ```
 *
 * with:
 *
 * ```ts
 * readonly id = registerA11yName(this.#ctx, 'for-dialog-title');
 * ```
 *
 * A consumer-set **static** `id` on the host is adopted (and registered as the
 * accessible-name id) instead of being clobbered — the host element is read
 * optionally, so the helper still works when invoked outside a directive host
 * context (it falls back to a generated id). See {@link resolveHostId} for the
 * static-only boundary.
 *
 * Must be invoked in an injection context — internally calls `inject` for
 * `ElementRef`, `IdGenerator`, and `DestroyRef`.
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
