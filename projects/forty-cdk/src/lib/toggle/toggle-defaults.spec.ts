import { Component, inject, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  FOR_TOGGLE_DEFAULTS,
  type ForToggleDefaults,
  provideForToggleDefaults,
} from './toggle-defaults';

const FALLBACK: ForToggleDefaults = { loop: true };

describe('provideForToggleDefaults', () => {
  it('exposes the library FALLBACK at the root injector', () => {
    TestBed.configureTestingModule({});
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_TOGGLE_DEFAULTS));
    expect(resolved).toEqual(FALLBACK);
  });

  it('runs under provideZonelessChangeDetection', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_TOGGLE_DEFAULTS));
    expect(resolved).toEqual(FALLBACK);
  });

  it('overrides per-key, leaving unspecified keys at FALLBACK', () => {
    TestBed.configureTestingModule({ providers: [provideForToggleDefaults({ loop: false })] });
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_TOGGLE_DEFAULTS));
    expect(resolved).toEqual({ loop: false });
  });

  it('layers component-scoped overrides on top of app-scoped overrides', () => {
    @Component({
      template: '',
      providers: [provideForToggleDefaults({ loop: true })],
    })
    class Inner {
      readonly resolved = inject(FOR_TOGGLE_DEFAULTS);
    }

    TestBed.configureTestingModule({
      providers: [provideForToggleDefaults({ loop: false })],
    });
    const fixture = TestBed.createComponent(Inner);
    expect(fixture.componentInstance.resolved).toEqual({ loop: true });
  });
});
