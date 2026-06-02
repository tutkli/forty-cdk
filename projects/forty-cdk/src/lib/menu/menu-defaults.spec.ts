import { Component, inject, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { FOR_MENU_DEFAULTS, type ForMenuDefaults, provideForMenuDefaults } from './menu-defaults';

const FALLBACK: ForMenuDefaults = {
  subMenuOpenDelay: 100,
  subMenuCloseDelay: 100,
  subMenuPointerGraceDuration: 300,
};

describe('provideForMenuDefaults', () => {
  it('exposes the library FALLBACK at the root injector', () => {
    TestBed.configureTestingModule({});
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_MENU_DEFAULTS));
    expect(resolved).toEqual(FALLBACK);
  });

  it('runs under provideZonelessChangeDetection', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_MENU_DEFAULTS));
    expect(resolved).toEqual(FALLBACK);
  });

  it('overrides per-key, leaving unspecified keys at FALLBACK', () => {
    TestBed.configureTestingModule({
      providers: [provideForMenuDefaults({ subMenuOpenDelay: 250 })],
    });
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_MENU_DEFAULTS));
    expect(resolved).toEqual({
      subMenuOpenDelay: 250,
      subMenuCloseDelay: 100,
      subMenuPointerGraceDuration: 300,
    });
  });

  it('layers component-scoped overrides on top of app-scoped overrides per key', () => {
    @Component({
      template: '',
      providers: [provideForMenuDefaults({ subMenuOpenDelay: 50 })],
    })
    class Inner {
      readonly resolved = inject(FOR_MENU_DEFAULTS);
    }

    TestBed.configureTestingModule({
      providers: [provideForMenuDefaults({ subMenuOpenDelay: 200, subMenuCloseDelay: 400 })],
    });
    const fixture = TestBed.createComponent(Inner);
    expect(fixture.componentInstance.resolved).toEqual({
      subMenuOpenDelay: 50,
      subMenuCloseDelay: 400,
      subMenuPointerGraceDuration: 300,
    });
  });
});
