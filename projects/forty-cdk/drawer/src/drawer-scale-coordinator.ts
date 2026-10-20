import { isPlatformBrowser } from '@angular/common';
import {
  computed,
  DOCUMENT,
  effect,
  inject,
  Injectable,
  PLATFORM_ID,
  type Signal,
  signal,
} from '@angular/core';

import { createSingleSlot, injectPrefersReducedMotion } from 'forty-cdk/core';
import { type ForDrawerSide, ForDrawerStack } from 'forty-cdk/core-overlay';

/**
 * Per-drawer configuration consumed by {@link ForDrawerScaleCoordinator}.
 * `[forDrawer]` registers it as a signal derived from its inputs and its
 * scope's defaults, `null` while `scaleBackground` is off, so the coordinator
 * reads every change while the drawer stays open.
 *
 * `setBackgroundColorOnScale` controls whether `<body>` receives an inline
 * background colour while the wrapper is scaled — necessary to mask the
 * sliver of viewport that becomes visible between the scaled wrapper and
 * the viewport edge. Disabled by drawers that already paint a full-bleed
 * backdrop or apply their own body-level styling.
 *
 * The remaining keys default to a tuned set of values (scale `0.95`, +14 px Y,
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
  readonly element: HTMLElement;
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
 * opted into the scale-background effect. The consumer chooses _which_
 * element wraps the rest of the app via explicit DI, instead of relying on a
 * global selector / data attribute.
 *
 * Stacking model: one wrapper is coordinated at a time, the most recently
 * registered one, and a second still registered once the render settles warns
 * in dev mode; multiple drawers may be registered concurrently. The topmost (most recently
 * registered) drawer with a non-`null` config commands the effective scale —
 * when it unregisters or turns `scaleBackground` off, the next one down takes
 * over. Reverts to inline-style snapshots only when no registered drawer wants
 * the effect or the wrapper itself is torn down.
 *
 * `prefers-reduced-motion: reduce` is treated as a hard kill switch:
 * while it is `true` the effect is suppressed entirely, the wrapper /
 * body styles are reverted, and the snapshot is cleared. When the
 * preference flips back to `false` with at least one active drawer, the
 * effect re-applies.
 *
 * SSR: providedIn `root` so its state is per Angular bootstrap. On the
 * server both registration methods return a no-op cleanup through their
 * `isPlatformBrowser` gate; `[forDrawer]` additionally registers only after
 * its first render.
 *
 * Internal to `forty-cdk/drawer`: not exported from any entry point.
 */
@Injectable({ providedIn: 'root' })
export class ForDrawerScaleCoordinator {
  readonly #document = inject(DOCUMENT);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly #prefersReducedMotion = injectPrefersReducedMotion();
  readonly #drawerStack = inject(ForDrawerStack);

  readonly #wrapperSlot = createSingleSlot<HTMLElement>({
    primitive: 'drawer',
    owner: 'page',
    claimant: '[forDrawerWrapper]',
  });
  readonly #drawers = signal<readonly Signal<ForDrawerScaleConfig | null>[]>([]);

  #wrapperSnapshot: WrapperSnapshot | null = null;
  #bodySnapshot: BodySnapshot | null = null;
  /**
   * Hosts whose inline `style.transform` the nested-state pass wrote, so it
   * clears only transforms it applied.
   */
  readonly #nestedTransformOwned = new WeakSet<HTMLElement>();

  /**
   * `true` when a wrapper is registered, at least one drawer wants the effect,
   * and `prefers-reduced-motion: reduce` is not set. Drawers reflect this
   * on their host as `data-scale-background` when `scaleBackground()` is
   * also `true`; the wrapper reflects it as `data-state="scaled"` /
   * `"idle"`.
   */
  readonly active = computed<boolean>(() => {
    return (
      this.#wrapperSlot.value() !== null &&
      this.#activeConfig() !== null &&
      !this.#prefersReducedMotion()
    );
  });

  readonly #activeConfig = computed<ForDrawerScaleConfig | null>(() => {
    const drawers = this.#drawers();
    for (let i = drawers.length - 1; i >= 0; i--) {
      const config = drawers[i]!();
      if (config !== null) {
        return config;
      }
    }
    return null;
  });

  constructor() {
    effect(() => {
      const wrapper = this.#wrapperSlot.value();
      const config = this.#activeConfig();
      const reducedMotion = this.#prefersReducedMotion();

      if (wrapper && config && !reducedMotion) {
        this.#apply(wrapper, config);
      } else {
        this.#revert();
      }
    });

    effect(() => {
      const stack = this.#drawerStack.stack();
      const reducedMotion = this.#prefersReducedMotion();

      for (const node of stack) {
        if (!reducedMotion && stack.some((n) => n.parent === node.host)) {
          node.host.style.transform = this.#nestedTransform(
            node.side(),
            node.nestedScaleAmount,
            node.nestedTranslateYpx,
          );
          this.#nestedTransformOwned.add(node.host);
        } else if (this.#nestedTransformOwned.has(node.host)) {
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
   * Register the consumer's app-shell wrapper. The most recently registered
   * wrapper is the one scaled, so a structural swap hands the effect to the
   * incoming wrapper. Returns a cleanup that the caller wires to its
   * `DestroyRef.onDestroy`, which removes only this wrapper.
   */
  registerWrapper(host: HTMLElement): () => void {
    if (!this.#isBrowser) {
      return () => {};
    }
    this.#wrapperSlot.register(host);
    return () => this.#wrapperSlot.unregister(host);
  }

  /**
   * Register a mounted drawer on the LIFO stack. `config` is read live: the
   * topmost drawer whose `config` is not `null` commands the effect, so a
   * drawer that turns `scaleBackground` off hands it to the one below.
   * Returns a cleanup that removes the same entry, for the caller's
   * `DestroyRef.onDestroy`. Without a registered wrapper nothing is applied,
   * so test composition and consumer flows don't have to enforce ordering.
   */
  registerDrawer(config: Signal<ForDrawerScaleConfig | null>): () => void {
    if (!this.#isBrowser) {
      return () => {};
    }
    this.#drawers.update((s) => [...s, config]);
    return () => {
      this.#drawers.update((s) => {
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
    if (this.#wrapperSnapshot && this.#wrapperSnapshot.element !== wrapper) {
      this.#restoreWrapper(this.#wrapperSnapshot);
      this.#wrapperSnapshot = null;
    }
    if (!this.#wrapperSnapshot) {
      this.#wrapperSnapshot = {
        element: wrapper,
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
      // The commanding config opts out — release the body snapshot.
      this.#document.body.style.backgroundColor = this.#bodySnapshot.backgroundColor;
      this.#bodySnapshot = null;
    }
  }

  #restoreWrapper(snapshot: WrapperSnapshot): void {
    const wrapper = snapshot.element;
    wrapper.style.transform = snapshot.transform;
    wrapper.style.transformOrigin = snapshot.transformOrigin;
    wrapper.style.borderRadius = snapshot.borderRadius;
    wrapper.style.overflow = snapshot.overflow;
    wrapper.style.transitionProperty = snapshot.transitionProperty;
    wrapper.style.transitionDuration = snapshot.transitionDuration;
    wrapper.style.transitionTimingFunction = snapshot.transitionTimingFunction;
  }

  #revert(): void {
    if (this.#wrapperSnapshot) {
      this.#restoreWrapper(this.#wrapperSnapshot);
      this.#wrapperSnapshot = null;
    }
    if (this.#bodySnapshot) {
      this.#document.body.style.backgroundColor = this.#bodySnapshot.backgroundColor;
      this.#bodySnapshot = null;
    }
  }
}
