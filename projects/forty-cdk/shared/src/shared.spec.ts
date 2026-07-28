import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { NativeDateAdapter, provideNativeDateAdapter } from 'forty-cdk/calendar';
import {
  accessibleTextContent as coreAccessibleTextContent,
  assertTimeCapable as coreAssertTimeCapable,
  FOR_DATE_ADAPTER as CORE_FOR_DATE_ADAPTER,
  FOR_FIELDSET_CONTEXT as CORE_FOR_FIELDSET_CONTEXT,
  FOR_MENU_CONTEXT as CORE_FOR_MENU_CONTEXT,
  injectDateAdapter as coreInjectDateAdapter,
} from 'forty-cdk/core';
import {
  accessibleTextContent,
  assertTimeCapable,
  FOR_DATE_ADAPTER,
  FOR_FIELDSET_CONTEXT,
  FOR_MENU_CONTEXT,
  injectDateAdapter,
} from 'forty-cdk/shared';

describe('forty-cdk/shared', () => {
  it('re-exports the core runtime values rather than redeclaring them', () => {
    expect(FOR_DATE_ADAPTER).toBe(CORE_FOR_DATE_ADAPTER);
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

  it('resolves a token provided through a primitive entry point', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ...provideNativeDateAdapter()],
    });

    expect(TestBed.inject(FOR_DATE_ADAPTER)).toBeInstanceOf(NativeDateAdapter);
    expect(TestBed.runInInjectionContext(() => injectDateAdapter<Date>('spec'))).toBeInstanceOf(
      NativeDateAdapter,
    );
  });
});
