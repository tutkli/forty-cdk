import { inject, Injector } from '@angular/core';

/**
 * Internal composition surface (no semver guarantees). Base for an overlay
 * outlet's context-injector directive. It sits
 * inside the row's `[forDialog]` / `[forDrawer]` element, so its own element
 * injector already resolves that primitive's `FOR_<PRIMITIVE>_CONTEXT`. The
 * outlet feeds this injector to `entry.injectorFor(ctx.injector)`, making the
 * user component rendered via `NgComponentOutlet` inherit the context
 * alongside the data token / ref / consumer providers — so every piece
 * (`[forDialogClose]`, `[forDialogTitle]`, …) resolves exactly as in the
 * declarative path.
 *
 * Each manager subclasses this with its own `for-`-prefixed selector +
 * `exportAs` (the directive selector must be static at decoration time, and
 * the per-primitive template references it by `exportAs`), so the shared body
 * lives here once.
 */
export abstract class OverlayContextInjector {
  readonly injector = inject(Injector);
}
