import { Directive, input } from '@angular/core';

import type { ForDrawerDefaults } from 'forty-cdk/defaults';

/**
 * @internal Carries the defaults `ForDrawerManager.open()` resolved from its
 * caller's scope onto the `[forDrawer]` the outlet stamps, so the tunables that
 * are not inputs (the scale and nested keys) follow that scope too. Not
 * exported from `public-api.ts`.
 */
@Directive({ selector: '[forDrawerScopeTuning]' })
export class ForDrawerScopeTuning {
  /** Defaults resolved for this drawer's `open()` call. */
  readonly defaults = input.required<ForDrawerDefaults>({ alias: 'forDrawerScopeTuning' });
}
