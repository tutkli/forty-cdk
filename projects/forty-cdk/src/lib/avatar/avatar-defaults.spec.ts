import { Component, inject, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  FOR_AVATAR_DEFAULTS,
  type ForAvatarDefaults,
  provideForAvatarDefaults,
} from './avatar-defaults';

const FALLBACK: ForAvatarDefaults = { fallbackDelayMs: 0 };

describe('provideForAvatarDefaults', () => {
  it('exposes the library FALLBACK at the root injector', () => {
    TestBed.configureTestingModule({});
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_AVATAR_DEFAULTS));
    expect(resolved).toEqual(FALLBACK);
  });

  it('runs under provideZonelessChangeDetection', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_AVATAR_DEFAULTS));
    expect(resolved).toEqual(FALLBACK);
  });

  it('overrides per-key, leaving unspecified keys at FALLBACK', () => {
    TestBed.configureTestingModule({
      providers: [provideForAvatarDefaults({ fallbackDelayMs: 500 })],
    });
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_AVATAR_DEFAULTS));
    expect(resolved).toEqual({ fallbackDelayMs: 500 });
  });

  it('layers component-scoped overrides on top of app-scoped overrides', () => {
    @Component({
      template: '',
      providers: [provideForAvatarDefaults({ fallbackDelayMs: 100 })],
    })
    class Inner {
      readonly resolved = inject(FOR_AVATAR_DEFAULTS);
    }

    TestBed.configureTestingModule({
      providers: [provideForAvatarDefaults({ fallbackDelayMs: 800 })],
    });
    const fixture = TestBed.createComponent(Inner);
    expect(fixture.componentInstance.resolved).toEqual({ fallbackDelayMs: 100 });
  });
});
