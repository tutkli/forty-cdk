import { afterNextRender, effect, inject, Injector, untracked } from '@angular/core';
import { fortyWarn } from 'forty-cdk/core';

/**
 * Identifies the surface in the dev-mode open-without-content warning and tells
 * the helper how to read the root's open state and its registered content.
 */
export interface OpenWithoutContentConfig {
  /** Entry-point name used in the `[forty-cdk/<primitive>]` prefix (e.g. `'select'`). */
  readonly primitive: string;
  /** Selector of the content piece the open surface is missing (e.g. `'[forSelectContent]'`). */
  readonly piece: string;
  /**
   * The `@if` condition the primitive's README uses, quoted back as the fix
   * (e.g. `'select.open()'`). A thunk is resolved when the warning is built, so
   * a root whose open state is a value can quote the one that opened.
   */
  readonly condition: string | (() => string);
  /** The surface's open state. */
  readonly open: () => boolean;
  /** The registered content element, or `null` while none is mounted. */
  readonly content: () => HTMLElement | null;
}

/**
 * Warns — dev mode only, once per entry into the state — when a surface is still open after a
 * settled render with no content piece registered, which is the consumer leaving out the content
 * block or gating it on a condition that stays false.
 *
 * The state fails silently: the trigger reflects `aria-expanded="true"` and references a content id
 * no element carries, and Escape and outside presses are handled by the mounted surface, so nothing
 * but the trigger can close it again.
 *
 * The check runs in the `read` phase of the render that follows the open, after every content piece
 * that render mounted has registered from its constructor, so a correctly wired `@if` never reports.
 * Closing, or a content piece registering, re-arms it. A surface mounted only after that render, from
 * a `@defer` block inside the `@if`, reports once before it arrives.
 *
 * It is inert on the server, where `afterNextRender` never fires. Must be called from an injection
 * context. A production build creates no effect at all.
 */
export function warnIfOpenWithoutContent(config: OpenWithoutContentConfig): void {
  if (typeof ngDevMode !== 'undefined' && !ngDevMode) {
    return;
  }

  const injector = inject(Injector);
  let reported = false;
  effect(() => {
    if (!config.open() || config.content() !== null) {
      reported = false;
      return;
    }
    if (reported) {
      return;
    }
    untracked(() => {
      afterNextRender(
        {
          read: () => {
            if (reported || !config.open() || config.content() !== null) {
              return;
            }
            reported = true;
            const condition =
              typeof config.condition === 'function' ? config.condition() : config.condition;
            fortyWarn({
              code: 'FORCDK-CORE-014',
              scope: config.primitive,
              message: `The surface is open, but no ${config.piece} is mounted.`,
              cause:
                'The trigger already reflects the open state and references a content id no ' +
                'element carries, and Escape and outside presses are handled by the mounted ' +
                'surface, so only the trigger can close it again.',
              fix: `Render ${config.piece} inside \`@if (${condition})\`, with nothing else gating it. See the ${config.primitive} README.`,
            });
          },
        },
        { injector },
      );
    });
  });
}
