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
    // `insertBefore(node, null)` appends, and re-inserting a node where it
    // already sits is a no-op, so this is always correct and idempotent.
    this.host.insertBefore(panel, this.#referenceFor(panel, triggerHost));
  }

  #referenceFor(panel: HTMLElement, triggerHost: HTMLElement | null): HTMLElement | null {
    if (!triggerHost) return null;
    for (const child of Array.from(this.host.children) as HTMLElement[]) {
      if (child === panel) continue;
      const childTrigger = this.#triggerFor(child);
      if (!childTrigger || childTrigger === triggerHost) continue;
      const followsMine =
        (triggerHost.compareDocumentPosition(childTrigger) &
          Node.DOCUMENT_POSITION_FOLLOWING) !==
        0;
      if (followsMine) return child;
    }
    return null;
  }

  #triggerFor(panel: HTMLElement): HTMLElement | null {
    const triggerId = panel.getAttribute('aria-labelledby');
    if (!triggerId) return null;
    return this.host.ownerDocument.getElementById(triggerId);
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
