import { Component, inject, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  FOR_SELECT_DEFAULTS,
  type ForSelectDefaults,
  provideForSelectDefaults,
} from './select-defaults';

const FALLBACK: ForSelectDefaults = { sideOffset: 4, collisionPadding: 8 };

describe('provideForSelectDefaults', () => {
  it('exposes the library FALLBACK at the root injector', () => {
    TestBed.configureTestingModule({});
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_SELECT_DEFAULTS));
    expect(resolved).toEqual(FALLBACK);
  });

  it('runs under provideZonelessChangeDetection', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_SELECT_DEFAULTS));
    expect(resolved).toEqual(FALLBACK);
  });

  it('overrides per-key, leaving unspecified keys at FALLBACK', () => {
    TestBed.configureTestingModule({
      providers: [provideForSelectDefaults({ sideOffset: 12 })],
    });
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_SELECT_DEFAULTS));
    expect(resolved).toEqual({ sideOffset: 12, collisionPadding: 8 });
  });

  it('layers component-scoped overrides on top of app-scoped overrides per key', () => {
    @Component({
      template: '',
      providers: [provideForSelectDefaults({ sideOffset: 16 })],
    })
    class Inner {
      readonly resolved = inject(FOR_SELECT_DEFAULTS);
    }

    TestBed.configureTestingModule({
      providers: [provideForSelectDefaults({ sideOffset: 4, collisionPadding: 24 })],
    });
    const fixture = TestBed.createComponent(Inner);
    expect(fixture.componentInstance.resolved).toEqual({ sideOffset: 16, collisionPadding: 24 });
  });
});
