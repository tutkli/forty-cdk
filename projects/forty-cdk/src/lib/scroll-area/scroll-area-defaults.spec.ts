import { Component, inject, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  FOR_SCROLL_AREA_DEFAULTS,
  type ForScrollAreaDefaults,
  provideForScrollAreaDefaults,
} from './scroll-area-defaults';

const FALLBACK: ForScrollAreaDefaults = { scrollHideDelay: 600 };

describe('provideForScrollAreaDefaults', () => {
  it('exposes the library FALLBACK at the root injector', () => {
    TestBed.configureTestingModule({});
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_SCROLL_AREA_DEFAULTS));
    expect(resolved).toEqual(FALLBACK);
  });

  it('runs under provideZonelessChangeDetection', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_SCROLL_AREA_DEFAULTS));
    expect(resolved).toEqual(FALLBACK);
  });

  it('overrides per-key, leaving unspecified keys at FALLBACK', () => {
    TestBed.configureTestingModule({
      providers: [provideForScrollAreaDefaults({ scrollHideDelay: 1500 })],
    });
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_SCROLL_AREA_DEFAULTS));
    expect(resolved).toEqual({ scrollHideDelay: 1500 });
  });

  it('layers component-scoped overrides on top of app-scoped overrides', () => {
    @Component({
      template: '',
      providers: [provideForScrollAreaDefaults({ scrollHideDelay: 200 })],
    })
    class Inner {
      readonly resolved = inject(FOR_SCROLL_AREA_DEFAULTS);
    }

    TestBed.configureTestingModule({
      providers: [provideForScrollAreaDefaults({ scrollHideDelay: 1000 })],
    });
    const fixture = TestBed.createComponent(Inner);
    expect(fixture.componentInstance.resolved).toEqual({ scrollHideDelay: 200 });
  });
});
