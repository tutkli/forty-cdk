import { Component, inject, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  FOR_CONTEXT_MENU_DEFAULTS,
  type ForContextMenuDefaults,
  provideForContextMenuDefaults,
} from './context-menu-defaults';

const FALLBACK: ForContextMenuDefaults = { sideOffset: 0, collisionPadding: 8 };

describe('provideForContextMenuDefaults', () => {
  it('exposes the library FALLBACK at the root injector', () => {
    TestBed.configureTestingModule({});
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_CONTEXT_MENU_DEFAULTS));
    expect(resolved).toEqual(FALLBACK);
  });

  it('runs under provideZonelessChangeDetection', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_CONTEXT_MENU_DEFAULTS));
    expect(resolved).toEqual(FALLBACK);
  });

  it('overrides per-key, leaving unspecified keys at FALLBACK', () => {
    TestBed.configureTestingModule({
      providers: [provideForContextMenuDefaults({ sideOffset: 5 })],
    });
    const resolved = TestBed.runInInjectionContext(() => inject(FOR_CONTEXT_MENU_DEFAULTS));
    expect(resolved).toEqual({ sideOffset: 5, collisionPadding: 8 });
  });

  it('layers component-scoped overrides on top of app-scoped overrides per key', () => {
    @Component({
      template: '',
      providers: [provideForContextMenuDefaults({ sideOffset: 10 })],
    })
    class Inner {
      readonly resolved = inject(FOR_CONTEXT_MENU_DEFAULTS);
    }

    TestBed.configureTestingModule({
      providers: [provideForContextMenuDefaults({ sideOffset: 0, collisionPadding: 32 })],
    });
    const fixture = TestBed.createComponent(Inner);
    expect(fixture.componentInstance.resolved).toEqual({ sideOffset: 10, collisionPadding: 32 });
  });
});
