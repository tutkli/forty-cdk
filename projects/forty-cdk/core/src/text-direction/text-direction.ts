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
 * Owns the single application-wide `MutationObserver` watching `dir` attribute changes across the
 * document, exposed as a monotonically increasing `revision` tick.
 *
 * One observer covers every primitive: each host derives its ambient direction from a `computed`
 * keyed on `revision`, so N primitives reflecting `[attr.dir]` on first render collapse into one
 * batched callback rather than the quadratic cascade of N per-instance observers each retriggering
 * on every other's reflection.
 *
 * Granularity is deliberately coarse: any `dir` mutation invalidates every dir-aware primitive,
 * each re-walking its own ancestor chain with a synchronous `closest('[dir]')`.
 *
 * SSR-safe: off-browser no observer is created and `revision` stays `0`.
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
 * An explicit `[dir]` always wins. When it is `null` the value falls back to the nearest ancestor
 * carrying a `dir` attribute — the host itself is skipped, since it reflects its own resolved
 * value — then to `<html dir>`, defaulting to `'ltr'`.
 *
 * Direction is read from the semantic `dir` attribute, never from CSS `direction`, so consumers set
 * `dir` on an ancestor rather than styling it.
 *
 * A runtime flip of any `dir` attribute recomputes the signal. SSR-safe: the ancestor walk runs
 * server-side too, so a server-rendered RTL app resolves `'rtl'` and hydration matches.
 *
 * Limitation: only `dir` attribute mutations are observed, not `childList`. Moving the host into a
 * different-`dir` subtree without changing any `dir` attribute does not recompute the ambient;
 * set an explicit `[dir]` on the moved element if that happens.
 *
 * Must be called from an injection context.
 */
export function injectTextDirection(
  explicitDir: Signal<WritingDirection | null>,
): Signal<WritingDirection> {
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const doc = inject(DOCUMENT);
  const direction = inject(AmbientDirection);

  const ambient = computed<WritingDirection>(() => {
    direction.revision();
    const ancestor = host.parentElement?.closest('[dir]');
    return normalizeDir(ancestor?.getAttribute('dir') ?? doc.documentElement?.dir);
  });

  return computed(() => explicitDir() ?? ambient());
}
