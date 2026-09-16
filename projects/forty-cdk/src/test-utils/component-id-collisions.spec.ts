import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { assertNoComponentIdCollisions } from './component-id-collisions';

/**
 * The liveness probe for the guard armed in `vitest-invariants-setup.ts`.
 *
 * The guard's whole detection power is one `console.warn` patch over a string
 * Angular emits from dev-mode-only code, and every way it can stop working is
 * silent: the patch installed after the spec module imported, the message
 * reworded, the emission moved behind a different channel, `ngDevMode` off.
 * None of those turn a run red — they turn every collision green, which is
 * worse than the hum the guard replaces, because a repo with a guard stops
 * looking.
 *
 * So the probe collides on purpose. The two fixtures below differ only in their
 * text nodes, which live in the template function rather than in `consts`, so
 * they are the same shape and hash to the same id. A run where the guard has
 * stopped detecting fails here instead of passing everywhere.
 *
 * Draining is the second half: `assertNoComponentIdCollisions` clears the
 * record as it throws, so the deliberate collision is spent inside this test
 * and the setup file's own call — which runs after it — sees nothing.
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

    expect(() => assertNoComponentIdCollisions()).toThrowError(
      /CollidingProbeOneHost.*CollidingProbeTwoHost/,
    );
    expect(() => assertNoComponentIdCollisions()).not.toThrow();
  });
});
