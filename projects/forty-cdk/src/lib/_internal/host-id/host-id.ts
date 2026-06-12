import { ElementRef, inject, signal, type Signal, type WritableSignal } from '@angular/core';

import { IdGenerator } from '../id-generator/id-generator';

/**
 * Resolves the id a piece should expose: the host element's pre-existing
 * **static** `id` when present, else a freshly generated `<prefix>-*` id.
 *
 * The generated id is always produced (advancing the {@link IdGenerator}
 * counter) even when a host id is adopted, so the per-app id sequence stays
 * deterministic across renders regardless of which hosts carry a consumer id —
 * a server and client render of the same template adopt identically, so
 * hydration still agrees.
 *
 * Only **static** ids (written in the template, present on the element at
 * directive construction) are visible here. A consumer `[id]="expr"` property
 * binding evaluates after construction, so it is not adopted — and still
 * fights the `[id]` host binding. See `.claude/rules/conventions.md`.
 *
 * Must be invoked in an injection context — internally injects
 * {@link IdGenerator}.
 *
 * @param host The directive's host element, or `null` to always generate (e.g.
 *   when the owning helper resolved `ElementRef` optionally and found none).
 * @param prefix Prefix for the generated fallback id.
 */
export function resolveHostId(host: HTMLElement | null, prefix: string): string {
  const generated = inject(IdGenerator).next(prefix);
  return host?.getAttribute('id') || generated;
}

/**
 * Adopt a host element's pre-existing **static** `id` into `idSignal`. A no-op
 * when the host has no `id`, leaving the signal's generated fallback in place.
 *
 * The canonical shape for the "context-owned id" pieces (overlay
 * trigger / content, form-field control): the owning root seeds `idSignal`
 * with a generated id at construction, then calls this from its
 * `register…(el)` method so a consumer-set `id` on the registered host is
 * preserved and re-emitted by the `[id]` host binding — external references
 * (anchors, `aria-labelledby`, label `for`, test hooks) keep resolving.
 *
 * Only **static** ids are adopted; see {@link resolveHostId} for the
 * static-only boundary.
 *
 * @param host The element whose static `id` should be adopted.
 * @param idSignal The writable id signal to adopt into.
 */
export function adoptHostId(host: HTMLElement, idSignal: WritableSignal<string>): void {
  const existing = host.getAttribute('id');
  if (existing) {
    idSignal.set(existing);
  }
}

/**
 * Convenience for the "piece owns its own id" pieces: seeds a read-only id
 * signal from the host element's pre-existing static `id`, falling back to a
 * freshly generated `<prefix>-*` id.
 *
 * Replaces the hand-written `readonly id = signal(this.#idGen.next('…'))` so
 * the piece's `[id]` host binding re-emits a consumer-set static id instead of
 * clobbering it. Must be invoked in an injection context — internally injects
 * {@link ElementRef} and {@link IdGenerator}.
 *
 * @param prefix Prefix for the generated fallback id.
 */
export function hostId(prefix: string): Signal<string> {
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  return signal(resolveHostId(host, prefix)).asReadonly();
}
