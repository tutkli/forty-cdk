import { Component, InjectionToken, inject, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideDefaults } from './defaults';

interface SampleDefaults {
  delay: number;
  flag: boolean;
  label: string;
}

const FALLBACK: SampleDefaults = { delay: 100, flag: false, label: 'fallback' };

function defaultsPair<D extends object>(
  name: string,
  fallback: D,
): {
  token: InjectionToken<D>;
  provide: (overrides?: Partial<D> | (() => Partial<D>)) => ReturnType<typeof provideDefaults>;
} {
  const token = new InjectionToken<D>(name, { providedIn: 'root', factory: () => fallback });
  return { token, provide: (overrides) => provideDefaults(token, fallback, overrides) };
}

describe('provideDefaults', () => {
  it('returns the fallback when no provider is configured', () => {
    const { token } = defaultsPair<SampleDefaults>('SAMPLE_DEFAULTS', FALLBACK);
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const value = TestBed.runInInjectionContext(() => inject(token));
    expect(value).toEqual(FALLBACK);
  });

  it('applies partial overrides while inheriting unspecified keys from the fallback', () => {
    const { token, provide } = defaultsPair<SampleDefaults>('SAMPLE_DEFAULTS', FALLBACK);
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provide({ delay: 500 })],
    });
    const value = TestBed.runInInjectionContext(() => inject(token));
    expect(value).toEqual({ delay: 500, flag: false, label: 'fallback' });
  });

  it('child provider merges with the parent via SkipSelf — parent wins over fallback', () => {
    const { token, provide } = defaultsPair<SampleDefaults>('SAMPLE_DEFAULTS', FALLBACK);

    @Component({
      template: '',
      providers: [provide({ delay: 800 })],
    })
    class Child {
      readonly value = inject(token);
    }

    TestBed.configureTestingModule({
      imports: [Child],
      providers: [
        provideZonelessChangeDetection(),
        provide({ delay: 200, flag: true, label: 'parent' }),
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

    const { token, provide } = defaultsPair<NullableDefaults>(
      'NULLABLE_DEFAULTS',
      NULLABLE_FALLBACK,
    );
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provide({ handler: null })],
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

    const { token, provide } = defaultsPair<NullableDefaults>(
      'NULLABLE_DEFAULTS',
      NULLABLE_FALLBACK,
    );

    @Component({
      template: '',
      providers: [provide()],
    })
    class Child {
      readonly value = inject(token);
    }

    TestBed.configureTestingModule({
      imports: [Child],
      providers: [provideZonelessChangeDetection(), provide({ handler: null })],
    });
    const fixture = TestBed.createComponent(Child);
    fixture.detectChanges();

    expect(fixture.componentInstance.value.handler).toBeNull();
  });

  it('builds the overrides from a factory that can inject()', () => {
    const LABEL = new InjectionToken<string>('LABEL');
    const { token, provide } = defaultsPair<SampleDefaults>('SAMPLE_DEFAULTS', FALLBACK);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: LABEL, useValue: 'injected' },
        provide(() => ({ label: inject(LABEL) })),
      ],
    });
    const value = TestBed.runInInjectionContext(() => inject(token));
    expect(value).toEqual({ delay: 100, flag: false, label: 'injected' });
  });

  it('merges a factory child over its parent exactly like an object child', () => {
    const { token, provide } = defaultsPair<SampleDefaults>('SAMPLE_DEFAULTS', FALLBACK);

    @Component({
      template: '',
      providers: [provide(() => ({ delay: 800, flag: undefined }))],
    })
    class Child {
      readonly value = inject(token);
    }

    TestBed.configureTestingModule({
      imports: [Child],
      providers: [
        provideZonelessChangeDetection(),
        provide({ delay: 200, flag: true, label: 'parent' }),
      ],
    });
    const fixture = TestBed.createComponent(Child);
    fixture.detectChanges();

    expect(fixture.componentInstance.value).toEqual({ delay: 800, flag: true, label: 'parent' });
  });

  it('calls the factory once per injector that resolves the token', () => {
    const { token, provide } = defaultsPair<SampleDefaults>('SAMPLE_DEFAULTS', FALLBACK);
    const factory = vi.fn(() => ({ delay: 1 }));
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provide(factory)],
    });

    TestBed.runInInjectionContext(() => inject(token));
    TestBed.runInInjectionContext(() => inject(token));

    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('skips undefined keys in overrides so they fall back to the parent', () => {
    const { token, provide } = defaultsPair<SampleDefaults>('SAMPLE_DEFAULTS', FALLBACK);

    @Component({
      template: '',
      // Explicit `undefined` should not overwrite the parent-provided value.
      providers: [provide({ delay: undefined })],
    })
    class Child {
      readonly value = inject(token);
    }

    TestBed.configureTestingModule({
      imports: [Child],
      providers: [provideZonelessChangeDetection(), provide({ delay: 999 })],
    });
    const fixture = TestBed.createComponent(Child);
    fixture.detectChanges();

    expect(fixture.componentInstance.value.delay).toBe(999);
  });
});
