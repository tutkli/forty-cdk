import { isPlatformBrowser } from '@angular/common';
import { computed, DOCUMENT, effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

import { type ForDrawerSide } from '../drawer-stack/drawer-side';
import { ForDrawerStack } from '../drawer-stack/drawer-stack';
import { injectPrefersReducedMotion } from '../media-query/media-query';

/**
 * Per-drawer configuration consumed by {@link ForDrawerScaleCoordinator}.
 * Resolved by `[forDrawer]` from inputs + defaults at register time so the
 * coordinator never needs to re-read scope-dependent values.
 *
 * `setBackgroundColorOnScale` controls whether `<body>` receives an inline
 * background colour while the wrapper is scaled — necessary to mask the
 * sliver of viewport that becomes visible between the scaled wrapper and
 * the viewport edge. Disabled by drawers that already paint a full-bleed
 * backdrop or apply their own body-level styling.
 *
 * The remaining keys mirror Vaul's magic numbers (scale `0.95`, +14 px Y,
 * 8 px corner radius, black body) but are tunable via
 * `provideForDrawerDefaults`.
 */
export interface ForDrawerScaleConfig {
  readonly setBackgroundColorOnScale: boolean;
  readonly scaleAmount: number;
  readonly scaleTranslateYpx: number;
  readonly scaleBorderRadiusPx: number;
  readonly scaleBackgroundColor: string;
}

interface WrapperSnapshot {
  readonly transform: string;
  readonly transformOrigin: string;
  readonly borderRadius: string;
  readonly overflow: string;
  readonly transitionProperty: string;
  readonly transitionDuration: string;
  readonly transitionTimingFunction: string;
}

interface BodySnapshot {
  readonly backgroundColor: string;
}

const TRANSITION_DURATION_S = 0.5;
const TRANSITION_TIMING = 'cubic-bezier(0.32, 0.72, 0, 1)';

/**
 * App-scoped coordinator that synchronises a registered
 * `[forDrawerWrapper]` element with the LIFO stack of active drawers
 * opted into the scale-background effect. Mirrors the visual contract of
 * [Vaul's `shouldScaleBackground`](https://vaul.emilkowal.ski/api#shouldscalebackground)
 * but with explicit DI: the consumer chooses _which_ element wraps the
 * rest of the app instead of relying on a global selector / data attribute.
 *
 * Stacking model: at most one wrapper is registered at any time; multiple
 * drawers may be registered concurrently. The topmost (most recently
 * registered) drawer's config commands the effective scale — when it
 * unregisters, the previous topmost takes over. Reverts to inline-style
 * snapshots only when the last drawer unregisters or the wrapper itself
 * is torn down.
 *
 * `prefers-reduced-motion: reduce` is treated as a hard kill switch:
 * while it is `true` the effect is suppressed entirely, the wrapper /
 * body styles are reverted, and the snapshot is cleared. When the
 * preference flips back to `false` with at least one active drawer, the
 * effect re-applies.
 *
 * SSR: providedIn `root` so its state is per Angular bootstrap. On the
 * server, `registerWrapper` / `registerDrawer` are no-ops since the
 * directives that call them only do so from `afterNextRender`.
 *
 * Internal — not re-exported from `public-api.ts`.
 */
@Injectable({ providedIn: 'root' })
export class ForDrawerScaleCoordinator {
  readonly #document = inject(DOCUMENT);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly #prefersReducedMotion = injectPrefersReducedMotion();
  readonly #drawerStack = inject(ForDrawerStack);

  readonly #wrapperEl = signal<HTMLElement | null>(null);
  readonly #stack = signal<readonly ForDrawerScaleConfig[]>([]);

  #wrapperSnapshot: WrapperSnapshot | null = null;
  #bodySnapshot: BodySnapshot | null = null;
  /**
   * Hosts for which this coordinator currently owns an inline
   * `style.transform` from the nested-state pass. Used to ensure we only
   * clear transforms we ourselves applied — drag handlers also write to
   * `style.transform` and the coordinator must yield to them.
   */
  readonly #nestedTransformOwned = new WeakSet<HTMLElement>();

  /**
   * `true` when a wrapper is registered, at least one drawer is active,
   * and `prefers-reduced-motion: reduce` is not set. Drawers reflect this
   * on their host as `data-scale-background` when `scaleBackground()` is
   * also `true`; the wrapper reflects it as `data-state="scaled"` /
   * `"idle"`.
   */
  readonly active = computed<boolean>(() => {
    return this.#wrapperEl() !== null && this.#stack().length > 0 && !this.#prefersReducedMotion();
  });

  readonly #activeConfig = computed<ForDrawerScaleConfig | null>(() => {
    const stack = this.#stack();
    return stack.length === 0 ? null : (stack[stack.length - 1] ?? null);
  });

  constructor() {
    effect(() => {
      const wrapper = this.#wrapperEl();
      const config = this.#activeConfig();
      const reducedMotion = this.#prefersReducedMotion();

      if (wrapper && config && !reducedMotion) {
        this.#apply(wrapper, config);
      } else {
        this.#revert();
      }
    });

    // Nested-state visual pass. Mirrors the pre-#180 in-drawer effect but
    // runs once for the whole stack: every node that has at least one
    // direct child in the stack gets a `scale + translate3d` applied to
    // its host, gated by `prefers-reduced-motion: reduce` and by the
    // node's own `dragging()` signal (the swipe handlers in `ForDrawer`
    // mutate `style.transform` imperatively during a gesture, so the
    // coordinator yields the host to them and reapplies on release as a
    // side effect of the `dragging` flip). Tracking ownership in
    // `#nestedTransformOwned` keeps cleanup honest — we only clear
    // transforms we ourselves applied.
    effect(() => {
      const stack = this.#drawerStack.stack();
      const reducedMotion = this.#prefersReducedMotion();

      // Two-pass: figure out which nodes currently want a nested
      // transform, then reconcile against ownership. Reduced-motion
      // forces an empty `wantsNested` set so previously-owned hosts get
      // released cleanly.
      const wantsNested = new Set<HTMLElement>();
      if (!reducedMotion) {
        for (const node of stack) {
          // Read each node's `dragging` signal so the effect re-runs when
          // any drawer's gesture flips on or off — yielding to the drag
          // handlers without dropping the reactive subscription on the
          // signal (Angular's effect tracking ignores signals only read
          // inside conditionals that short-circuited last run).
          const dragging = node.dragging();
          const hasChild = stack.some((n) => n.parent === node.host);
          if (hasChild && !dragging) {
            wantsNested.add(node.host);
          }
        }
      } else {
        // Subscribe to `dragging` even under reduced-motion so a flip back
        // to `false` for the preference re-runs this effect with full
        // reactivity. Cheap to read (no allocation) and keeps the
        // dependency graph predictable.
        for (const node of stack) {
          node.dragging();
        }
      }

      // Apply transforms for nodes that want them.
      for (const node of stack) {
        if (!wantsNested.has(node.host)) {
          continue;
        }
        node.host.style.transform = this.#nestedTransform(
          node.side,
          node.nestedScaleAmount,
          node.nestedTranslateYpx,
        );
        this.#nestedTransformOwned.add(node.host);
      }

      // Release ownership on hosts we previously applied to but that no
      // longer want a nested transform. The drag handler may have already
      // overwritten `style.transform` with its own translate; only clear
      // when the parent isn't currently dragging (otherwise we'd stomp
      // the drag mid-gesture).
      for (const node of stack) {
        if (
          this.#nestedTransformOwned.has(node.host) &&
          !wantsNested.has(node.host) &&
          !node.dragging()
        ) {
          node.host.style.transform = '';
          this.#nestedTransformOwned.delete(node.host);
        }
      }
    });
  }

  /**
   * Build the nested-state transform string for a given drawer side. The
   * surface translates *away* from its anchored edge:
   *
   * - `bottom` (default) → translate up (`-translatePx` on Y).
   * - `top` → translate down (`+translatePx` on Y).
   * - `left` → translate left (`-translatePx` on X).
   * - `right` → translate right (`+translatePx` on X).
   *
   * The scale factor is uniform.
   */
  #nestedTransform(side: ForDrawerSide, amount: number, translatePx: number): string {
    const sign = side === 'top' ? 1 : -1;
    const tx = side === 'left' ? -translatePx : side === 'right' ? translatePx : 0;
    const ty = side === 'left' || side === 'right' ? 0 : sign * translatePx;
    return `scale(${amount}) translate3d(${tx}px, ${ty}px, 0)`;
  }

  /**
   * Register the consumer's app-shell wrapper. Only one wrapper may be
   * registered at a time; a second registration throws — Vaul has the
   * same restriction and the multi-wrapper case has no defined visual
   * outcome. Returns a cleanup that the caller wires to its
   * `DestroyRef.onDestroy`.
   */
  registerWrapper(host: HTMLElement): () => void {
    if (!this.#isBrowser) {
      return () => {};
    }
    if (this.#wrapperEl() !== null && this.#wrapperEl() !== host) {
      throw new Error(
        '[forty-cdk/drawer] Multiple [forDrawerWrapper] registered; only one wrapper is allowed per viewport.',
      );
    }
    this.#wrapperEl.set(host);
    return () => {
      if (this.#wrapperEl() === host) {
        this.#wrapperEl.set(null);
      }
    };
  }

  /**
   * Register an active drawer's scale config on the LIFO stack. Returns
   * a cleanup that pops the same entry — call from
   * `DestroyRef.onDestroy`. Calling `registerDrawer` without a registered
   * wrapper is silently a no-op (no styles applied) so test composition
   * and consumer flows don't have to enforce ordering.
   */
  registerDrawer(config: ForDrawerScaleConfig): () => void {
    if (!this.#isBrowser) {
      return () => {};
    }
    this.#stack.update((s) => [...s, config]);
    return () => {
      this.#stack.update((s) => {
        const idx = s.lastIndexOf(config);
        if (idx === -1) {
          return s;
        }
        const next = s.slice();
        next.splice(idx, 1);
        return next;
      });
    };
  }

  #apply(wrapper: HTMLElement, config: ForDrawerScaleConfig): void {
    if (!this.#wrapperSnapshot) {
      this.#wrapperSnapshot = {
        transform: wrapper.style.transform,
        transformOrigin: wrapper.style.transformOrigin,
        borderRadius: wrapper.style.borderRadius,
        overflow: wrapper.style.overflow,
        transitionProperty: wrapper.style.transitionProperty,
        transitionDuration: wrapper.style.transitionDuration,
        transitionTimingFunction: wrapper.style.transitionTimingFunction,
      };
    }

    const translate = `calc(env(safe-area-inset-top) + ${config.scaleTranslateYpx}px)`;
    wrapper.style.transform = `scale(${config.scaleAmount}) translate3d(0, ${translate}, 0)`;
    wrapper.style.transformOrigin = 'top';
    wrapper.style.borderRadius = `${config.scaleBorderRadiusPx}px`;
    wrapper.style.overflow = 'hidden';
    wrapper.style.transitionProperty = 'transform, border-radius';
    wrapper.style.transitionDuration = `${TRANSITION_DURATION_S}s`;
    wrapper.style.transitionTimingFunction = TRANSITION_TIMING;

    if (config.setBackgroundColorOnScale) {
      const body = this.#document.body;
      if (!this.#bodySnapshot) {
        this.#bodySnapshot = { backgroundColor: body.style.backgroundColor };
      }
      body.style.backgroundColor = config.scaleBackgroundColor;
    } else if (this.#bodySnapshot) {
      // Topmost drawer opts out — release the body snapshot we may have
      // taken from a previous (now-popped) drawer.
      this.#document.body.style.backgroundColor = this.#bodySnapshot.backgroundColor;
      this.#bodySnapshot = null;
    }
  }

  #revert(): void {
    if (this.#wrapperSnapshot) {
      const wrapper = this.#wrapperEl();
      if (wrapper) {
        wrapper.style.transform = this.#wrapperSnapshot.transform;
        wrapper.style.transformOrigin = this.#wrapperSnapshot.transformOrigin;
        wrapper.style.borderRadius = this.#wrapperSnapshot.borderRadius;
        wrapper.style.overflow = this.#wrapperSnapshot.overflow;
        wrapper.style.transitionProperty = this.#wrapperSnapshot.transitionProperty;
        wrapper.style.transitionDuration = this.#wrapperSnapshot.transitionDuration;
        wrapper.style.transitionTimingFunction = this.#wrapperSnapshot.transitionTimingFunction;
      }
      this.#wrapperSnapshot = null;
    }
    if (this.#bodySnapshot) {
      this.#document.body.style.backgroundColor = this.#bodySnapshot.backgroundColor;
      this.#bodySnapshot = null;
    }
  }
}
