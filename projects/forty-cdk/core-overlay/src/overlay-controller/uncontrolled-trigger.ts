import { effect, isDevMode, type Signal } from '@angular/core';

/** The trigger state the dev-mode missing-`[controls]` warning watches, and the warning itself. */
export interface UncontrolledTriggerConfig {
  /** The trigger's open state. */
  readonly open: Signal<boolean>;
  /** The id the trigger mirrors to `aria-controls`, or `null` when unset. */
  readonly controls: Signal<string | null>;
  /** Emits the primitive's own `fortyWarn`, so each primitive keeps its own code. */
  readonly warn: () => void;
}

/**
 * Warns — dev mode only — when a trigger that mirrors `[controls]` to `aria-controls` opens while
 * `controls` is unset, so the missing relationship is visible during development.
 *
 * It warns once per entry into that state: reopening without `controls` stays silent, and setting
 * then clearing it warns again. Must be called from an injection context. A production build
 * creates no effect at all.
 */
export function warnIfOpenWithoutControls(config: UncontrolledTriggerConfig): void {
  if (!isDevMode()) {
    return;
  }
  let warned = false;
  effect(() => {
    if (config.controls() !== null) {
      warned = false;
    } else if (config.open() && !warned) {
      warned = true;
      config.warn();
    }
  });
}
