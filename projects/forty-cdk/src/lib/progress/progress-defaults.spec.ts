import { Component, inject, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  FOR_PROGRESS_DEFAULTS,
  type ForProgressDefaults,
  provideForProgressDefaults,
} from './progress-defaults';

const FALLBACK: ForProgressDefaults = { announceCompletion: false };

describe('provideForProgressDefaults', () => {
  it('exposes the library FALLBACK at the root injector', () => {
    TestBed.configureTestingModule({});
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_PROGRESS_DEFAULTS));
    expect(resolved).toEqual(FALLBACK);
  });

  it('runs under provideZonelessChangeDetection', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_PROGRESS_DEFAULTS));
    expect(resolved).toEqual(FALLBACK);
  });

  it('overrides per-key, leaving unspecified keys at FALLBACK', () => {
    TestBed.configureTestingModule({
      providers: [provideForProgressDefaults({ announceCompletion: true })],
    });
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_PROGRESS_DEFAULTS));
    expect(resolved).toEqual({ announceCompletion: true });
  });

  it('layers component-scoped overrides on top of app-scoped overrides', () => {
    @Component({
      template: '',
      providers: [provideForProgressDefaults({ announceCompletion: false })],
    })
    class Inner {
      readonly resolved = inject(FOR_PROGRESS_DEFAULTS);
    }

    TestBed.configureTestingModule({
      providers: [provideForProgressDefaults({ announceCompletion: true })],
    });
    const fixture = TestBed.createComponent(Inner);
    expect(fixture.componentInstance.resolved).toEqual({ announceCompletion: false });
  });
});
