import { computed, signal, type Signal } from '@angular/core';

import { unsetInput } from 'forty-cdk/core';

import type { ForSelectOptionHandle } from './select-context';
import { SelectVirtualizedNavigator } from './select-virtualized-navigator';

function makeHandle(id: string, value: Signal<string>, pos: number): ForSelectOptionHandle<string> {
  return {
    host: document.createElement('div'),
    id: signal(id),
    value,
    label: signal(id),
    disabled: signal(false),
    posInSet: signal<number | null>(pos),
  };
}

function createNavigator(items: readonly ForSelectOptionHandle<string>[]) {
  const active = signal<string | null>(null);
  return new SelectVirtualizedNavigator<string>({
    items: signal(items),
    totalCount: signal<number | undefined>(100),
    visibleRange: signal<readonly [number, number] | undefined>([0, 10]),
    loop: signal(false),
    getActiveId: () => active(),
    setActiveId: (id) => active.set(id),
    emitScrollToIndex: () => {},
  });
}

describe('SelectVirtualizedNavigator', () => {
  it('skips an option whose value binding is unwritten, folding it in on the re-run', () => {
    const bound = signal<string | null>(null);
    const value = computed(() => bound() ?? unsetInput<string>());
    const navigator = createNavigator([makeHandle('pending', value, 0)]);

    navigator.prime();
    expect(navigator.snapshotByPos().has(0)).toBe(false);

    bound.set('apple');
    navigator.prime();
    expect(navigator.snapshotByPos().get(0)?.value).toBe('apple');
  });
});
