import { inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/**
 * Read a `?<name>=1` boolean flag from the route's query map. Used by fixtures
 * to wire test-time toggles (vetoOpen, vetoClose, disabled, …) without forcing
 * the Playwright spec to interact with checkboxes before the scenario.
 */
export function queryFlag(name: string): boolean {
  const route = inject(ActivatedRoute);
  return route.snapshot.queryParamMap.get(name) === '1';
}
