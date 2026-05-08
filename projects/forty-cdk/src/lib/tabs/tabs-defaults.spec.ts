import { Component, inject, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  FOR_TABS_DEFAULTS,
  type ForTabsDefaults,
  provideForTabsDefaults,
} from './tabs-defaults';

const FALLBACK: ForTabsDefaults = { activationMode: 'automatic', loop: true };

describe('provideForTabsDefaults', () => {
  it('exposes the library FALLBACK at the root injector', () => {
    TestBed.configureTestingModule({});
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_TABS_DEFAULTS));
    expect(resolved).toEqual(FALLBACK);
  });

  it('runs under provideZonelessChangeDetection', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_TABS_DEFAULTS));
    expect(resolved).toEqual(FALLBACK);
  });

  it('overrides per-key, leaving unspecified keys at FALLBACK', () => {
    TestBed.configureTestingModule({
      providers: [provideForTabsDefaults({ activationMode: 'manual' })],
    });
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_TABS_DEFAULTS));
    expect(resolved).toEqual({ activationMode: 'manual', loop: true });
  });

  it('layers component-scoped overrides on top of app-scoped overrides per key', () => {
    @Component({
      template: '',
      providers: [provideForTabsDefaults({ loop: true })],
    })
    class Inner {
      readonly resolved = inject(FOR_TABS_DEFAULTS);
    }

    // App-scoped sets BOTH keys; component-scoped overrides ONE — the other
    // must inherit the app-scoped value (verifies the SkipSelf merge chain).
    TestBed.configureTestingModule({
      providers: [provideForTabsDefaults({ activationMode: 'manual', loop: false })],
    });
    const fixture = TestBed.createComponent(Inner);
    expect(fixture.componentInstance.resolved).toEqual({
      activationMode: 'manual',
      loop: true,
    });
  });
});
