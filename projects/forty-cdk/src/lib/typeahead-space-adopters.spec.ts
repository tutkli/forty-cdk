import { ChangeDetectionStrategy, Component, signal, type Type } from '@angular/core';

import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';
import { ForListbox, ForListboxOption } from 'forty-cdk/listbox';
import { ForMenuContent, ForMenuItem } from 'forty-cdk/menu';
import { ForMenubar, ForMenubarTrigger } from 'forty-cdk/menubar';
import { ForSelect, ForSelectContent, ForSelectOption, ForSelectTrigger } from 'forty-cdk/select';
import { pressKey } from 'forty-cdk/testing';
import { ForTree, ForTreeItem, ForTreeItemLabel } from 'forty-cdk/tree';

import { afterEachOverlayCleanup, renderHost, type RenderResult } from '../test-utils';
import { LIBRARY_CODE } from '../test-utils/source-scan';

interface SpaceHost {
  activated(): boolean;
}

interface SpaceCase {
  readonly name: string;
  readonly owner: string;
  readonly host: Type<SpaceHost>;
  readonly letter: string;
  readonly arm: (r: RenderResult<SpaceHost>) => Promise<void>;
  readonly target: (r: RenderResult<SpaceHost>) => HTMLElement;
}

const focused = (): HTMLElement => document.activeElement as HTMLElement;

@Component({
  imports: [ForListbox, ForListboxOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul forListbox [(value)]="picked" aria-label="Fruit">
      <li><button type="button" forListboxOption value="alpha" data-first>Alpha</button></li>
      <li><button type="button" forListboxOption value="bravo">Bravo</button></li>
    </ul>
  `,
})
class RovingListboxHost implements SpaceHost {
  readonly picked = signal<readonly string[]>([]);
  activated(): boolean {
    return this.picked().length > 0;
  }
}

@Component({
  imports: [ForListbox, ForListboxOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forListbox [(value)]="picked" [totalCount]="2" [visibleRange]="range" aria-label="Fruit">
      <button type="button" forListboxOption value="alpha" [posInSet]="0">Alpha</button>
      <button type="button" forListboxOption value="bravo" [posInSet]="1">Bravo</button>
    </div>
  `,
})
class VirtualListboxHost implements SpaceHost {
  readonly picked = signal<readonly string[]>([]);
  readonly range: readonly [number, number] = [0, 2];
  activated(): boolean {
    return this.picked().length > 0;
  }
}

@Component({
  imports: [ForSelect, ForSelectTrigger, ForSelectContent, ForSelectOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forSelect [(open)]="open" [(value)]="value">
      <button forSelectTrigger>Fruit</button>
      @if (open()) {
        <div forSelectContent>
          <button forSelectOption value="alpha" data-first>Alpha</button>
          <button forSelectOption value="bravo">Bravo</button>
        </div>
      }
    </div>
  `,
})
class SelectHost implements SpaceHost {
  readonly open = signal(false);
  readonly value = signal<readonly string[]>([]);
  readonly closedAtArm = signal(false);
  activated(): boolean {
    return this.closedAtArm() ? this.open() : this.value().length > 0 || !this.open();
  }
}

@Component({
  imports: [ForSelect, ForSelectTrigger, ForSelectContent, ForSelectOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forSelect [(open)]="open" [(value)]="value" [totalCount]="2" [visibleRange]="range">
      <button forSelectTrigger>Fruit</button>
      @if (open()) {
        <div forSelectContent data-content>
          <button forSelectOption value="alpha" [posInSet]="0">Alpha</button>
          <button forSelectOption value="bravo" [posInSet]="1">Bravo</button>
        </div>
      }
    </div>
  `,
})
class VirtualSelectHost implements SpaceHost {
  readonly open = signal(true);
  readonly value = signal<readonly string[]>([]);
  readonly range: readonly [number, number] = [0, 2];
  activated(): boolean {
    return this.value().length > 0 || !this.open();
  }
}

@Component({
  imports: [ForTree, ForTreeItem, ForTreeItemLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul forTree [(value)]="picked" aria-label="Files">
      <li forTreeItem value="alpha" data-first><div forTreeItemLabel>Alpha</div></li>
      <li forTreeItem value="bravo"><div forTreeItemLabel>Bravo</div></li>
    </ul>
  `,
})
class RovingTreeHost implements SpaceHost {
  readonly picked = signal<readonly string[]>([]);
  activated(): boolean {
    return this.picked().length > 0;
  }
}

@Component({
  imports: [ForTree, ForTreeItem, ForTreeItemLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul forTree [(value)]="picked" [totalCount]="2" [visibleRange]="range" aria-label="Files">
      <li forTreeItem value="alpha" [itemIndex]="0" [level]="1" [setSize]="2" [posInSet]="1">
        <div forTreeItemLabel>Alpha</div>
      </li>
      <li forTreeItem value="bravo" [itemIndex]="1" [level]="1" [setSize]="2" [posInSet]="2">
        <div forTreeItemLabel>Bravo</div>
      </li>
    </ul>
  `,
})
class VirtualTreeHost implements SpaceHost {
  readonly picked = signal<readonly string[]>([]);
  readonly range: readonly [number, number] = [0, 2];
  activated(): boolean {
    return this.picked().length > 0;
  }
}

@Component({
  imports: [ForMenubar, ForMenubarTrigger, ForMenuContent, ForMenuItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forMenubar [(value)]="open" aria-label="Main">
      <button forMenubarTrigger value="file" data-first>File</button>
      @if (open() === 'file') {
        <div forMenuContent><button forMenuItem>New</button></div>
      }
      <button forMenubarTrigger value="edit">Edit</button>
      @if (open() === 'edit') {
        <div forMenuContent><button forMenuItem>Undo</button></div>
      }
    </div>
  `,
})
class MenubarHost implements SpaceHost {
  readonly open = signal<string | null>(null);
  activated(): boolean {
    return this.open() !== null;
  }
}

@Component({
  imports: [ForDropdownMenu, ForDropdownMenuTrigger, ForMenuContent, ForMenuItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forDropdownMenu [(open)]="open">
      <button forDropdownMenuTrigger>Actions</button>
      @if (open()) {
        <div forMenuContent>
          <button forMenuItem data-first (activate)="fired.set(true)">Alpha</button>
          <button forMenuItem (activate)="fired.set(true)">Bravo</button>
        </div>
      }
    </div>
  `,
})
class MenuHost implements SpaceHost {
  readonly open = signal(true);
  readonly fired = signal(false);
  activated(): boolean {
    return this.fired() || !this.open();
  }
}

async function focusFirst(r: RenderResult<SpaceHost>): Promise<void> {
  await r.flush();
  document.querySelector<HTMLElement>('[data-first]')!.focus();
  await r.flush();
}

async function seedContainer(r: RenderResult<SpaceHost>, selector: string): Promise<void> {
  await r.flush();
  const container = document.querySelector<HTMLElement>(selector)!;
  container.focus();
  container.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  await r.flush();
}

const CASES: readonly SpaceCase[] = [
  {
    name: 'listbox, roving option',
    owner: 'listbox/src/listbox.ts',
    host: RovingListboxHost,
    letter: 'a',
    arm: focusFirst,
    target: focused,
  },
  {
    name: 'listbox, virtualized container',
    owner: 'listbox/src/listbox.ts',
    host: VirtualListboxHost,
    letter: 'a',
    arm: (r) => seedContainer(r, '[forListbox]'),
    target: () => document.querySelector<HTMLElement>('[forListbox]')!,
  },
  {
    name: 'select, open option',
    owner: 'select/src/select.ts',
    host: SelectHost,
    letter: 'a',
    arm: async (r) => {
      (r.instance as SelectHost).open.set(true);
      await focusFirst(r);
    },
    target: focused,
  },
  {
    name: 'select, closed trigger',
    owner: 'select/src/select.ts',
    host: SelectHost,
    letter: 'a',
    arm: async (r) => {
      const host = r.instance as SelectHost;
      host.open.set(true);
      await r.flush();
      host.open.set(false);
      host.closedAtArm.set(true);
      await r.flush();
      document.querySelector<HTMLElement>('[forSelectTrigger]')!.focus();
    },
    target: () => document.querySelector<HTMLElement>('[forSelectTrigger]')!,
  },
  {
    name: 'select, virtualized content',
    owner: 'select/src/select.ts',
    host: VirtualSelectHost,
    letter: 'a',
    arm: async (r) => r.flush(),
    target: () => document.querySelector<HTMLElement>('[data-content]')!,
  },
  {
    name: 'tree, roving item',
    owner: 'tree/src/tree.ts',
    host: RovingTreeHost,
    letter: 'a',
    arm: focusFirst,
    target: focused,
  },
  {
    name: 'tree, virtualized container',
    owner: 'tree/src/tree.ts',
    host: VirtualTreeHost,
    letter: 'a',
    arm: (r) => seedContainer(r, '[forTree]'),
    target: () => document.querySelector<HTMLElement>('[forTree]')!,
  },
  {
    name: 'menubar, trigger row',
    owner: 'menubar/src/menubar.ts',
    host: MenubarHost,
    letter: 'f',
    arm: focusFirst,
    target: focused,
  },
  {
    name: 'menu, item',
    owner: 'core-overlay/src/menu-overlay/menu-item-list.ts',
    host: MenuHost,
    letter: 'a',
    arm: focusFirst,
    target: focused,
  },
];

describe('Space typed mid-typeahead (issue #2119)', () => {
  afterEachOverlayCleanup();

  for (const testCase of CASES) {
    describe(testCase.name, () => {
      it('consumes the Space as a typeahead character instead of activating', async () => {
        const r = renderHost(testCase.host);
        await testCase.arm(r);

        const letter = pressKey(testCase.target(r), testCase.letter);
        await r.flush();
        expect(letter.defaultPrevented).toBe(false);
        expect(r.instance.activated()).toBe(false);

        const space = pressKey(testCase.target(r), ' ');
        await r.flush();

        expect(space.defaultPrevented).toBe(true);
        expect(r.instance.activated()).toBe(false);
      });
    });
  }

  it('covers every owner of a Typeahead buffer, and names no other file', () => {
    const owners = [...LIBRARY_CODE]
      .filter(
        ([path, code]) =>
          path !== 'core/src/typeahead/typeahead.ts' && /\binjectTypeahead\(/.test(code),
      )
      .map(([path]) => path)
      .sort();

    expect(owners.length).toBeGreaterThan(3);
    expect([...new Set(CASES.map((c) => c.owner))].sort()).toEqual(owners);
  });
});
