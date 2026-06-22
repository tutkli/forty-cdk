import { Component, inject, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { createDefaults } from './defaults';

interface SampleDefaults {
  delay: number;
  flag: boolean;
  label: string;
}

const FALLBACK: SampleDefaults = { delay: 100, flag: false, label: 'fallback' };

describe('createDefaults', () => {
  it('returns the fallback when no provider is configured', () => {
    const { token } = createDefaults<SampleDefaults>('SAMPLE_DEFAULTS', FALLBACK);
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const value = TestBed.runInInjectionContext(() => inject(token));
    expect(value).toEqual(FALLBACK);
  });

  it('applies partial overrides while inheriting unspecified keys from the fallback', () => {
    const { token, provideDefaults } = createDefaults<SampleDefaults>('SAMPLE_DEFAULTS', FALLBACK);
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideDefaults({ delay: 500 })],
    });
    const value = TestBed.runInInjectionContext(() => inject(token));
    expect(value).toEqual({ delay: 500, flag: false, label: 'fallback' });
  });

  it('child provider merges with the parent via SkipSelf — parent wins over fallback', () => {
    const { token, provideDefaults } = createDefaults<SampleDefaults>('SAMPLE_DEFAULTS', FALLBACK);

    @Component({
      template: '',
      providers: [provideDefaults({ delay: 800 })],
    })
    class Child {
      readonly value = inject(token);
    }

    TestBed.configureTestingModule({
      imports: [Child],
      providers: [
        provideZonelessChangeDetection(),
        provideDefaults({ delay: 200, flag: true, label: 'parent' }),
      ],
    });
    const fixture = TestBed.createComponent(Child);
    fixture.detectChanges();

    // delay overridden at child; flag + label inherited from parent (which won
    // over the library fallback).
    expect(fixture.componentInstance.value).toEqual({
      delay: 800,
      flag: true,
      label: 'parent',
    });
  });

  it('keeps a deliberate null override (only undefined means "key omitted")', () => {
    interface NullableDefaults {
      handler: (() => void) | null;
    }
    const fallbackHandler = (): void => {};
    const NULLABLE_FALLBACK: NullableDefaults = { handler: fallbackHandler };

    const { token, provideDefaults } = createDefaults<NullableDefaults>(
      'NULLABLE_DEFAULTS',
      NULLABLE_FALLBACK,
    );
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideDefaults({ handler: null })],
    });
    const value = TestBed.runInInjectionContext(() => inject(token));
    expect(value.handler).toBeNull();
  });

  it('inherits a deliberate null override from the parent scope', () => {
    interface NullableDefaults {
      handler: (() => void) | null;
    }
    const fallbackHandler = (): void => {};
    const NULLABLE_FALLBACK: NullableDefaults = { handler: fallbackHandler };

    const { token, provideDefaults } = createDefaults<NullableDefaults>(
      'NULLABLE_DEFAULTS',
      NULLABLE_FALLBACK,
    );

    @Component({
      template: '',
      providers: [provideDefaults()],
    })
    class Child {
      readonly value = inject(token);
    }

    TestBed.configureTestingModule({
      imports: [Child],
      providers: [provideZonelessChangeDetection(), provideDefaults({ handler: null })],
    });
    const fixture = TestBed.createComponent(Child);
    fixture.detectChanges();

    expect(fixture.componentInstance.value.handler).toBeNull();
  });

  it('skips undefined keys in overrides so they fall back to the parent', () => {
    const { token, provideDefaults } = createDefaults<SampleDefaults>('SAMPLE_DEFAULTS', FALLBACK);

    @Component({
      template: '',
      // Explicit `undefined` should not overwrite the parent-provided value.
      providers: [provideDefaults({ delay: undefined })],
    })
    class Child {
      readonly value = inject(token);
    }

    TestBed.configureTestingModule({
      imports: [Child],
      providers: [provideZonelessChangeDetection(), provideDefaults({ delay: 999 })],
    });
    const fixture = TestBed.createComponent(Child);
    fixture.detectChanges();

    expect(fixture.componentInstance.value.delay).toBe(999);
  });
});
