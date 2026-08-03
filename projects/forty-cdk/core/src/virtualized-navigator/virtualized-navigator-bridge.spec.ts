import { ApplicationRef, effect, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { runVirtualizedNavigatorBridge } from './virtualized-navigator-bridge';
import { VirtualizedNavigator } from './virtualized-navigator';

interface FakeHandle {
  readonly id: () => string;
  readonly pos: () => number | null;
  readonly disabled: () => boolean;
  readonly host: HTMLElement;
}

interface FakeEntry {
  readonly id: string;
  readonly disabled: boolean;
}

function makeHandle(id: string, pos: number): FakeHandle {
  return {
    id: signal(id),
    pos: signal<number | null>(pos),
    disabled: signal(false),
    host: document.createElement('div'),
  };
}

function createTarget(resolves = false) {
  const calls: string[] = [];
  return {
    calls,
    target: {
      prime: () => {
        calls.push('prime');
      },
      tryResolvePending: () => {
        calls.push('tryResolvePending');
        return resolves;
      },
    },
  };
}

describe('runVirtualizedNavigatorBridge', () => {
  it('primes the navigator, then resolves any pending navigation', () => {
    const { calls, target } = createTarget();
    const items = signal<readonly FakeHandle[]>([makeHandle('r-0', 0)]);

    runVirtualizedNavigatorBridge({
      items,
      virtualized: () => true,
      requireNavigator: () => target,
    });

    expect(calls).toEqual(['prime', 'tryResolvePending']);
  });

  it('reports whether a pending navigation was resolved', () => {
    const items = signal<readonly FakeHandle[]>([]);
    const resolving = createTarget(true);
    const idle = createTarget(false);

    expect(
      runVirtualizedNavigatorBridge({
        items,
        virtualized: () => true,
        requireNavigator: () => resolving.target,
      }),
    ).toBe(true);
    expect(
      runVirtualizedNavigatorBridge({
        items,
        virtualized: () => true,
        requireNavigator: () => idle.target,
      }),
    ).toBe(false);
  });

  it('never builds the navigator on the non-virtualized path', () => {
    const { calls, target } = createTarget();
    let resolved = 0;
    const items = signal<readonly FakeHandle[]>([makeHandle('r-0', 0)]);

    const result = runVirtualizedNavigatorBridge({
      items,
      virtualized: () => false,
      requireNavigator: () => {
        resolved++;
        return target;
      },
    });

    expect(result).toBe(false);
    expect(resolved).toBe(0);
    expect(calls).toEqual([]);
  });
});

describe('runVirtualizedNavigatorBridge window tracking', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('tracks the item window even while non-virtualized', () => {
    const appRef = TestBed.inject(ApplicationRef);
    const items = signal<readonly FakeHandle[]>([]);
    const { target } = createTarget();
    let runs = 0;

    TestBed.runInInjectionContext(() => {
      effect(() => {
        runVirtualizedNavigatorBridge({
          items,
          virtualized: () => false,
          requireNavigator: () => target,
        });
        runs++;
      });
    });

    appRef.tick();
    expect(runs).toBe(1);

    items.set([makeHandle('r-0', 0)]);
    appRef.tick();
    expect(runs).toBe(2);
  });

  it('captures a window that mounts and unmounts with no other reader', () => {
    const appRef = TestBed.inject(ApplicationRef);
    const items = signal<readonly FakeHandle[]>([]);
    const virtualized = signal(true);
    const navigator = new VirtualizedNavigator<FakeHandle, FakeEntry>(
      {
        items,
        totalCount: signal<number | undefined>(100),
        visibleRange: signal<readonly [number, number] | undefined>(undefined),
        loop: () => true,
        getActiveId: () => null,
        setActiveId: () => undefined,
        emitScrollToIndex: () => undefined,
      },
      {
        posOf: (h) => h.pos(),
        idOf: (h) => h.id(),
        hostOf: (h) => h.host,
        readEntry: (h) => ({ id: h.id(), disabled: h.disabled() }),
      },
    );

    TestBed.runInInjectionContext(() => {
      effect(() => {
        runVirtualizedNavigatorBridge({
          items,
          virtualized,
          requireNavigator: () => navigator,
        });
      });
    });
    appRef.tick();

    items.set([makeHandle('r-40', 40), makeHandle('r-41', 41)]);
    appRef.tick();
    items.set([]);
    appRef.tick();

    expect(navigator.snapshotByPos().get(40)?.id).toBe('r-40');
    expect(navigator.snapshotByPos().get(41)?.id).toBe('r-41');
  });
});
