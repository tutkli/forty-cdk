import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush } from './flush';

/**
 * The guard that turns a drain requested after teardown into a failing test
 * ([#1963](https://github.com/tutkli/forty-cdk/issues/1963)).
 *
 * `ApplicationRef.tick()` declines on a destroyed ref and warns on the channel
 * Vitest's default reporter suppresses, so the `await` used to resolve having
 * rendered nothing and every assertion after it ran against whatever DOM was
 * left. Four such drains sat green in `scroll-area.spec.ts`, all of them the
 * body of an `expect(async () => …).not.toThrow()` — a wrapper that never
 * awaits its callback, so each drain resumed inside a later test.
 *
 * The live case is what keeps the other one from passing for the wrong reason:
 * a guard that threw unconditionally would satisfy it.
 *
 * Tearing the `TestBed` down is the only reproducible way into the refusal, and
 * it is also the way the suite gets there: destroying the `ApplicationRef`
 * directly leaves Angular's own `resetTestingModule` injecting into the
 * environment injector it just took with it, so the `afterEach` fails before a
 * drain is ever requested.
 */
@Component({
  template: `<p data-testid="probe">{{ label() }}</p>`,
  host: { 'data-fixture': 'flush-probe' },
})
class FlushProbeHost {
  readonly label = signal('before');
}

function mount() {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  return TestBed.createComponent(FlushProbeHost);
}

describe('flush — destroyed ApplicationRef guard', () => {
  it('drains a live fixture, rendering a signal write', async () => {
    const fixture = mount();
    await flush(fixture);
    const probe = fixture.nativeElement.querySelector('[data-testid="probe"]') as HTMLElement;
    expect(probe.textContent).toBe('before');

    fixture.componentInstance.label.set('after');
    await flush(fixture);

    expect(probe.textContent).toBe('after');
  });

  it('refuses a drain requested after the TestBed tore the fixture down', async () => {
    const fixture = mount();
    await flush(fixture);

    TestBed.resetTestingModule();

    await expect(flush(fixture)).rejects.toThrow('[forty-cdk/test-utils] flush:');
  });
});
