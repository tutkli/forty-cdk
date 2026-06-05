import {
  PLATFORM_ID,
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { registerHandle } from '../_internal/collection/register-handle';
import {
  type ForNavigationMenuViewportHandle,
  injectNavigationMenuContext,
} from './navigation-menu-context';

/**
 * Optional shared surface for mega-menu style navigation. When present,
 * `[forNavigationMenuContent]` re-parents itself into this host on mount,
 * so all active content panels live inside a single visual container that
 * can animate width/height between trigger groups (Radix `Viewport`).
 *
 * The viewport exposes the active content's natural size as CSS custom
 * properties:
 *
 * - `--for-navigation-menu-viewport-width` (px)
 * - `--for-navigation-menu-viewport-height` (px)
 *
 * Drive `width` / `height` from these in CSS to get fluid resize between
 * panels. The directive is a real interactive surface (it hosts the
 * focusable content), so `aria-hidden="false"` is reflected explicitly to
 * counteract any wrapper that defaults to hidden.
 *
 * Two `[forNavigationMenuContent]` panels can briefly co-exist inside the
 * viewport during a transition — the leaving panel stays mounted as long
 * as the consumer's `@if` keeps it around (e.g. `animate.leave`), so the
 * consumer can cross-fade or slide. Mount lifecycle stays with the
 * consumer's template; this directive only re-parents and measures.
 *
 * The viewport owns panel ordering: panels are inserted in their triggers'
 * document order, never simply appended in mount order. So during an
 * overlapping A→B transition the panel whose trigger comes first in the DOM
 * is always the first child of the viewport, regardless of which panel
 * mounted last — giving cross-fade / slide carousels a deterministic axis
 * to author against (pair this with the `data-motion` hook on Content).
 *
 * Measurement always tracks the active panel: the ResizeObserver follows
 * `activeContentHost()`, so a non-active panel kept mounted by
 * `animate.leave` is intentionally no longer measured (its size must not
 * drive the viewport box mid-transition). The exposed
 * `--for-navigation-menu-viewport-*` variables therefore reflect the
 * entering panel as soon as it becomes active.
 *
 * @example
 * ```html
 * <nav forNavigationMenu [(value)]="open">
 *   <ul forNavigationMenuList>…</ul>
 *   <div forNavigationMenuViewport></div>
 * </nav>
 * ```
 */
@Directive({
  selector: '[forNavigationMenuViewport]',
  exportAs: 'forNavigationMenuViewport',
  host: {
    'aria-hidden': 'false',
    '[attr.data-state]': 'state()',
    '[attr.data-orientation]': 'menu.orientation()',
    '[style.--for-navigation-menu-viewport-width.px]': 'width()',
    '[style.--for-navigation-menu-viewport-height.px]': 'height()',
  },
})
export class ForNavigationMenuViewport {
  protected readonly menu = injectNavigationMenuContext('ForNavigationMenuViewport');
  readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly #measureTick = signal(0);
  protected readonly width = computed(() => this.#measureSize().width);
  protected readonly height = computed(() => this.#measureSize().height);

  protected readonly state = computed(() => (this.menu.value() ? 'open' : 'closed'));

  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // Tracked panels in insertion order, each with its last known trigger host.
  // Ordering resolves a trigger's document position from this list rather than
  // a DOM `aria-labelledby` → `getElementById` round-trip, which silently
  // returns `null` while a trigger's registration races its content's (both
  // defer to `afterNextRender`) and degrades ordering to mount order. The
  // content re-invokes `insertPanel` once its trigger registers, so the list
  // and the resulting DOM order self-heal. Insertion order is preserved so
  // panels whose trigger is not yet known keep a stable relative position
  // (sorted to the end) instead of thrashing as siblings re-insert.
  readonly #panels: { panel: HTMLElement; triggerHost: HTMLElement | null }[] = [];

  constructor() {
    const handle: ForNavigationMenuViewportHandle = {
      host: this.host,
      insertPanel: (panel, triggerHost) => this.#insertPanel(panel, triggerHost),
    };
    registerHandle(
      handle,
      (h) => this.menu.registerViewport(h),
      (h) => this.menu.unregisterViewport(h),
    );

    // Track the active content's natural size via ResizeObserver so layout
    // mutations between renders (e.g. async content load, viewport host
    // resize from a surrounding column) flow into the exposed CSS variables.
    // Browser-only API; on SSR / very old runtimes we simply skip the
    // observation and the `width`/`height` computed signals still settle on
    // first read because they pull from `getBoundingClientRect` directly.
    if (this.#isBrowser && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => this.#measureTick.update((t) => t + 1));
      // Always observe the viewport host itself so layout changes that affect
      // its own box (e.g. the surrounding column resizing) are picked up.
      ro.observe(this.host);

      // Switch which content child is being observed whenever the active
      // panel changes. Pure side effect on the imperative ResizeObserver —
      // no signal writes from this effect, so the host bindings on
      // `width`/`height` settle within the same CD pass that the active
      // content changed in (no CLAUDE.md "state in effects" exception
      // needed here).
      let observed: HTMLElement | null = null;
      effect(() => {
        const active = this.menu.activeContentHost();
        if (observed && observed !== active) {
          ro.unobserve(observed);
          observed = null;
        }
        if (active && active !== observed) {
          ro.observe(active);
          observed = active;
        }
      });

      inject(DestroyRef).onDestroy(() => ro.disconnect());
    }
  }

  #insertPanel(panel: HTMLElement, triggerHost: HTMLElement | null): void {
    const existing = this.#panels.find((p) => p.panel === panel);
    if (existing) {
      existing.triggerHost = triggerHost;
    } else {
      this.#panels.push({ panel, triggerHost });
    }
    this.#reorder();
  }

  // Reconcile the viewport's children to a single deterministic order: panels
  // whose trigger host is known come first, sorted by the trigger's document
  // position; panels whose trigger is not yet known follow, in insertion
  // order. Computing one total order (rather than inserting each panel
  // relative to the others) makes the result independent of the order in
  // which panels call `insertPanel`, so a registration race converges instead
  // of thrashing. Nodes already in their target slot are left untouched, so
  // re-running this never disturbs an unaffected panel mid-animation.
  #reorder(): void {
    this.#prunePanels();
    const ordered = [...this.#panels].sort((a, b) => {
      if (a.triggerHost && b.triggerHost) {
        if (a.triggerHost === b.triggerHost) return 0;
        const rel = a.triggerHost.compareDocumentPosition(b.triggerHost);
        if ((rel & Node.DOCUMENT_POSITION_FOLLOWING) !== 0) return -1;
        if ((rel & Node.DOCUMENT_POSITION_PRECEDING) !== 0) return 1;
        return 0;
      }
      if (a.triggerHost) return -1;
      if (b.triggerHost) return 1;
      return 0;
    });
    // Reconcile against the host's live children by index: walk the target
    // order, and whenever the child currently at position `i` is not the panel
    // that belongs there, move it in. Moving into the already-correct slot is
    // a no-op, so an unaffected panel is never disturbed mid-animation. Using
    // the live child at `i` as the reference (rather than a not-yet-inserted
    // sibling) keeps every `insertBefore` valid on the first re-parent too.
    for (let i = 0; i < ordered.length; i++) {
      const panel = ordered[i]!.panel;
      const current = this.host.children[i] ?? null;
      if (current !== panel) {
        this.host.insertBefore(panel, current);
      }
    }
  }

  // Drop panels the consumer's `@if` already destroyed so the tracking list
  // does not leak detached nodes across mount/unmount cycles. A freshly
  // mounted panel still sits under its `[forNavigationMenuItem]` (connected,
  // pending its first re-parent) and must be kept.
  #prunePanels(): void {
    for (let i = this.#panels.length - 1; i >= 0; i--) {
      if (!this.#panels[i]!.panel.isConnected) {
        this.#panels.splice(i, 1);
      }
    }
  }

  #measureSize(): { width: number; height: number } {
    // Depend on the manual tick so RO callbacks invalidate the computed.
    this.#measureTick();
    const active = this.menu.activeContentHost();
    if (!active) return { width: 0, height: 0 };
    const r = active.getBoundingClientRect();
    return { width: r.width, height: r.height };
  }
}
