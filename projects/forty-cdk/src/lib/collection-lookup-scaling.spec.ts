import { ChangeDetectionStrategy, Component, signal, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Collection } from 'forty-cdk/core';
import { ForListbox, ForListboxOption } from 'forty-cdk/listbox';
import { ForMenuContent, ForMenuItem } from 'forty-cdk/menu';
import { ForMenubar, ForMenubarTrigger } from 'forty-cdk/menubar';
import {
  ForNavigationMenu,
  ForNavigationMenuContent,
  ForNavigationMenuItem,
  ForNavigationMenuList,
  ForNavigationMenuTrigger,
} from 'forty-cdk/navigation-menu';
import { ForRadio, ForRadioGroup } from 'forty-cdk/radio-group';
import { ForTabs, ForTabsContent, ForTabsList, ForTabsTrigger } from 'forty-cdk/tabs';
import { ForToggleGroup, ForToggleGroupItem } from 'forty-cdk/toggle';
import { ForTree, ForTreeItem, ForTreeItemLabel } from 'forty-cdk/tree';

import { afterEachOverlayCleanup, flush, renderHost } from '../test-utils';
import { LIBRARY_CODE } from '../test-utils/source-scan';

const SMALL = 40;
const LARGE = 400;
const SIZE_RATIO = LARGE / SMALL;
const GROWTH_BUDGET = 3 * SIZE_RATIO;

const size = { n: SMALL };

function values(): readonly string[] {
  return Array.from({ length: size.n }, (_, i) => `v${i}`);
}

function lastValue(): string {
  return `v${size.n - 1}`;
}

@Component({
  imports: [ForListbox, ForListboxOption],
  host: { 'data-fixture': 'ListboxHost' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forListbox aria-label="Items" multiple [(value)]="selected">
      @for (v of values; track v) {
        <button type="button" forListboxOption [value]="v">{{ v }}</button>
      }
    </div>
  `,
})
class ListboxHost {
  readonly values = values();
  readonly selected = signal([lastValue()]);
}

@Component({
  imports: [ForRadioGroup, ForRadio],
  host: { 'data-fixture': 'RadioGroupHost' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forRadioGroup aria-label="Items" [(value)]="selected">
      @for (v of values; track v) {
        <button type="button" forRadio [value]="v">{{ v }}</button>
      }
    </div>
  `,
})
class RadioGroupHost {
  readonly values = values();
  readonly selected = signal<string | null>(lastValue());
}

@Component({
  imports: [ForTabs, ForTabsList, ForTabsTrigger, ForTabsContent],
  host: { 'data-fixture': 'TabsHost' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forTabs [(value)]="selected">
      <div forTabsList aria-label="Items">
        @for (v of values; track v) {
          <button type="button" forTabsTrigger [value]="v">{{ v }}</button>
        }
      </div>
      @for (v of values; track v) {
        <div forTabsContent [value]="v">{{ v }}</div>
      }
    </div>
  `,
})
class TabsHost {
  readonly values = values();
  readonly selected = signal<string | null>(lastValue());
}

@Component({
  imports: [ForToggleGroup, ForToggleGroupItem],
  host: { 'data-fixture': 'ToggleGroupHost' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forToggleGroup aria-label="Items" [(value)]="selected">
      @for (v of values; track v) {
        <button type="button" forToggleGroupItem [value]="v">{{ v }}</button>
      }
    </div>
  `,
})
class ToggleGroupHost {
  readonly values = values();
  readonly selected = signal([lastValue()]);
}

@Component({
  imports: [ForTree, ForTreeItem, ForTreeItemLabel],
  host: { 'data-fixture': 'TreeHost' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul forTree aria-label="Items">
      @for (v of values; track v) {
        <li forTreeItem [value]="v">
          <span forTreeItemLabel>{{ v }}</span>
        </li>
      }
    </ul>
  `,
})
class TreeHost {
  readonly values = values();
}

@Component({
  imports: [ForTree, ForTreeItem, ForTreeItemLabel],
  host: { 'data-fixture': 'TreeSelectedHost' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul forTree aria-label="Items" [(value)]="selected">
      @for (v of values; track v) {
        <li forTreeItem [value]="v">
          <span forTreeItemLabel>{{ v }}</span>
        </li>
      }
    </ul>
  `,
})
class TreeSelectedHost {
  readonly values = values();
  readonly selected = signal([lastValue()]);
}

@Component({
  imports: [ForMenubar, ForMenubarTrigger, ForMenuContent, ForMenuItem],
  host: { 'data-fixture': 'MenubarHost' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forMenubar aria-label="Items" [(value)]="open">
      @for (v of values; track v) {
        <button type="button" forMenubarTrigger [value]="v">{{ v }}</button>
        @if (open() === v) {
          <div forMenuContent>
            <button type="button" forMenuItem>Item</button>
          </div>
        }
      }
    </div>
  `,
})
class MenubarHost {
  readonly values = values();
  readonly open = signal<string | null>(lastValue());
}

@Component({
  imports: [
    ForNavigationMenu,
    ForNavigationMenuList,
    ForNavigationMenuItem,
    ForNavigationMenuTrigger,
    ForNavigationMenuContent,
  ],
  host: { 'data-fixture': 'NavigationMenuHost' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav forNavigationMenu aria-label="Items" [(value)]="open">
      <ul forNavigationMenuList>
        @for (v of values; track v) {
          <li forNavigationMenuItem [value]="v">
            <button type="button" forNavigationMenuTrigger>{{ v }}</button>
            <div forNavigationMenuContent>{{ v }}</div>
          </li>
        }
      </ul>
    </nav>
  `,
})
class NavigationMenuHost {
  readonly values = values();
  readonly open = signal<string | null>(lastValue());
}

interface Scenario {
  readonly name: string;
  readonly host: Type<unknown>;
  /** The fixture keeps every panel mounted, which the primitive reports with a dev warning. */
  readonly mountedWhileClosed?: true;
}

/** Every root constructing a `Collection` whose per-item answer looks items up by `value`. */
const SCENARIOS: Readonly<Record<string, readonly Scenario[]>> = {
  'listbox/src/listbox.ts': [{ name: 'Listbox, last option selected', host: ListboxHost }],
  'radio-group/src/radio-group.ts': [
    { name: 'RadioGroup, last radio selected', host: RadioGroupHost },
  ],
  'tabs/src/tabs.ts': [{ name: 'Tabs, last tab selected', host: TabsHost }],
  'toggle/src/toggle-group.ts': [{ name: 'ToggleGroup, last item pressed', host: ToggleGroupHost }],
  'tree/src/tree.ts': [
    { name: 'Tree, nothing selected', host: TreeHost },
    { name: 'Tree, last node selected', host: TreeSelectedHost },
  ],
  'menubar/src/menubar.ts': [{ name: 'Menubar, last menu open', host: MenubarHost }],
  'navigation-menu/src/navigation-menu.ts': [
    {
      name: 'NavigationMenu, last item open',
      host: NavigationMenuHost,
      mountedWhileClosed: true,
    },
  ],
};

const ITEM_FOLD_FIND =
  /\.items\(\)\.(?:find|some|filter|findIndex|every)\(\(?(\w+)\)?\s*=>[^;]*?\b\1\.value\(\)/;
const ITEM_FOLD_FOR = /for \(const (\w+) of [\w.#]+\.items\(\)\) \{[\s\S]{0,300}?\b\1\.value\(\)/;
const BUCKETED = /\bbucketed(?:Find|Lookup)\(/;

/**
 * The roots that construct a `Collection` and look an item up by its `value`, either through a
 * bucketed lookup or through a fold over `items()` reading each item's `value()`.
 */
function derivedMembers(): readonly string[] {
  const members: string[] = [];
  for (const [path, code] of LIBRARY_CODE) {
    if (!code.includes('new Collection<')) {
      continue;
    }
    if (BUCKETED.test(code) || ITEM_FOLD_FIND.test(code) || ITEM_FOLD_FOR.test(code)) {
      members.push(path);
    }
  }
  return members.sort();
}

interface ValueHandle {
  value?: unknown;
}

const counting = { reads: 0 };
const wrapped = new WeakSet<object>();

function countValueReads(handle: unknown): void {
  if (typeof handle !== 'object' || handle === null || wrapped.has(handle)) {
    return;
  }
  wrapped.add(handle);
  const target = handle as ValueHandle;
  const read = target.value;
  if (typeof read !== 'function') {
    return;
  }
  target.value = () => {
    counting.reads++;
    return (read as () => unknown)();
  };
}

async function mountReads(host: Type<unknown>, n: number): Promise<number> {
  size.n = n;
  counting.reads = 0;
  const { fixture } = renderHost(host);
  await flush(fixture);
  const reads = counting.reads;
  fixture.destroy();
  TestBed.resetTestingModule();
  return reads;
}

describe('collection per-item lookups scale linearly with the mounted item count', () => {
  afterEachOverlayCleanup();

  let originalRegister: typeof Collection.prototype.register;

  beforeEach(() => {
    originalRegister = Collection.prototype.register;
    Collection.prototype.register = function (this: Collection<never>, handle: never): void {
      countValueReads(handle);
      originalRegister.call(this, handle);
    };
  });

  afterEach(() => {
    Collection.prototype.register = originalRegister;
  });

  it('has a scenario for every root the source scan derives, and none for a root it does not', () => {
    const members = derivedMembers();
    expect(members.length).toBeGreaterThanOrEqual(7);
    expect(Object.keys(SCENARIOS).sort()).toEqual(members);
  });

  for (const [path, scenarios] of Object.entries(SCENARIOS)) {
    for (const scenario of scenarios) {
      it(`${scenario.name} (${path}) reads item values a linear number of times`, async () => {
        if (scenario.mountedWhileClosed) {
          vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        }
        const small = await mountReads(scenario.host, SMALL);
        const large = await mountReads(scenario.host, LARGE);

        expect(small, 'the counting wrapper saw no value read').toBeGreaterThan(0);
        expect(
          large / small,
          `${large} value reads at ${LARGE} items against ${small} at ${SMALL}: growth ×${(large / small).toFixed(1)}, budget ×${GROWTH_BUDGET}`,
        ).toBeLessThan(GROWTH_BUDGET);
      });
    }
  }
});
