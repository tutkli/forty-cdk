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
 * keyed on `revision`, so N primitives mounting at once collapse into one batched callback rather
 * than N per-instance observers.
 *
 * `revision` bumps only for a `dir` write that changes the direction some element declares to its
 * descendants: its own normalised `dir` when it carries one, otherwise what its parent declares. A
 * write repeating what the element already inherits — a root reflecting its ambient direction, a
 * portal stamp under `<html dir>` — leaves every resolution as it was and is ignored. A flip that
 * does change a declared direction invalidates every dir-aware primitive, each re-walking its own
 * ancestor chain through open shadow roots. The observer does not reach into shadow roots, so a
 * `dir` changed inside one is picked up on the next document-level change that bumps `revision`.
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
   * Bumps whenever a `dir` attribute change alters the direction an element declares to its
   * descendants. Stays `0` on the server.
   */
  readonly revision = this.#revision.asReadonly();

  constructor() {
    if (!this.#isBrowser) {
      return;
    }

    const win = this.#doc.defaultView;
    if (win && typeof win.MutationObserver === 'function') {
      const observer = new win.MutationObserver((records) => {
        if (records.some((record) => changesDeclaredDirection(record, this.#doc))) {
          this.#revision.update((v) => v + 1);
        }
      });
      observer.observe(this.#doc.documentElement, {
        attributes: true,
        attributeFilter: ['dir'],
        attributeOldValue: true,
        subtree: true,
      });
      this.#destroyRef.onDestroy(() => observer.disconnect());
    }
  }
}

/**
 * Whether a `dir` mutation changed what its target declares to its descendants. Before the write
 * that is the record's old `dir`, or the parent's declared direction when there was none; after it,
 * the current `dir`, or the parent's declared direction once it is gone. Equal values mean no
 * descendant's resolution changed.
 */
function changesDeclaredDirection(record: MutationRecord, doc: Document): boolean {
  const target = record.target as Element;
  const inherited = (): WritingDirection | null =>
    target === doc.documentElement
      ? null
      : resolveAttributeDirection(composedParentElement(target), doc);
  const before = record.oldValue === null ? inherited() : normalizeDir(record.oldValue);
  const after = target.hasAttribute('dir') ? normalizeDir(target.getAttribute('dir')) : inherited();
  return before !== after;
}

/**
 * Resolves the effective writing direction for the host element, reactive to
 * runtime changes.
 *
 * An explicit `[dir]` always wins. When it is `null` the value falls back to the nearest ancestor
 * carrying a `dir` attribute — the host itself is skipped, since it carries
 * {@link injectReflectedDirection} — then to `<html dir>`, defaulting to `'ltr'`. The ancestor walk crosses open shadow roots,
 * so a primitive rendered inside a `ViewEncapsulation.ShadowDom` component follows a `dir` set
 * above its host.
 *
 * Direction is read from the semantic `dir` attribute, never from CSS `direction`, so consumers set
 * `dir` on an ancestor rather than styling it.
 *
 * A runtime `dir` change on an ancestor recomputes the signal. SSR-safe: the ancestor walk runs
 * server-side too, so a server-rendered RTL app resolves `'rtl'` and hydration matches.
 *
 * Limitation: only `dir` attribute mutations in the document are observed, not `childList`, and not
 * mutations inside a shadow root. Moving the host into a different-`dir` subtree, or changing a
 * `dir` inside a shadow root, does not recompute the ambient until a `dir` change elsewhere in the
 * document alters a declared direction; set an explicit `[dir]` on the element if that happens.
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
 * The `dir` value a direction-aware root reflects onto its own host: the explicit `[dir]` when set,
 * otherwise the direction declared above the host (the nearest ancestor carrying a `dir`
 * attribute, across open shadow roots, then `<html dir>`), otherwise `null`.
 *
 * Bind it as `'[attr.dir]'` in place of the resolved {@link injectTextDirection} value. A root with
 * no direction declared anywhere then carries no `dir` attribute, so its subtree keeps inheriting
 * CSS `direction` and a surface portaled out of it is not stamped with a default nobody declared.
 * Omit `explicitDir` on a piece that only mirrors the direction declared above it.
 *
 * Must be called from an injection context.
 */
export function injectReflectedDirection(
  explicitDir?: Signal<WritingDirection | null>,
): Signal<WritingDirection | null> {
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const declared = injectDeclaredDirection(() => composedParentElement(host));

  return explicitDir ? computed(() => explicitDir() ?? declared()) : declared;
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
