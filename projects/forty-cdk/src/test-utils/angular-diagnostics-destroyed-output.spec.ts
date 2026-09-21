import { Component, output, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { assertNoAngularDiagnostics } from './angular-diagnostics';

/**
 * Liveness probe for a diagnostic raised from inside a running test, which
 * its definition-time sibling cannot reach.
 *
 * Its own file because the record is shared: two deliberate emissions in one
 * file would drain each other depending on which test ran first.
 */
@Component({
  template: '',
  host: { 'data-fixture': 'destroyed-output-probe' },
})
class DestroyedOutputProbeHost {
  readonly probe = output<void>();
}

describe('destroyed-output emit guard', () => {
  it('fails on an emit into a destroyed OutputRef, and drains it', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(DestroyedOutputProbeHost);
    const { probe } = fixture.componentInstance;
    fixture.destroy();

    probe.emit();

    expect(() => assertNoAngularDiagnostics()).toThrowError(/NG0953/);
    expect(() => assertNoAngularDiagnostics()).not.toThrow();
  });
});
