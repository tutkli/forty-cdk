import { Component, output, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { assertNoDestroyedOutputEmits } from './destroyed-output-emits';

/**
 * The liveness probe for the guard armed in `vitest-invariants-setup.ts`.
 *
 * Its whole detection power is one `console.warn` patch over a string Angular
 * emits from dev-mode-only code, and every way it can stop working is silent:
 * the patch overwritten by another one installed later, the message reworded,
 * `ngDevMode` off. None of those turn a run red — they turn every dropped emit
 * green, which is the hum the guard exists to replace.
 *
 * So the probe emits into a destroyed output on purpose. Draining is the second
 * half: the assertion clears the record as it throws, so the deliberate emit is
 * spent inside this test and the setup file's own call sees nothing.
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

    expect(() => assertNoDestroyedOutputEmits()).toThrowError(/NG0953/);
    expect(() => assertNoDestroyedOutputEmits()).not.toThrow();
  });
});
