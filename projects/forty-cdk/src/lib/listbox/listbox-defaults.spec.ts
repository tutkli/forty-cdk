import { Component, inject, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  FOR_LISTBOX_DEFAULTS,
  type ForListboxDefaults,
  provideForListboxDefaults,
} from './listbox-defaults';

const FALLBACK: ForListboxDefaults = { selectionFollowsFocus: false };

describe('provideForListboxDefaults', () => {
  it('exposes the library FALLBACK at the root injector', () => {
    TestBed.configureTestingModule({});
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_LISTBOX_DEFAULTS));
    expect(resolved).toEqual(FALLBACK);
  });

  it('runs under provideZonelessChangeDetection', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_LISTBOX_DEFAULTS));
    expect(resolved).toEqual(FALLBACK);
  });

  it('overrides per-key, leaving unspecified keys at FALLBACK', () => {
    TestBed.configureTestingModule({
      providers: [provideForListboxDefaults({ selectionFollowsFocus: true })],
    });
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_LISTBOX_DEFAULTS));
    expect(resolved).toEqual({ selectionFollowsFocus: true });
  });

  it('layers component-scoped overrides on top of app-scoped overrides', () => {
    @Component({
      template: '',
      providers: [provideForListboxDefaults({ selectionFollowsFocus: false })],
    })
    class Inner {
      readonly resolved = inject(FOR_LISTBOX_DEFAULTS);
    }

    TestBed.configureTestingModule({
      providers: [provideForListboxDefaults({ selectionFollowsFocus: true })],
    });
    const fixture = TestBed.createComponent(Inner);
    expect(fixture.componentInstance.resolved).toEqual({ selectionFollowsFocus: false });
  });
});
