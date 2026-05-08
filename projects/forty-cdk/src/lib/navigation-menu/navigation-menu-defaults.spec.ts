import { Component, inject, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  FOR_NAVIGATION_MENU_DEFAULTS,
  type ForNavigationMenuDefaults,
  provideForNavigationMenuDefaults,
} from './navigation-menu-defaults';

const FALLBACK: ForNavigationMenuDefaults = {
  delayDuration: 200,
  closeDelay: 150,
  skipDelayDuration: 300,
};

describe('provideForNavigationMenuDefaults', () => {
  it('exposes the library FALLBACK at the root injector', () => {
    TestBed.configureTestingModule({});
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_NAVIGATION_MENU_DEFAULTS));
    expect(resolved).toEqual(FALLBACK);
  });

  it('runs under provideZonelessChangeDetection', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_NAVIGATION_MENU_DEFAULTS));
    expect(resolved).toEqual(FALLBACK);
  });

  it('overrides per-key, leaving unspecified keys at FALLBACK', () => {
    TestBed.configureTestingModule({
      providers: [provideForNavigationMenuDefaults({ delayDuration: 0 })],
    });
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_NAVIGATION_MENU_DEFAULTS));
    expect(resolved).toEqual({ delayDuration: 0, closeDelay: 150, skipDelayDuration: 300 });
  });

  it('layers component-scoped overrides on top of app-scoped overrides per key', () => {
    @Component({
      template: '',
      providers: [provideForNavigationMenuDefaults({ delayDuration: 50 })],
    })
    class Inner {
      readonly resolved = inject(FOR_NAVIGATION_MENU_DEFAULTS);
    }

    // App sets all 3, component overrides ONE. The other two must inherit
    // the app-scoped values (verifies the SkipSelf merge chain).
    TestBed.configureTestingModule({
      providers: [
        provideForNavigationMenuDefaults({
          delayDuration: 500,
          closeDelay: 400,
          skipDelayDuration: 0,
        }),
      ],
    });
    const fixture = TestBed.createComponent(Inner);
    expect(fixture.componentInstance.resolved).toEqual({
      delayDuration: 50,
      closeDelay: 400,
      skipDelayDuration: 0,
    });
  });
});
