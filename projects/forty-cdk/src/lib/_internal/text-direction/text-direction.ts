import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  computed,
  DOCUMENT,
  DestroyRef,
  ElementRef,
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
 * Resolves the effective writing direction for the host element, reactive to
 * runtime changes.
 *
 * Returns a `Signal<WritingDirection>` equal to `explicitDir() ?? <ambient>`:
 * an explicit `[dir]` always wins, and when it is `null` the value falls back
 * to the **nearest ancestor carrying a `dir` attribute** (via
 * `element.closest('[dir]')`), then to `<html dir>`, defaulting to `'ltr'`.
 * Direction is read from the semantic `dir` attribute, not from CSS
 * `direction`; consumers who need a specific direction should set the `dir`
 * attribute on an ancestor (the standard `<html dir="rtl">` setup) rather than
 * relying on `direction` in a stylesheet.
 *
 * SSR-safe: with no browser platform the ambient value is `'ltr'` and the DOM
 * is never touched. Reactive: a `MutationObserver` watches `dir` attribute
 * changes on `<html>` and on the host's ancestor chain, so a runtime flip
 * (e.g. a locale switch toggling `<html dir>`) updates the returned signal.
 * The observer is disconnected on the calling injection context's
 * `DestroyRef.onDestroy`.
 *
 * Must be called from an injection context (it injects `ElementRef`,
 * `DOCUMENT`, `PLATFORM_ID`, and `DestroyRef`).
 *
 * Internal — not re-exported from `public-api.ts`.
 */
export function injectTextDirection(
  explicitDir: Signal<WritingDirection | null>,
): Signal<WritingDirection> {
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const doc = inject(DOCUMENT);

  const ambient = signal<WritingDirection>('ltr');

  if (isBrowser) {
    const root = doc.documentElement;

    const resolveAmbient = (): void => {
      // Start the search at the parent: the host reflects its own resolved
      // `dir` (see the `[attr.dir]` binding on every primitive root), so
      // `host.closest('[dir]')` would match the host itself and feed the
      // resolved value back as the ambient value. Walking from the parent
      // reads the genuine inherited direction.
      const ancestor = host.parentElement?.closest('[dir]');
      ambient.set(normalizeDir(ancestor?.getAttribute('dir') ?? root?.dir));
    };

    // Resolve once synchronously so a `dir` already present in the DOM at
    // construction (the canonical `<html dir="rtl">` setup) is reflected on
    // the very first render without a flash of the wrong direction.
    resolveAmbient();

    // Re-resolve after the first render: when the ancestor `dir` is itself an
    // Angular binding (`<div [attr.dir]="…">`), it is applied during change
    // detection *after* this directive constructs, so the synchronous read
    // above misses it. The post-render pass picks it up.
    afterNextRender(() => resolveAmbient());

    const win = doc.defaultView;
    if (win && typeof win.MutationObserver === 'function') {
      // Watching the whole document subtree for `dir` changes covers both the
      // `<html dir>` flip and any ancestor wrapper toggling its `dir`, without
      // having to re-walk the ancestor chain on every mutation. The callback
      // writing `ambient` is the documented "external imperative source →
      // signal" case — no derived state is computed inside it.
      const observer = new win.MutationObserver(() => resolveAmbient());
      observer.observe(root, {
        attributes: true,
        attributeFilter: ['dir'],
        subtree: true,
      });
      inject(DestroyRef).onDestroy(() => observer.disconnect());
    }
  }

  return computed(() => explicitDir() ?? ambient());
}
