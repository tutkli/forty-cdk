import {
  createEnvironmentInjector,
  EnvironmentInjector,
  inject,
  Injectable,
  InjectionToken,
  type Provider,
  provideZonelessChangeDetection,
  signal,
  type Type,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  FOR_HOVER_CARD_DEFAULTS,
  HoverCardCoordinator,
  provideForHoverCardDefaults,
} from '../../../hover-card/src/hover-card-defaults';
import {
  FOR_TOOLTIP_DEFAULTS,
  provideForTooltipDefaults,
  TooltipCoordinator,
} from '../../../tooltip/src/tooltip-defaults';
import { createSkipDelayWindow, SkipDelayCoordinator } from './skip-delay';

describe('createSkipDelayWindow', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('is inactive until started', () => {
    const window = createSkipDelayWindow(() => 200);
    expect(window.active()).toBe(false);
  });

  it('opens the window and closes it after the resolved duration', () => {
    vi.useFakeTimers();
    const duration = signal(200);
    const window = createSkipDelayWindow(duration);

    window.start();
    expect(window.active()).toBe(true);

    vi.advanceTimersByTime(199);
    expect(window.active()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(window.active()).toBe(false);
  });

  it('cancel closes a pending window immediately', () => {
    vi.useFakeTimers();
    const window = createSkipDelayWindow(() => 200);

    window.start();
    window.cancel();
    expect(window.active()).toBe(false);

    vi.advanceTimersByTime(1_000);
    expect(window.active()).toBe(false);
  });

  it('restarting supersedes the pending window', () => {
    vi.useFakeTimers();
    const window = createSkipDelayWindow(() => 200);

    window.start();
    vi.advanceTimersByTime(100);
    window.start();

    vi.advanceTimersByTime(199);
    expect(window.active()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(window.active()).toBe(false);
  });

  it('reads the duration accessor at arm time', () => {
    vi.useFakeTimers();
    const duration = signal(200);
    const window = createSkipDelayWindow(duration);

    window.start();
    window.cancel();

    duration.set(500);
    window.start();
    vi.advanceTimersByTime(200);
    expect(window.active()).toBe(true);
    vi.advanceTimersByTime(300);
    expect(window.active()).toBe(false);
  });

  it('clamps a negative duration to 0', () => {
    vi.useFakeTimers();
    const window = createSkipDelayWindow(() => -100);

    window.start();
    expect(window.active()).toBe(true);
    vi.advanceTimersByTime(0);
    expect(window.active()).toBe(false);
  });
});

@Injectable()
class TestCoordinator extends SkipDelayCoordinator {
  constructor() {
    super({ skipDelayDuration: 200 });
  }
}

describe('SkipDelayCoordinator', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function makeCoordinator(): TestCoordinator {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), TestCoordinator],
    });
    return TestBed.inject(TestCoordinator);
  }

  it('exposes the resolved window duration handed in by the subclass', () => {
    const coordinator = makeCoordinator();
    expect(coordinator.skipDelayDuration).toBe(200);
  });

  it('opens the skip-delay window and closes it after the duration', () => {
    vi.useFakeTimers();
    const coordinator = makeCoordinator();
    expect(coordinator.skipDelay()).toBe(false);

    coordinator.startSkipDelay();
    expect(coordinator.skipDelay()).toBe(true);

    vi.advanceTimersByTime(199);
    expect(coordinator.skipDelay()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(coordinator.skipDelay()).toBe(false);
  });

  it('cancelSkipDelay clears a pending window immediately', () => {
    vi.useFakeTimers();
    const coordinator = makeCoordinator();

    coordinator.startSkipDelay();
    coordinator.cancelSkipDelay();
    expect(coordinator.skipDelay()).toBe(false);

    vi.advanceTimersByTime(1_000);
    expect(coordinator.skipDelay()).toBe(false);
  });

  it('backs both Tooltip and Hover-card with the single shared class', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    const tooltipCoordinator = TestBed.inject(TooltipCoordinator);
    const hoverCardCoordinator = TestBed.inject(HoverCardCoordinator);

    expect(tooltipCoordinator).toBeInstanceOf(SkipDelayCoordinator);
    expect(hoverCardCoordinator).toBeInstanceOf(SkipDelayCoordinator);
    // Two distinct tokens / scopes, one shared implementation.
    expect(tooltipCoordinator).not.toBe(hoverCardCoordinator);
  });
});

interface ScopedDefaults {
  openDelay: number;
  closeDelay: number;
  skipDelayDuration: number;
  side: 'top' | 'right' | 'bottom' | 'left';
}

interface ScopeCase {
  name: string;
  coordinator: Type<SkipDelayCoordinator>;
  token: InjectionToken<ScopedDefaults>;
  provide: (
    defaults?: Partial<ScopedDefaults> | (() => Partial<ScopedDefaults>),
    options?: { skipDelayScope?: 'inherit' | 'own' },
  ) => Provider[];
}

const SCOPE_CASES: ScopeCase[] = [
  {
    name: 'provideForTooltipDefaults',
    coordinator: TooltipCoordinator,
    token: FOR_TOOLTIP_DEFAULTS,
    provide: provideForTooltipDefaults,
  },
  {
    name: 'provideForHoverCardDefaults',
    coordinator: HoverCardCoordinator,
    token: FOR_HOVER_CARD_DEFAULTS,
    provide: provideForHoverCardDefaults,
  },
];

describe.each(SCOPE_CASES)('$name skip-delay scope', ({ coordinator, token, provide }) => {
  function root(providers: Provider[] = []): EnvironmentInjector {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ...providers],
    });
    return TestBed.inject(EnvironmentInjector);
  }

  function scope(parent: EnvironmentInjector, providers: Provider[]): EnvironmentInjector {
    return createEnvironmentInjector(providers, parent);
  }

  it('shares the parent window when the scope sets no timing key', () => {
    const parent = root();
    const child = scope(parent, provide({ side: 'right' }));

    expect(child.get(coordinator)).toBe(parent.get(coordinator));
    expect(child.get(token).side).toBe('right');
  });

  it('shares the parent window when called with no arguments', () => {
    const parent = root();
    const child = scope(parent, provide());

    expect(child.get(coordinator)).toBe(parent.get(coordinator));
  });

  it.each(['openDelay', 'closeDelay', 'skipDelayDuration'] as const)(
    'starts its own window when the scope sets %s',
    (key) => {
      const parent = root();
      const child = scope(parent, provide({ [key]: 50 }));

      expect(child.get(coordinator)).not.toBe(parent.get(coordinator));
    },
  );

  it('treats an undefined timing key as unset', () => {
    const parent = root();
    const child = scope(parent, provide({ openDelay: undefined, side: 'left' }));

    expect(child.get(coordinator)).toBe(parent.get(coordinator));
  });

  it("starts its own window under skipDelayScope: 'own' even without a timing key", () => {
    const parent = root();
    const child = scope(parent, provide({ side: 'right' }, { skipDelayScope: 'own' }));

    expect(child.get(coordinator)).not.toBe(parent.get(coordinator));
  });

  it("shares the parent window under skipDelayScope: 'inherit' while keeping the scoped delays", () => {
    const parent = root();
    const child = scope(
      parent,
      provide(
        { openDelay: 0, closeDelay: 0, skipDelayDuration: 50 },
        { skipDelayScope: 'inherit' },
      ),
    );

    expect(child.get(coordinator)).toBe(parent.get(coordinator));
    expect(child.get(coordinator).skipDelayDuration).toBe(300);
    expect(child.get(token).openDelay).toBe(0);
    expect(child.get(token).closeDelay).toBe(0);
  });

  it('reads the window duration of the scope that owns the window', () => {
    const parent = root();
    const child = scope(parent, provide({ skipDelayDuration: 50 }));
    const grandchild = scope(child, provide({ side: 'bottom' }));

    expect(grandchild.get(coordinator)).toBe(child.get(coordinator));
    expect(grandchild.get(coordinator).skipDelayDuration).toBe(50);
  });

  it('decides from what a factory-form override returns, calling it once per injector', () => {
    const TIMING = new InjectionToken<boolean>('TIMING');
    const parent = root();
    let calls = 0;
    const factory = (): Partial<ScopedDefaults> => {
      calls += 1;
      return inject(TIMING) ? { openDelay: 50 } : { side: 'right' };
    };

    const placement = scope(parent, [{ provide: TIMING, useValue: false }, ...provide(factory)]);
    expect(placement.get(coordinator)).toBe(parent.get(coordinator));
    expect(placement.get(token).side).toBe('right');
    expect(calls).toBe(1);

    const timing = scope(parent, [{ provide: TIMING, useValue: true }, ...provide(factory)]);
    expect(timing.get(token).openDelay).toBe(50);
    expect(timing.get(coordinator)).not.toBe(parent.get(coordinator));
    expect(calls).toBe(2);
  });

  it('gives a root scope with no parent coordinator its own window', () => {
    const injector = root(provide({ side: 'right' }));

    expect(injector.get(coordinator)).toBeInstanceOf(coordinator);
  });
});
