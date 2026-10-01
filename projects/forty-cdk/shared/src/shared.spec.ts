import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  NativeDateAdapter as CalendarNativeDateAdapter,
  provideNativeDateAdapter as calendarProvideNativeDateAdapter,
} from 'forty-cdk/calendar';
import {
  accessibleTextContent as coreAccessibleTextContent,
  assertTimeCapable as coreAssertTimeCapable,
  FOR_FIELDSET_CONTEXT as CORE_FOR_FIELDSET_CONTEXT,
  injectDateAdapter as coreInjectDateAdapter,
} from 'forty-cdk/core';
import { FOR_MENU_CONTEXT as CORE_FOR_MENU_CONTEXT } from 'forty-cdk/core-overlay';
import {
  accessibleTextContent,
  assertTimeCapable,
  FOR_DATE_ADAPTER,
  FOR_FIELDSET_CONTEXT,
  FOR_MENU_CONTEXT,
  injectDateAdapter,
  NativeDateAdapter,
  provideNativeDateAdapter,
} from 'forty-cdk/shared';

describe('forty-cdk/shared', () => {
  it('re-exports the core runtime values rather than redeclaring them', () => {
    expect(FOR_FIELDSET_CONTEXT).toBe(CORE_FOR_FIELDSET_CONTEXT);
    expect(FOR_MENU_CONTEXT).toBe(CORE_FOR_MENU_CONTEXT);
    expect(assertTimeCapable).toBe(coreAssertTimeCapable);
    expect(injectDateAdapter).toBe(coreInjectDateAdapter);
    expect(accessibleTextContent).toBe(coreAccessibleTextContent);
  });

  it('derives the same accessible text the primitives match on', () => {
    const host = document.createElement('div');
    host.innerHTML = '<span aria-hidden="true">✓</span>Apple';

    expect(accessibleTextContent(host).trim()).toBe('Apple');
  });

  it('publishes the native adapter forty-cdk/calendar re-exports, as one object', () => {
    expect(CalendarNativeDateAdapter).toBe(NativeDateAdapter);
    expect(calendarProvideNativeDateAdapter).toBe(provideNativeDateAdapter);
  });

  it('resolves the token the native adapter provider binds', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ...provideNativeDateAdapter()],
    });

    expect(TestBed.inject(FOR_DATE_ADAPTER)).toBeInstanceOf(NativeDateAdapter);
    expect(TestBed.runInInjectionContext(() => injectDateAdapter<Date>('spec'))).toBeInstanceOf(
      NativeDateAdapter,
    );
  });
});
