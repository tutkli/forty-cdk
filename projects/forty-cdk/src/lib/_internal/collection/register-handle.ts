import {
  afterNextRender,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  type Signal,
} from '@angular/core';

import { resolveHostId } from '../host-id/host-id';
import type { Collection } from './collection';

/**
 * Scheduling for the `register` call.
 *
 * - `'sync'` (default) — register inside the directive's constructor, at
 *   directive-construction time. Matches what most callsites do today.
 * - `'afterNextRender'` — defer the `register` call until Angular's
 *   `afterNextRender` hook fires. Required when the parent's lookups read
 *   `input.required` signals from the handle during host-binding evaluation
 *   that interleaves with sibling directives' input-binding step (Tabs,
 *   NavigationMenu). The `unregister` call always runs eagerly via
 *   `DestroyRef.onDestroy`, so destroy-before-register is a safe no-op as
 *   long as `unregister` is reference-based.
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
 * Convenience overload of {@link registerHandle} for parents that expose
 * a raw `Collection<H>`. The handle is registered immediately and
 * unregistered on `DestroyRef.onDestroy`.
 *
 * Most parents wrap their `Collection` behind named methods (e.g.
 * `registerOption` / `unregisterOption`) — those callsites should use
 * {@link registerHandle} with the named methods. Reach for this helper only
 * when the parent exposes the bare `Collection` instance.
 *
 * Must be invoked in an injection context.
 */
export function registerCollectionHandle<H extends { readonly host: HTMLElement }>(
  collection: Collection<H>,
  handle: H,
  scheduling: RegistrationScheduling = 'sync',
): void {
  registerHandle(
    handle,
    (h) => collection.register(h),
    (h) => collection.unregister(h),
    scheduling,
  );
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
 * `unregisterLabel`). Returns the id as a `Signal<string>` so the caller
 * can host-bind it via `'[id]': 'id()'` exactly like every other primitive.
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
export function registerA11yName(owner: A11yLabelOwner, prefix: string): Signal<string> {
  const host =
    inject<ElementRef<HTMLElement>>(ElementRef, { optional: true })?.nativeElement ?? null;
  const id = resolveHostId(host, prefix);
  registerHandle(
    id,
    (myId) => owner.registerLabel(myId),
    (myId) => owner.unregisterLabel(myId),
  );
  return signal(id).asReadonly();
}

/**
 * Counterpart to {@link registerA11yName} for `aria-describedby`. See that
 * function for the rationale and usage — including the consumer-set static
 * `id` adoption.
 */
export function registerA11yDescription(
  owner: A11yDescriptionOwner,
  prefix: string,
): Signal<string> {
  const host =
    inject<ElementRef<HTMLElement>>(ElementRef, { optional: true })?.nativeElement ?? null;
  const id = resolveHostId(host, prefix);
  registerHandle(
    id,
    (myId) => owner.registerDescription(myId),
    (myId) => owner.unregisterDescription(myId),
  );
  return signal(id).asReadonly();
}
