import { Component, inject, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  FOR_SLIDER_DEFAULTS,
  type ForSliderDefaults,
  provideForSliderDefaults,
} from './slider-defaults';

const FALLBACK: ForSliderDefaults = { largeStep: 10 };

describe('provideForSliderDefaults', () => {
  it('exposes the library FALLBACK at the root injector', () => {
    TestBed.configureTestingModule({});
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_SLIDER_DEFAULTS));
    expect(resolved).toEqual(FALLBACK);
  });

  it('runs under provideZonelessChangeDetection', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_SLIDER_DEFAULTS));
    expect(resolved).toEqual(FALLBACK);
  });

  it('overrides per-key, leaving unspecified keys at FALLBACK', () => {
    TestBed.configureTestingModule({ providers: [provideForSliderDefaults({ largeStep: 25 })] });
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_SLIDER_DEFAULTS));
    expect(resolved).toEqual({ largeStep: 25 });
  });

  it('layers component-scoped overrides on top of app-scoped overrides', () => {
    @Component({
      template: '',
      providers: [provideForSliderDefaults({ largeStep: 5 })],
    })
    class Inner {
      readonly resolved = inject(FOR_SLIDER_DEFAULTS);
    }

    TestBed.configureTestingModule({
      providers: [provideForSliderDefaults({ largeStep: 50 })],
    });
    const fixture = TestBed.createComponent(Inner);
    expect(fixture.componentInstance.resolved).toEqual({ largeStep: 5 });
  });
});
