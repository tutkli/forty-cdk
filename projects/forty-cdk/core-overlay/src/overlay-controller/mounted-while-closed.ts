import { afterNextRender, isDevMode } from '@angular/core';
import { fortyWarn } from 'forty-cdk/core';

/**
 * Identifies the piece in the dev-mode mounted-while-closed warning and tells
 * the helper how to read its surface's open state.
 */
export interface MountedWhileClosedConfig {
  /** Entry-point name used in the `[forty-cdk/<primitive>]` prefix (e.g. `'select'`). */
  readonly primitive: string;
  /**
   * Selector of the mounted piece (e.g. `'[forSelectContent]'`). A directive
   * with more than one selector resolves the one the consumer actually wrote,
   * so the report names a piece they can find in their template —
   * `[forMenuContent]` serves `[forMenuSubContent]` too.
   */
  readonly piece: string;
  /**
   * The `@if` condition the primitive's README uses, quoted back as the fix
   * (e.g. `'select.open()'`). Keep the two in sync — a consumer following the
   * link should read the same expression there.
   *
   * A thunk is resolved inside the render hook, which is what lets a condition
   * interpolate a bound input: `[forNavigationMenuContent]` quotes its owning
   * item's value, unreadable at construction (see below).
   */
  readonly condition: string | (() => string);
  /** The surface's open state, read once after the first render. */
  readonly open: () => boolean;
}

/**
 * Warns — dev mode only, once per instance — when an overlay surface is still mounted after its
 * first render while its own open state reports closed, which is the consumer forgetting the `@if`.
 *
 * It is the library's quietest first-use mistake: the surface renders permanently,
 * `data-state="closed"` lands on a visible element, the ARIA stays internally consistent and the
 * primitive keeps working, so it reads as a CSS bug rather than a wiring one.
 *
 * Mount equals open is structural for these surfaces, so the `@if` is the whole contract and no
 * input suppresses the warning. Only pieces whose closed state has no supported mounted shape adopt
 * it: the always-mounted panel families do not, and neither does a `[forMenuContent]` under
 * `[forMenubar]`, which documents an unconditionally mounted surface as a supported shape.
 *
 * **The check is mount-time**, reading the open state inside `afterNextRender` and never again,
 * which buys three things:
 *
 * - The exit-animation window stays silent. A closed surface is legitimately mounted for as long as
 *   `animate.leave` keeps it, so re-checking on close would report every correct overlay.
 * - Bindings have settled. A piece deriving its open state from an `input.required` its parent has
 *   not written yet would throw NG0950 on a construction-time read. `condition` takes a thunk for
 *   the same reason, so the quoted fix is built where the input is readable.
 * - It is inert on the server, where `afterNextRender` never fires.
 *
 * The cost is a deliberate false negative: a surface that mounts open and is then left mounted
 * forever goes unreported, since catching it would mean re-checking on close.
 *
 * Must be called from an injection context. A production build registers no render hook at all.
 */
export function warnIfMountedWhileClosed(config: MountedWhileClosedConfig): void {
  if (!isDevMode()) {
    return;
  }

  afterNextRender(() => {
    if (config.open()) {
      return;
    }
    const condition =
      typeof config.condition === 'function' ? config.condition() : config.condition;
    fortyWarn({
      code: 'FORCDK-CORE-006',
      scope: config.primitive,
      message: `${config.piece} is mounted while the surface is closed.`,
      cause:
        "Presence in the DOM is the consumer's job, and there is no forceMount input — a surface " +
        'kept mounted while closed never runs `animate.enter` / `animate.leave`, and the lifecycle ' +
        'it sets up on mount stays live while closed.',
      fix: `Wrap it with \`@if (${condition})\` so it unmounts on close. See the ${config.primitive} README.`,
    });
  });
}
