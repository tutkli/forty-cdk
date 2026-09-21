import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { assertNoAngularDiagnostics } from './angular-diagnostics';

/**
 * Liveness probe for the component-ID shape: the two fixtures below differ
 * only in their text nodes, so they hash to the same component id and the
 * guard must throw naming both. A run where the recorder stopped detecting
 * fails here instead of passing everywhere.
 */
@Component({
  template: `<p>one</p>`,
})
class CollidingProbeOneHost {}

@Component({
  template: `<p>two</p>`,
})
class CollidingProbeTwoHost {}

describe('component-ID collision guard', () => {
  it('fails on a deliberately colliding pair of fixtures, and drains it', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    TestBed.createComponent(CollidingProbeOneHost);
    TestBed.createComponent(CollidingProbeTwoHost);

    expect(() => assertNoAngularDiagnostics()).toThrowError(
      /NG0912.*CollidingProbeOneHost.*CollidingProbeTwoHost/,
    );
    expect(() => assertNoAngularDiagnostics()).not.toThrow();
  });
});
