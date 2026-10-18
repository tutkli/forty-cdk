import { Component, DestroyRef, inject } from '@angular/core';

import { renderHost } from './render';

/**
 * Liveness probe for a diagnostic raised while the builder's `TestBed`
 * teardown destroys a fixture, after every hook a spec or setup file
 * registers with `afterEach` has already run.
 *
 * The test passes only by failing: with the drain placed before that
 * teardown, the diagnostic would be reported by whichever test drains next,
 * or by none, and this test would pass.
 */
@Component({
  template: '',
  host: { 'data-fixture': 'teardown-diagnostic-probe' },
})
class TeardownDiagnosticProbeHost {
  constructor() {
    inject(DestroyRef).onDestroy(() => console.warn('NG9999: emitted from teardown'));
  }
}

describe('teardown diagnostic guard', () => {
  it.fails('fails the test whose fixture emits a diagnostic while being torn down', () => {
    renderHost(TeardownDiagnosticProbeHost);
  });
});
