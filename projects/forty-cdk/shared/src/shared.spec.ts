import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  NativeDateAdapter as CalendarNativeDateAdapter,
  provideNativeDateAdapter as calendarProvideNativeDateAdapter,
} from 'forty-cdk/calendar';
import * as core from 'forty-cdk/core';
import * as coreOverlay from 'forty-cdk/core-overlay';
import * as dateAdapter from 'forty-cdk/date-adapter';
import * as idSalt from 'forty-cdk/id-salt';
import * as shared from 'forty-cdk/shared';
import {
  accessibleTextContent,
  FOR_DATE_ADAPTER,
  injectDateAdapter,
  NativeDateAdapter,
  provideNativeDateAdapter,
} from 'forty-cdk/shared';

const SOURCES: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
  'forty-cdk/core': core,
  'forty-cdk/core-overlay': coreOverlay,
  'forty-cdk/date-adapter': dateAdapter,
  'forty-cdk/id-salt': idSalt,
};

describe('forty-cdk/shared', () => {
  it('re-exports every runtime value from the entry point that declares it', () => {
    const origins = Object.entries(shared).map(([name, value]) => ({
      name,
      from: Object.entries(SOURCES)
        .filter(([, source]) => Object.hasOwn(source, name) && source[name] === value)
        .map(([specifier]) => specifier),
    }));

    expect(origins).not.toEqual([]);
    expect(origins.filter(({ from }) => from.length !== 1)).toEqual([]);
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
