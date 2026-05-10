import { isPlatformBrowser } from '@angular/common';
import {
  computed,
  DOCUMENT,
  effect,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';

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

  readonly #wrapperEl = signal<HTMLElement | null>(null);
  readonly #stack = signal<readonly ForDrawerScaleConfig[]>([]);

  #wrapperSnapshot: WrapperSnapshot | null = null;
  #bodySnapshot: BodySnapshot | null = null;

  /**
   * `true` when a wrapper is registered, at least one drawer is active,
   * and `prefers-reduced-motion: reduce` is not set. Drawers reflect this
   * on their host as `data-scale-background` when `scaleBackground()` is
   * also `true`; the wrapper reflects it as `data-state="scaled"` /
   * `"idle"`.
   */
  readonly active = computed<boolean>(() => {
    return (
      this.#wrapperEl() !== null &&
      this.#stack().length > 0 &&
      !this.#prefersReducedMotion()
    );
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
