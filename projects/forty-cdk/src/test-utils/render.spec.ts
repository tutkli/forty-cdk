/**
 * Permanent guard for the suite-wide zoneless invariant.
 *
 * `renderHost` configures every fixture with `provideZonelessChangeDetection()`,
 * so the whole Vitest suite already runs zoneless. Before
 * [#1595](https://github.com/tutkli/forty-cdk/issues/1595) that guarantee was
 * "asserted" by 84 per-primitive `describe('zoneless reactivity')` blocks which
 * could not fail for a zoneless-specific reason — there is no zone-based
 * configuration in the suite to contrast against, so every one of them would
 * have passed under any other title. This file is where the invariant is
 * actually pinned; the primitive specs keep their behavioural assertions under
 * titles that name what they verify.
 *
 * The two cases below fail on different changes, and neither subsumes the other:
 *
 * 1. **The provider is present.** `ɵPROVIDED_ZONELESS` defaults to `false` and
 *    is set only by the public `provideZonelessChangeDetection()`, so dropping
 *    the call from `renderHost` fails this case and nothing else — `TestBed`
 *    base-provides `provideZonelessChangeDetectionInternal()` on its own, which
 *    is why the behavioural case below stays green without it. Mind the
 *    asymmetry inside that first clause: the `false` default is unconditional,
 *    which is what makes the assertion discriminate, but the provider that
 *    flips it is added only under `ngDevMode`. Vitest runs dev mode, so it
 *    reads `true` here; a case that stubbed `ngDevMode` to `false` to exercise
 *    a production path would read the default and fail for a reason that is not
 *    this invariant. `ɵZONELESS_ENABLED` is the flag Angular's own scheduler
 *    reads to decide it must not depend on `NgZone`; asserting it here is how
 *    the fixture states it has no `NgZone`-backed scheduler, without importing
 *    the banned symbol.
 * 2. **The behaviour that guarantee buys.** A post-mount signal write reaches
 *    the DOM after a bare macrotask hop, with no `detectChanges()` and no
 *    `flush()` — the render is driven by the signal graph alone. This is the
 *    case that breaks if a future Angular flips the `TestBed` default back to
 *    zone-based change detection, or if a stray `provideZoneChangeDetection()`
 *    ever wins over the scheduler: with no Zone.js in the workspace at all, a
 *    zone-backed fixture cannot render.
 *
 * A spec that bypasses `renderHost` and builds its own `TestBed` is outside
 * this guard and must provide zoneless change detection itself.
 */
import { Component, signal, ɵPROVIDED_ZONELESS, ɵZONELESS_ENABLED } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { nextMacrotask } from './flush';
import { renderHost } from './render';

@Component({
  template: `<p data-testid="probe">{{ label() }}</p>`,
})
class ProbeHost {
  readonly label = signal('before');
}

describe('renderHost — zoneless invariant', () => {
  it('configures the fixture with provideZonelessChangeDetection()', () => {
    renderHost(ProbeHost);

    expect(TestBed.inject(ɵPROVIDED_ZONELESS)).toBe(true);
    expect(TestBed.inject(ɵZONELESS_ENABLED)).toBe(true);
  });

  it('renders a post-mount signal write with no detectChanges of its own', async () => {
    const { el, instance } = renderHost(ProbeHost);
    const probe = el.querySelector('[data-testid="probe"]')!;
    expect(probe.textContent).toBe('before');

    instance.label.set('after');
    await nextMacrotask();

    expect(probe.textContent).toBe('after');
  });
});
