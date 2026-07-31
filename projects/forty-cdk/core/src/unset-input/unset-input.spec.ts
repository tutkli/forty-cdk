import {
  Component,
  computed,
  Directive,
  ErrorHandler,
  input,
  provideZonelessChangeDetection,
  type Signal,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush } from '../../../src/test-utils';
import { assertInputBound, isUnset, unsetInput } from './unset-input';

describe('unsetInput', () => {
  it('is distinguishable from every ordinary value a consumer may bind', () => {
    expect(isUnset(unsetInput<unknown>())).toBe(true);
    for (const value of [null, undefined, '', 0, NaN, false, Symbol('other'), {}, []]) {
      expect(isUnset(value)).toBe(false);
    }
  });

  it('is one sentinel across call sites regardless of the type argument', () => {
    expect(isUnset(unsetInput<string>())).toBe(true);
    expect(isUnset(unsetInput<{ id: number }>())).toBe(true);
  });
});

describe('Angular input contract', () => {
  let readAtConstruction: unknown;
  let snapshot: Signal<unknown>;

  @Directive({ selector: '[probe]' })
  class Probe {
    readonly value = input(unsetInput<string>());

    constructor() {
      snapshot = computed(() => this.value());
      readAtConstruction = snapshot();
    }
  }

  @Component({
    imports: [Probe],
    template: `<div probe [value]="bound()"></div>`,
  })
  class Host {
    readonly bound = signal('apple');
  }

  beforeEach(() => {
    readAtConstruction = 'not-read';
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('reads the seeded sentinel before the binding is written, instead of throwing', async () => {
    const fixture = TestBed.createComponent(Host);
    await flush(fixture);

    expect(isUnset(readAtConstruction)).toBe(true);
  });

  it('tracks the read, so the binding write folds the value into a derivation', async () => {
    const fixture = TestBed.createComponent(Host);
    await flush(fixture);

    expect(snapshot()).toBe('apple');
  });

  it('still throws when the same read is made against an input.required', async () => {
    let strictThrow: unknown = null;

    const read = (source: Signal<string>): string => source();

    @Directive({ selector: '[strictProbe]' })
    class StrictProbe {
      readonly value = input.required<string>();

      constructor() {
        try {
          read(this.value);
        } catch (error) {
          strictThrow = error;
        }
      }
    }

    @Component({
      imports: [StrictProbe],
      template: `<div strictProbe [value]="bound()"></div>`,
    })
    class StrictHost {
      readonly bound = signal('apple');
    }

    const fixture = TestBed.createComponent(StrictHost);
    await flush(fixture);

    expect((strictThrow as Error | null)?.message).toContain('NG0950');
  });
});

describe('assertInputBound', () => {
  @Directive({ selector: '[guarded]' })
  class Guarded {
    readonly value = input(unsetInput<string>());

    constructor() {
      assertInputBound(this.value, 'listbox', '[guarded]', 'value');
    }
  }

  @Component({
    imports: [Guarded],
    template: `
      @if (bound()) {
        <div guarded value="apple"></div>
      } @else {
        <div guarded></div>
      }
    `,
  })
  class Host {
    readonly bound = signal(true);
  }

  function mount(bound: boolean): unknown[] {
    const captured: unknown[] = [];
    class CapturingHandler implements ErrorHandler {
      handleError(error: unknown): void {
        captured.push(error);
      }
    }

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: ErrorHandler, useClass: CapturingHandler },
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.bound.set(bound);
    try {
      fixture.detectChanges();
    } catch (error) {
      captured.push(error);
    }
    return captured;
  }

  it('stays silent when the binding is written', () => {
    expect(mount(true)).toEqual([]);
  });

  it('throws a primitive-prefixed error naming the piece and the input', () => {
    const errors = mount(false);

    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toContain('[forty-cdk/listbox]');
    expect((errors[0] as Error).message).toContain('[guarded]');
    expect((errors[0] as Error).message).toContain('[value] binding');
  });
});
