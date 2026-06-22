import { isPlatformBrowser } from '@angular/common';
import {
  computed,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  Injectable,
  inject,
  PLATFORM_ID,
  signal,
  type Signal,
} from '@angular/core';

import type { WritingDirection } from '../keyboard-navigation/keyboard-navigation';

/**
 * Normalise an arbitrary `dir` attribute value to a concrete writing
 * direction. Only `'rtl'` (case-insensitive) maps to RTL; everything else —
 * including `'auto'`, the empty string, and unknown tokens — resolves to
 * `'ltr'`, matching the spec's behaviour that a non-`rtl` enumerated value is
 * treated as the default direction.
 */
function normalizeDir(value: string | null | undefined): WritingDirection {
  return value?.toLowerCase() === 'rtl' ? 'rtl' : 'ltr';
}

/**
 * Owns the single, application-wide `MutationObserver` that watches `dir`
 * attribute changes across the whole document, and exposes them as a
 * monotonically increasing `revision` tick.
 *
 * One observer covers every primitive: `injectTextDirection` derives each
 * host's ambient direction from a `computed` keyed on `revision`, so N
 * primitives reflecting `[attr.dir]` on first render coalesce into a single
 * observer callback (microtask-batched) → one `revision` bump → N ambient
 * recomputes — O(N), not the O(N²) cascade of N per-instance observers each
 * retriggering on every other's reflection.
 *
 * SSR-safe: on the server no observer is created, the DOM is never touched,
 * and `revision` stays `0`.
 *
 * The observer callback writing `#revision` is the single, intentional
 * "external imperative source → signal" exception, isolated here.
 *
 * Recompute granularity (intentional trade-off): a single `dir` mutation
 * anywhere in the document bumps the one shared `revision`, which invalidates
 * the ambient `computed` of **every** mounted dir-aware primitive — each then
 * re-walks its own ancestor chain. This is deliberately coarse: it keeps the
 * library at one document observer instead of one per primitive, and the
 * recompute is a cheap synchronous `closest('[dir]')` walk per host. With the
 * modest number of dir-aware primitives a typical page mounts, the
 * recompute-all cost is well below the cost of N per-instance observers each
 * retriggering on every other's reflection. If profiling ever flags it, cache
 * the ambient per *ancestor* (siblings under the same `[dir]` share a result)
 * or push the resolved ambient from this callback so a recompute becomes a
 * signal read rather than a DOM walk.
 *
 * Internal — not re-exported from `public-api.ts`.
 */
@Injectable({ providedIn: 'root' })
class AmbientDirection {
  readonly #doc = inject(DOCUMENT);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly #destroyRef = inject(DestroyRef);

  readonly #revision = signal(0);

  /**
   * Bumps whenever any `dir` attribute changes anywhere in the document.
   * Stays `0` on the server.
   */
  readonly revision = this.#revision.asReadonly();

  constructor() {
    if (!this.#isBrowser) {
      return;
    }

    const win = this.#doc.defaultView;
    if (win && typeof win.MutationObserver === 'function') {
      const observer = new win.MutationObserver(() => this.#revision.update((v) => v + 1));
      observer.observe(this.#doc.documentElement, {
        attributes: true,
        attributeFilter: ['dir'],
        subtree: true,
      });
      this.#destroyRef.onDestroy(() => observer.disconnect());
    }
  }
}

/**
 * Resolves the effective writing direction for the host element, reactive to
 * runtime changes.
 *
 * Returns a `Signal<WritingDirection>` equal to `explicitDir() ?? <ambient>`:
 * an explicit `[dir]` always wins, and when it is `null` the value falls back
 * to the **nearest ancestor carrying a `dir` attribute** (the host itself is
 * skipped — it reflects its own resolved `dir`), then to `<html dir>`,
 * defaulting to `'ltr'`.
 * Direction is read from the semantic `dir` attribute, not from CSS
 * `direction`; consumers who need a specific direction should set the `dir`
 * attribute on an ancestor (the standard `<html dir="rtl">` setup) rather than
 * relying on `direction` in a stylesheet.
 *
 * SSR-safe: with no browser platform the ambient value is `'ltr'` and the DOM
 * is never touched. Reactive: a single application-wide `MutationObserver`
 * (owned by the root `AmbientDirection` service) watches `dir` attribute
 * changes across the whole document and publishes them as a shared `revision`
 * tick; the ambient is a `computed` keyed on that tick that reads the host's
 * ancestor chain synchronously. A runtime flip (e.g. a locale switch toggling
 * `<html dir>`, or an ancestor wrapper toggling its `dir`) bumps the tick and
 * recomputes the returned signal — regardless of how many primitives are
 * mounted, there is exactly one observer.
 *
 * Limitation: the shared observer watches `dir` attribute mutations only
 * (`attributeFilter: ['dir']`), not `childList`. The ambient therefore does
 * **not** recompute when the host is moved into a different-`dir` subtree
 * without any `dir` attribute itself changing (e.g. a parent re-parents the
 * element under an existing `[dir="rtl"]` ancestor). Detecting that would need
 * a `childList`/`subtree` observer over the whole document — far costlier than
 * this case warrants. Reparenting between subtrees with different ambient
 * directions is rare; consumers who hit it should set an explicit `[dir]` on
 * the moved element or trigger any `dir` mutation to force a recompute.
 *
 * Must be called from an injection context (it injects `ElementRef`,
 * `DOCUMENT`, `PLATFORM_ID`, and `AmbientDirection`).
 *
 * Internal — not re-exported from `public-api.ts`.
 */
export function injectTextDirection(
  explicitDir: Signal<WritingDirection | null>,
): Signal<WritingDirection> {
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const doc = inject(DOCUMENT);
  const direction = inject(AmbientDirection);

  const ambient = computed<WritingDirection>(() => {
    direction.revision();
    if (!isBrowser) {
      return 'ltr';
    }
    const ancestor = host.parentElement?.closest('[dir]');
    return normalizeDir(ancestor?.getAttribute('dir') ?? doc.documentElement?.dir);
  });

  return computed(() => explicitDir() ?? ambient());
}
