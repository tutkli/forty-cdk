import { afterNextRender, isDevMode } from '@angular/core';

/**
 * Identifies the piece in the dev-mode mounted-while-closed warning and tells
 * the helper how to read its surface's open state. Every string field is a
 * literal from the adopting primitive, never a runtime value.
 */
export interface MountedWhileClosedConfig {
  /** Entry-point name used in the `[forty-cdk/<primitive>]` prefix (e.g. `'select'`). */
  readonly primitive: string;
  /** Selector of the mounted piece (e.g. `'[forSelectContent]'`). */
  readonly piece: string;
  /**
   * The `@if` condition the primitive's README uses, quoted back as the fix
   * (e.g. `'select.open()'`). Keep the two in sync — a consumer following the
   * link should read the same expression there.
   */
  readonly condition: string;
  /** The surface's open state, read once after the first render. */
  readonly open: () => boolean;
}

/**
 * Warns — dev mode only, once per instance — when an overlay surface is still
 * mounted after its first render while its own open state reports closed. That
 * is the consumer forgetting the `@if`, and it is the library's quietest
 * first-use mistake: the surface renders permanently, `data-state="closed"` is
 * reflected onto a visible element, the ARIA stays internally consistent and
 * the primitive keeps working, so it reads as a CSS bug rather than a wiring
 * one ([#1591](https://github.com/tutkli/forty-cdk/issues/1591)).
 *
 * Mount equals open is structural for these surfaces (see the
 * `No forceMount / keepMounted equivalent for overlays` rule in
 * `.claude/rules/conventions.md`), so the `@if` is the whole contract and there
 * is no input to suppress the warning with. Only pieces whose closed state has
 * no supported mounted shape adopt it — the always-mounted families (Tabs /
 * Stepper / Carousel panels, Accordion and Disclosure content, all of which
 * reflect `aria-hidden` + `inert` while closed precisely so a consumer *can*
 * keep them mounted) do not, and neither does a `[forMenuContent]` under
 * `[forMenubar]`, whose README documents an unconditionally mounted surface as
 * one of three shapes.
 *
 * **The check is a mount-time one.** It reads the open state inside
 * `afterNextRender` and never again, which buys three things at once:
 *
 * - **The exit-animation window stays silent.** A surface the consumer closed
 *   is legitimately mounted-and-closed for as long as `animate.leave` keeps it
 *   around, and re-checking on every close transition would report every
 *   correctly-wired overlay in the library.
 * - **Bindings have settled.** A piece that registers with its parent from its
 *   constructor may derive its open state from an input the consumer has not
 *   written yet — `[forNavigationMenuContent]` reads its owning item's value,
 *   which is `input.required` — so a construction-time read would throw
 *   NG0950 rather than answer.
 * - **It is inert on the server.** `afterNextRender` never fires there, so a
 *   prerender emits no diagnostics.
 *
 * The cost is a deliberate false negative: a surface that mounts open and is
 * then left mounted forever is not reported. Catching that would mean
 * re-checking on close, which is the false positive above.
 *
 * Must be called from an injection context (the piece's constructor). In a
 * production build it registers no render hook at all.
 */
export function warnIfMountedWhileClosed(config: MountedWhileClosedConfig): void {
  if (!isDevMode()) {
    return;
  }

  afterNextRender(() => {
    if (config.open()) {
      return;
    }
    console.warn(
      `[forty-cdk/${config.primitive}] ${config.piece} is mounted while the surface is closed. ` +
        `Presence in the DOM is the consumer's job: wrap it with \`@if (${config.condition})\` so it ` +
        `unmounts on close. There is no forceMount input — a surface kept mounted while closed never ` +
        `runs \`animate.enter\` / \`animate.leave\`, and the lifecycle it sets up on mount stays live ` +
        `while closed. See the ${config.primitive} README.`,
    );
  });
}
