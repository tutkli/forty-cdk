import { Component, inject, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  FOR_RADIO_GROUP_DEFAULTS,
  type ForRadioGroupDefaults,
  provideForRadioGroupDefaults,
} from './radio-group-defaults';

const FALLBACK: ForRadioGroupDefaults = { loop: true };

describe('provideForRadioGroupDefaults', () => {
  it('exposes the library FALLBACK at the root injector', () => {
    TestBed.configureTestingModule({});
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_RADIO_GROUP_DEFAULTS));
    expect(resolved).toEqual(FALLBACK);
  });

  it('runs under provideZonelessChangeDetection', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_RADIO_GROUP_DEFAULTS));
    expect(resolved).toEqual(FALLBACK);
  });

  it('overrides per-key, leaving unspecified keys at FALLBACK', () => {
    TestBed.configureTestingModule({ providers: [provideForRadioGroupDefaults({ loop: false })] });
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_RADIO_GROUP_DEFAULTS));
    expect(resolved).toEqual({ loop: false });
  });

  it('layers component-scoped overrides on top of app-scoped overrides', () => {
    @Component({
      template: '',
      providers: [provideForRadioGroupDefaults({ loop: true })],
    })
    class Inner {
      readonly resolved = inject(FOR_RADIO_GROUP_DEFAULTS);
    }

    TestBed.configureTestingModule({
      providers: [provideForRadioGroupDefaults({ loop: false })],
    });
    const fixture = TestBed.createComponent(Inner);
    expect(fixture.componentInstance.resolved).toEqual({ loop: true });
  });
});
