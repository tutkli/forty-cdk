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

import { composedClosest, composedParentElement } from '../composed-tree/composed-tree';
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
 * Granularity is coarse: any `dir` mutation invalidates every dir-aware primitive,
 * each re-walking its own ancestor chain through open shadow roots. The observer does not reach
 * into shadow roots, so a `dir` changed inside one is picked up on the next document-level change.
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
 * value — then to `<html dir>`, defaulting to `'ltr'`. The ancestor walk crosses open shadow roots,
 * so a primitive rendered inside a `ViewEncapsulation.ShadowDom` component follows a `dir` set
 * above its host.
 *
 * Direction is read from the semantic `dir` attribute, never from CSS `direction`, so consumers set
 * `dir` on an ancestor rather than styling it.
 *
 * A runtime flip of any `dir` attribute in the document recomputes the signal. SSR-safe: the
 * ancestor walk runs server-side too, so a server-rendered RTL app resolves `'rtl'` and hydration
 * matches.
 *
 * Limitation: only `dir` attribute mutations in the document are observed, not `childList`, and not
 * mutations inside a shadow root. Moving the host into a different-`dir` subtree, or changing a
 * `dir` inside a shadow root, does not recompute the ambient until another `dir` attribute in the
 * document changes; set an explicit `[dir]` on the element if that happens.
 *
 * Must be called from an injection context.
 */
export function injectTextDirection(
  explicitDir: Signal<WritingDirection | null>,
): Signal<WritingDirection> {
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const ambient = injectAmbientDirection(() => composedParentElement(host));

  return computed(() => explicitDir() ?? ambient());
}

/**
 * Resolves the writing direction in effect at `origin`: the nearest element carrying a `dir`
 * attribute, `origin` itself included and open shadow roots crossed, then `<html dir>`, defaulting
 * to `'ltr'`. Recomputes on any runtime `dir` attribute change in the document, and on `origin`
 * when it reads a signal.
 *
 * Must be called from an injection context.
 */
export function injectAmbientDirection(
  origin: () => Element | null | undefined,
): Signal<WritingDirection> {
  const declared = injectDeclaredDirection(origin);
  return computed(() => declared() ?? 'ltr');
}

export function injectDeclaredDirection(
  origin: () => Element | null | undefined,
): Signal<WritingDirection | null> {
  const doc = inject(DOCUMENT);
  const direction = inject(AmbientDirection);

  return computed(() => {
    direction.revision();
    return resolveAttributeDirection(origin() ?? null, doc);
  });
}

function resolveAttributeDirection(origin: Element | null, doc: Document): WritingDirection | null {
  const declared = (origin ? composedClosest(origin, '[dir]') : null) ?? htmlWithDir(doc);
  return declared ? normalizeDir(declared.getAttribute('dir')) : null;
}

export function stampAmbientDirection(el: Element, origin: Element | null): void {
  if (el.hasAttribute('dir')) {
    return;
  }
  const dir = resolveAttributeDirection(origin, el.ownerDocument);
  if (dir !== null) {
    el.setAttribute('dir', dir);
  }
}

function htmlWithDir(doc: Document): Element | null {
  const html = doc.documentElement as Element | null;
  return html?.hasAttribute('dir') ? html : null;
}
