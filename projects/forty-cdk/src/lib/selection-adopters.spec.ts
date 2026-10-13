import {
  ChangeDetectionStrategy,
  Component,
  signal,
  type Type,
  type WritableSignal,
} from '@angular/core';

import {
  ForCombobox,
  ForComboboxContent,
  ForComboboxInput,
  ForComboboxOption,
} from 'forty-cdk/combobox';
import { ForListbox, ForListboxOption } from 'forty-cdk/listbox';
import {
  ForSelect,
  ForSelectContent,
  ForSelectOption,
  ForSelectTrigger,
  ForSelectValue,
} from 'forty-cdk/select';
import {
  ForTable,
  ForTableCell,
  ForTableRow,
  ForTableRowSelector,
  ForTableSelectAll,
} from 'forty-cdk/table';
import { installObserverPolyfills, pressKey } from 'forty-cdk/testing';
import { ForTree, ForTreeGroup, ForTreeItem, ForTreeItemLabel } from 'forty-cdk/tree';

import { afterEachOverlayCleanup, flush, renderHost } from '../test-utils';
import { LIBRARY_CODE } from '../test-utils/source-scan';

const COUNT = 400;
const BOUND = 20 * COUNT;
const ids = Array.from({ length: COUNT }, (_, i) => `v${i}`);

let reads = 0;

interface City {
  readonly id: number;
  readonly name: string;
  readonly country?: string;
}

const CITIES: readonly City[] = [
  { id: 1, name: 'Paris' },
  { id: 2, name: 'Berlin' },
  { id: 3, name: 'Tokyo' },
];

const FRUIT = ['apple', 'banana', 'cherry', 'date', 'elder'];

function track<T>(values: readonly T[]): readonly T[] {
  return new Proxy([...values], {
    get(target, key, receiver) {
      if (typeof key === 'string' && /^\d+$/.test(key)) {
        reads += 1;
      }
      return Reflect.get(target, key, receiver);
    },
  });
}

@Component({
  imports: [ForListbox, ForListboxOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      forListbox
      multiple
      aria-label="Values"
      [value]="value()"
      (valueChange)="value.set(track($event))"
    >
      @for (id of ids; track id) {
        <button type="button" forListboxOption [value]="id" [attr.data-testid]="id">
          {{ id }}
        </button>
      }
    </div>
  `,
})
class ListboxHost {
  readonly ids = ids;
  readonly track = track;
  readonly value = signal<readonly string[]>([]);
}

@Component({
  imports: [ForSelect, ForSelectTrigger, ForSelectContent, ForSelectOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      forSelect
      multiple
      [(open)]="open"
      [value]="value()"
      (valueChange)="value.set(track($event))"
    >
      <button forSelectTrigger>Values</button>
      @if (open()) {
        <div forSelectContent>
          @for (id of ids; track id) {
            <button forSelectOption [value]="id" [attr.data-testid]="id">{{ id }}</button>
          }
        </div>
      }
    </div>
  `,
})
class SelectHost {
  readonly ids = ids;
  readonly track = track;
  readonly open = signal(true);
  readonly value = signal<readonly string[]>([]);
}

@Component({
  imports: [ForCombobox, ForComboboxInput, ForComboboxContent, ForComboboxOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      forCombobox
      multiple
      [(open)]="open"
      [value]="value()"
      (valueChange)="value.set(track($event))"
    >
      <input forComboboxInput aria-label="Values" />
      @if (open()) {
        <div forComboboxContent>
          @for (id of ids; track id) {
            <div forComboboxOption [value]="id" [attr.data-testid]="id">{{ id }}</div>
          }
        </div>
      }
    </div>
  `,
})
class ComboboxHost {
  readonly ids = ids;
  readonly track = track;
  readonly open = signal(true);
  readonly value = signal<readonly string[]>([]);
}

const parents = ids.slice(0, COUNT / 2);
const childOf = (parent: string): string => `${parent}-child`;

@Component({
  imports: [ForTree, ForTreeItem, ForTreeItemLabel, ForTreeGroup],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul
      forTree
      aria-label="Values"
      selectionMode="checkbox"
      cascade
      [descendantsOf]="descendantsOf"
      [value]="value()"
      (valueChange)="value.set(track($event))"
      [expanded]="expanded()"
    >
      @for (id of parents; track id) {
        <li forTreeItem [value]="id">
          <div forTreeItemLabel [attr.data-testid]="id">{{ id }}</div>
          <ul forTreeGroup>
            <li forTreeItem [value]="childOf(id)">
              <div forTreeItemLabel>{{ childOf(id) }}</div>
            </li>
          </ul>
        </li>
      }
    </ul>
  `,
})
class TreeHost {
  readonly parents = parents;
  readonly childOf = childOf;
  readonly track = track;
  readonly descendantsOf = (value: string): readonly string[] =>
    value.endsWith('-child') ? [] : [childOf(value)];
  readonly value = signal<readonly string[]>([]);
  readonly expanded = signal<readonly string[]>(track(parents));
}

@Component({
  imports: [ForTable, ForTableRow, ForTableCell, ForTableRowSelector, ForTableSelectAll],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      forTable
      mode="grid"
      selectionMode="multiple"
      aria-label="Values"
      [value]="value()"
      (valueChange)="value.set(track($event))"
    >
      <div role="rowgroup">
        <div role="row">
          <div role="columnheader">
            <span forTableSelectAll ariaLabel="Select all" data-testid="select-all"></span>
          </div>
        </div>
      </div>
      <div role="rowgroup">
        @for (id of ids; track id) {
          <div forTableRow [value]="id">
            <div forTableCell name="sel">
              <span forTableRowSelector [attr.data-testid]="id"></span>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
class TableHost {
  readonly ids = ids;
  readonly track = track;
  readonly value = signal<readonly string[]>([]);
}

interface SeededHost {
  readonly value: WritableSignal<readonly string[]>;
}

interface Adopter {
  readonly root: string;
  readonly probe: string;
  readonly host: Type<SeededHost>;
  readonly universe: readonly string[];
  readonly selectAll: (() => void) | null;
}

const byTestId = (id: string): HTMLElement =>
  document.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;

const pressCtrlA = (): void => {
  const first = byTestId(ids[0]!);
  first.focus();
  pressKey(first, 'a', { ctrlKey: true });
};

const treeValues = parents.flatMap((parent) => [parent, childOf(parent)]);

const ADOPTERS: readonly Adopter[] = [
  {
    root: 'listbox/src/listbox.ts',
    probe: 'listbox/src/listbox.ts',
    host: ListboxHost,
    universe: ids,
    selectAll: pressCtrlA,
  },
  {
    root: 'select/src/select.ts',
    probe: 'select/src/select.ts',
    host: SelectHost,
    universe: ids,
    selectAll: pressCtrlA,
  },
  {
    root: 'combobox/src/combobox.ts',
    probe: 'combobox/src/combobox.ts',
    host: ComboboxHost,
    universe: ids,
    selectAll: null,
  },
  {
    root: 'tree/src/tree.ts',
    probe: 'tree/src/tree.ts',
    host: TreeHost,
    universe: treeValues,
    selectAll: null,
  },
  {
    root: 'table/src/table.ts',
    probe: 'table/src/selection-model.ts',
    host: TableHost,
    universe: ids,
    selectAll: () => byTestId('select-all').click(),
  },
];

const HELPER_FILE = 'core/src/selection/selection.ts';
const MEMBERSHIP_HELPERS = ['membership', 'appendMissing', 'dedupeValues', 'lookupByValue'];

const HELPER_ADOPTERS: readonly string[] = [
  'core/src/collection/label-cache.ts',
  'core/src/selection/range-selection-engine.ts',
  'table/src/selection-model.ts',
  'table/src/table-row-selection.ts',
  'tree/src/tree-selection.ts',
];

function source(file: string): string {
  const code = LIBRARY_CODE.get(file);
  expect(code, file).toBeDefined();
  return code!;
}

function compareWithRoots(): string[] {
  return [...LIBRARY_CODE]
    .filter(([, code]) => /readonly compareWith = input</.test(code))
    .map(([path]) => path)
    .sort();
}

function callsAny(code: string, helpers: readonly string[]): boolean {
  return helpers.some((helper) => new RegExp(`[^A-Za-z]${helper}\\(`).test(code));
}

@Component({
  imports: [ForSelect, ForSelectTrigger, ForSelectContent, ForSelectOption, ForSelectValue],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forSelect [(open)]="open" [(value)]="value" [compareWith]="byId">
      <button forSelectTrigger>
        <span forSelectValue data-testid="label" placeholder="Pick a city"></span>
      </button>
      @if (open()) {
        <div forSelectContent>
          @for (city of cities; track city.id) {
            <button forSelectOption [value]="city">{{ city.name }}</button>
          }
        </div>
      }
    </div>
  `,
})
class SelectObjectHost {
  readonly cities = CITIES;
  readonly open = signal(false);
  readonly value = signal<readonly City[]>([]);
  readonly byId = (a: City, b: City): boolean => a.id === b.id;
}

@Component({
  imports: [ForCombobox, ForComboboxInput, ForComboboxContent, ForComboboxOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forCombobox #combobox="forCombobox" [(open)]="open" [(value)]="value" [compareWith]="byId">
      <input forComboboxInput aria-label="City" />
      @if (open()) {
        <div forComboboxContent>
          @for (city of cities; track city.id) {
            <div forComboboxOption [value]="city" [label]="city.name">{{ city.name }}</div>
          }
        </div>
      }
    </div>
    <output data-testid="label">{{ combobox.selected()[0]?.label }}</output>
  `,
})
class ComboboxObjectHost {
  readonly cities = CITIES;
  readonly open = signal(false);
  readonly value = signal<readonly City[]>([]);
  readonly byId = (a: City, b: City): boolean => a.id === b.id;
}

interface LabelCacheConsumer {
  readonly file: string;
  readonly host: Type<{
    readonly open: WritableSignal<boolean>;
    readonly value: WritableSignal<readonly City[]>;
  }>;
}

const LABEL_CACHE_CONSUMERS: readonly LabelCacheConsumer[] = [
  { file: 'select/src/select.ts', host: SelectObjectHost },
  { file: 'combobox/src/combobox.ts', host: ComboboxObjectHost },
];

@Component({
  imports: [ForListbox, ForListboxOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forListbox multiple aria-label="Fruit">
      @for (fruit of fruit; track fruit) {
        <button type="button" forListboxOption [value]="fruit" [attr.data-testid]="fruit">
          {{ fruit }}
        </button>
      }
    </div>
  `,
})
class ListboxRangeHost {
  readonly fruit = FRUIT;
}

@Component({
  imports: [ForSelect, ForSelectTrigger, ForSelectContent, ForSelectOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forSelect multiple [(open)]="open">
      <button forSelectTrigger>Fruit</button>
      @if (open()) {
        <div forSelectContent>
          @for (fruit of fruit; track fruit) {
            <button forSelectOption [value]="fruit" [attr.data-testid]="fruit">{{ fruit }}</button>
          }
        </div>
      }
    </div>
  `,
})
class SelectRangeHost {
  readonly fruit = FRUIT;
  readonly open = signal(true);
}

const RANGE_ROOTS: ReadonlyArray<{ readonly root: string; readonly host: Type<unknown> }> = [
  { root: 'listbox/src/listbox.ts', host: ListboxRangeHost },
  { root: 'select/src/select.ts', host: SelectRangeHost },
];

const hover = (option: HTMLElement): void => {
  option.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
};

const highlighted = (): string[] =>
  Array.from(document.querySelectorAll<HTMLElement>('[role="option"][data-highlighted]')).map(
    (option) => option.dataset['testid'] ?? '',
  );

describe('shared selection membership (meta-guard)', () => {
  afterEachOverlayCleanup();
  let restoreObservers: () => void;
  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  it('finds the library sources through the glob', () => {
    expect(LIBRARY_CODE.size).toBeGreaterThan(100);
    expect(compareWithRoots().length).toBeGreaterThanOrEqual(5);
  });

  it('covers every root declaring a compareWith input with a behavioural row', () => {
    expect(compareWithRoots()).toEqual(ADOPTERS.map((entry) => entry.root).sort());
  });

  it('defaults every compareWith input to the shared core comparator', () => {
    expect(
      compareWithRoots().filter(
        (file) =>
          !source(file).includes(
            'readonly compareWith = input<(a: T, b: T) => boolean>(defaultCompareWith)',
          ),
      ),
    ).toEqual([]);
  });

  it('routes every root and helper adopter through the core membership helpers', () => {
    const roots = ADOPTERS.map((entry) => entry.probe).filter(
      (file) => !source(file).includes('selectionMembership('),
    );
    const helpers = HELPER_ADOPTERS.filter((file) => !callsAny(source(file), MEMBERSHIP_HELPERS));
    expect([...roots, ...helpers]).toEqual([]);
  });

  it('declares the default comparator and the membership helpers once, in core', () => {
    const declares = (name: string): string[] =>
      [...LIBRARY_CODE]
        .filter(([, code]) => new RegExp(`export (const|function) ${name}\\b`).test(code))
        .map(([path]) => path);
    for (const name of ['defaultCompareWith', ...MEMBERSHIP_HELPERS]) {
      expect(declares(name), name).toEqual([HELPER_FILE]);
    }
    expect([...LIBRARY_CODE.keys()].filter((path) => path.endsWith('tree-identity.ts'))).toEqual(
      [],
    );
  });

  for (const entry of ADOPTERS) {
    it(`${entry.root}: a fully selected render reads the value array a linear number of times`, async () => {
      reads = 0;
      const r = renderHost(entry.host);
      r.instance.value.set(track(entry.universe));
      await flush(r.fixture);
      expect(reads).toBeLessThan(BOUND);
    });

    const selectAll = entry.selectAll;
    if (selectAll !== null) {
      it(`${entry.root}: select-all reads the value array a linear number of times`, async () => {
        const r = renderHost(entry.host);
        r.instance.value.set(track(entry.universe.slice(0, -1)));
        await flush(r.fixture);
        reads = 0;
        selectAll();
        await flush(r.fixture);
        expect(r.instance.value()).toHaveLength(entry.universe.length);
        expect(reads).toBeLessThan(BOUND);
      });
    }
  }

  it('table/src/table.ts: a row toggle reads the value array a linear number of times', async () => {
    const r = renderHost(TableHost);
    r.instance.value.set(track(ids));
    await flush(r.fixture);
    reads = 0;
    byTestId(ids[7]!).click();
    await flush(r.fixture);
    expect(r.instance.value()).toHaveLength(COUNT - 1);
    expect(reads).toBeLessThan(BOUND);
  });

  for (const entry of LABEL_CACHE_CONSUMERS) {
    it(`${entry.file}: resolves a compareWith-equal value with a different serialization to its option label`, async () => {
      expect(source(entry.file)).toContain('new LabelCache');
      const r = renderHost(entry.host);
      r.instance.value.set([{ id: 2, name: 'Berlin', country: 'DE' }]);
      r.instance.open.set(true);
      await flush(r.fixture);
      expect(byTestId('label').textContent?.trim()).toBe('Berlin');
    });
  }

  it('constructs the range-selection engine only in roots with a pointer-suppressing row', () => {
    const constructing = [...LIBRARY_CODE]
      .filter(([, code]) => code.includes('new RangeSelectionEngine<'))
      .map(([path]) => path)
      .sort();
    expect(constructing).toEqual(RANGE_ROOTS.map((entry) => entry.root).sort());
  });

  for (const entry of RANGE_ROOTS) {
    it(`${entry.root}: Shift+ArrowDown opens the pointer-suppression window before it scrolls`, async () => {
      const r = renderHost(entry.host);
      await flush(r.fixture);
      const apple = byTestId('apple');
      apple.focus();
      await flush(r.fixture);

      pressKey(apple, 'ArrowDown', { shiftKey: true });
      hover(byTestId('date'));
      await flush(r.fixture);

      expect(document.activeElement).toBe(byTestId('banana'));
      expect(highlighted()).toEqual(['banana']);
    });

    it(`${entry.root}: Ctrl+Shift+End opens the pointer-suppression window before it scrolls`, async () => {
      const r = renderHost(entry.host);
      await flush(r.fixture);
      const apple = byTestId('apple');
      apple.focus();
      await flush(r.fixture);

      pressKey(apple, 'End', { ctrlKey: true, shiftKey: true });
      hover(byTestId('banana'));
      await flush(r.fixture);

      expect(document.activeElement).toBe(byTestId('elder'));
      expect(highlighted()).toEqual(['elder']);
    });
  }
});
