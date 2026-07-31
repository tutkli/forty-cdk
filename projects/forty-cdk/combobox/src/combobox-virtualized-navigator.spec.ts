import { computed, signal, type Signal } from '@angular/core';

import { unsetInput } from 'forty-cdk/core';

import type { ForComboboxOptionHandle } from './combobox-context';
import { VirtualizedNavigator } from './combobox-virtualized-navigator';

function makeHandle(
  id: string,
  value: Signal<string>,
  label: Signal<string>,
  pos: number,
): ForComboboxOptionHandle<string> {
  return {
    host: document.createElement('div'),
    id: signal(id),
    value,
    label,
    disabled: signal(false),
    posInSet: signal<number | null>(pos),
  };
}

function createNavigator(items: readonly ForComboboxOptionHandle<string>[]) {
  const active = signal<string | null>(null);
  return new VirtualizedNavigator<string>({
    items: signal(items),
    totalCount: signal<number | undefined>(100),
    visibleRange: signal<readonly [number, number] | undefined>([0, 10]),
    loop: signal(false),
    getActiveId: () => active(),
    setActiveId: (id) => active.set(id),
    emitScrollToIndex: () => {},
    scrollActiveIntoView: () => {},
  });
}

describe('combobox VirtualizedNavigator', () => {
  it('skips an option whose value binding is unwritten, folding it in on the re-run', () => {
    const bound = signal<string | null>(null);
    const value = computed(() => bound() ?? unsetInput<string>());
    const navigator = createNavigator([makeHandle('pending', value, signal('Pending'), 0)]);

    navigator.prime();
    expect(navigator.snapshotByPos().has(0)).toBe(false);

    bound.set('apple');
    navigator.prime();
    expect(navigator.snapshotByPos().get(0)?.value).toBe('apple');
  });

  it('never resolves the label of an option whose value binding is unwritten', () => {
    const bound = signal<string | null>(null);
    const resolveLabel = vi.fn(() => 'Pending');
    const value = computed(() => bound() ?? unsetInput<string>());
    const navigator = createNavigator([makeHandle('pending', value, computed(resolveLabel), 0)]);

    navigator.prime();
    expect(resolveLabel).not.toHaveBeenCalled();

    bound.set('apple');
    navigator.prime();
    expect(navigator.snapshotByPos().get(0)?.label).toBe('Pending');
  });
});
