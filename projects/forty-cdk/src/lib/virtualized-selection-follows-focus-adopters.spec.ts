import {
  ChangeDetectionStrategy,
  Component,
  ErrorHandler,
  provideZonelessChangeDetection,
  signal,
  type Type,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  provideForListboxDefaults,
  provideForSelectDefaults,
  provideForTreeDefaults,
} from 'forty-cdk/defaults';
import { ForListbox, ForListboxOption, ForListboxVirtualized } from 'forty-cdk/listbox';
import {
  ForSelect,
  ForSelectContent,
  ForSelectOption,
  ForSelectTrigger,
  ForSelectVirtualized,
} from 'forty-cdk/select';
import { pressKey } from 'forty-cdk/testing';
import { ForTree, ForTreeItem, ForTreeItemLabel, ForTreeVirtualized } from 'forty-cdk/tree';

import { afterEachOverlayCleanup, flush } from '../test-utils';
import { LIBRARY_CODE } from '../test-utils/source-scan';

abstract class GuardHost {
  readonly picked = signal<readonly string[]>([]);
  readonly multiple = signal(false);
  readonly rows = [0, 1, 2, 3, 4];
}

@Component({
  imports: [ForListbox, ForListboxOption, ForListboxVirtualized],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideForListboxDefaults({ selectionFollowsFocus: true })],
  template: `
    <div
      forListbox
      forListboxVirtualized
      data-keys
      aria-label="Rows"
      [(value)]="picked"
      [multiple]="multiple()"
      [totalCount]="5"
      [visibleRange]="[0, 5]"
    >
      @for (row of rows; track row) {
        <button type="button" forListboxOption [value]="'row-' + row" [posInSet]="row">
          Row {{ row }}
        </button>
      }
    </div>
  `,
})
class ListboxScopedHost extends GuardHost {}

@Component({
  imports: [ForListbox, ForListboxOption, ForListboxVirtualized],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideForListboxDefaults({ selectionFollowsFocus: true })],
  template: `
    <div
      forListbox
      forListboxVirtualized
      data-keys
      aria-label="Rows"
      [(value)]="picked"
      [multiple]="multiple()"
      selectionFollowsFocus
      [totalCount]="5"
      [visibleRange]="[0, 5]"
    >
      @for (row of rows; track row) {
        <button type="button" forListboxOption [value]="'row-' + row" [posInSet]="row">
          Row {{ row }}
        </button>
      }
    </div>
  `,
})
class ListboxBoundHost extends GuardHost {}

@Component({
  imports: [ForSelect, ForSelectTrigger, ForSelectContent, ForSelectOption, ForSelectVirtualized],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideForSelectDefaults({ selectionFollowsFocus: true })],
  template: `
    <div
      forSelect
      forSelectVirtualized
      [(open)]="open"
      [(value)]="picked"
      [multiple]="multiple()"
      [totalCount]="5"
      [visibleRange]="[0, 5]"
    >
      <button forSelectTrigger>Rows</button>
      @if (open()) {
        <div forSelectContent data-keys>
          @for (row of rows; track row) {
            <button forSelectOption [value]="'row-' + row" [posInSet]="row">Row {{ row }}</button>
          }
        </div>
      }
    </div>
  `,
})
class SelectScopedHost extends GuardHost {
  readonly open = signal(true);
}

@Component({
  imports: [ForSelect, ForSelectTrigger, ForSelectContent, ForSelectOption, ForSelectVirtualized],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideForSelectDefaults({ selectionFollowsFocus: true })],
  template: `
    <div
      forSelect
      forSelectVirtualized
      [(open)]="open"
      [(value)]="picked"
      [multiple]="multiple()"
      selectionFollowsFocus
      [totalCount]="5"
      [visibleRange]="[0, 5]"
    >
      <button forSelectTrigger>Rows</button>
      @if (open()) {
        <div forSelectContent data-keys>
          @for (row of rows; track row) {
            <button forSelectOption [value]="'row-' + row" [posInSet]="row">Row {{ row }}</button>
          }
        </div>
      }
    </div>
  `,
})
class SelectBoundHost extends GuardHost {
  readonly open = signal(true);
}

@Component({
  imports: [ForTree, ForTreeItem, ForTreeItemLabel, ForTreeVirtualized],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideForTreeDefaults({ selectionFollowsFocus: true })],
  template: `
    <ul
      forTree
      forTreeVirtualized
      data-keys
      aria-label="Rows"
      [(value)]="picked"
      [multiple]="multiple()"
      [totalCount]="5"
      [visibleRange]="[0, 5]"
    >
      @for (row of rows; track row) {
        <li
          forTreeItem
          [value]="'row-' + row"
          [itemIndex]="row"
          [level]="1"
          [setSize]="5"
          [posInSet]="row + 1"
        >
          <div forTreeItemLabel>Row {{ row }}</div>
        </li>
      }
    </ul>
  `,
})
class TreeScopedHost extends GuardHost {}

@Component({
  imports: [ForTree, ForTreeItem, ForTreeItemLabel, ForTreeVirtualized],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideForTreeDefaults({ selectionFollowsFocus: true })],
  template: `
    <ul
      forTree
      forTreeVirtualized
      data-keys
      aria-label="Rows"
      [(value)]="picked"
      [multiple]="multiple()"
      selectionFollowsFocus
      [totalCount]="5"
      [visibleRange]="[0, 5]"
    >
      @for (row of rows; track row) {
        <li
          forTreeItem
          [value]="'row-' + row"
          [itemIndex]="row"
          [level]="1"
          [setSize]="5"
          [posInSet]="row + 1"
        >
          <div forTreeItemLabel>Row {{ row }}</div>
        </li>
      }
    </ul>
  `,
})
class TreeBoundHost extends GuardHost {}

interface GuardCase {
  readonly name: string;
  readonly owner: string;
  /** A root that inherits `selectionFollowsFocus` from the scope and binds nothing itself. */
  readonly scoped: Type<GuardHost>;
  /** The same root with a static `selectionFollowsFocus` attribute of its own. */
  readonly bound: Type<GuardHost>;
}

const CASES: readonly GuardCase[] = [
  {
    name: 'listbox',
    owner: 'listbox/src/listbox.ts',
    scoped: ListboxScopedHost,
    bound: ListboxBoundHost,
  },
  {
    name: 'select',
    owner: 'select/src/select.ts',
    scoped: SelectScopedHost,
    bound: SelectBoundHost,
  },
  { name: 'tree', owner: 'tree/src/tree.ts', scoped: TreeScopedHost, bound: TreeBoundHost },
];

const UNSUPPORTED =
  /FORCDK-CORE-009: `selectionFollowsFocus` is not supported together with virtualization/;

async function navigate(
  host: Type<GuardHost>,
  multiple: boolean,
): Promise<{ readonly captured: readonly unknown[]; readonly from: string; readonly to: string }> {
  const captured: unknown[] = [];
  TestBed.configureTestingModule({
    rethrowApplicationErrors: false,
    providers: [
      provideZonelessChangeDetection(),
      { provide: ErrorHandler, useValue: { handleError: (e: unknown) => captured.push(e) } },
    ],
  });
  const fixture = TestBed.createComponent(host);
  fixture.componentInstance.multiple.set(multiple);
  await flush(fixture);
  const keys = document.querySelector<HTMLElement>('[data-keys]')!;
  keys.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  await flush(fixture);
  const from = keys.getAttribute('aria-activedescendant') ?? '';
  await pressKey(keys, 'ArrowDown');
  await flush(fixture);
  return { captured, from, to: keys.getAttribute('aria-activedescendant') ?? '' };
}

describe('virtualized selectionFollowsFocus guard adopters (issue #2718)', () => {
  afterEachOverlayCleanup();

  for (const testCase of CASES) {
    describe(testCase.name, () => {
      for (const multiple of [false, true]) {
        const mode = multiple ? 'multi-select' : 'single-select';

        it(`navigates a ${mode} root under a selectionFollowsFocus scope default without throwing`, async () => {
          const { captured, from, to } = await navigate(testCase.scoped, multiple);

          expect(captured).toEqual([]);
          expect(from).not.toBe('');
          expect(to).not.toBe(from);
          expect(document.getElementById(to)?.textContent).toContain('Row 1');
        });
      }

      it('still throws in dev mode when a single-select root binds selectionFollowsFocus itself', async () => {
        const { captured } = await navigate(testCase.bound, false);

        expect(captured.some((e) => e instanceof Error && UNSUPPORTED.test(e.message))).toBe(true);
      });

      it('accepts a selectionFollowsFocus bound on a multi-select root, where it is inert', async () => {
        const { captured, from, to } = await navigate(testCase.bound, true);

        expect(captured).toEqual([]);
        expect(to).not.toBe(from);
      });
    });
  }

  it('covers every virtualized root exposing selectionFollowsFocus', () => {
    const roots = [...LIBRARY_CODE]
      .filter(
        ([, code]) =>
          /private registerVirtualization\(virtualization/.test(code) &&
          /readonly selectionFollowsFocus = /.test(code),
      )
      .map(([path]) => path)
      .sort();

    expect(roots).toEqual(CASES.map((c) => c.owner).sort());
  });

  it('routes every root guard through the shared core helper', () => {
    for (const { owner } of CASES) {
      expect(LIBRARY_CODE.get(owner), owner).toMatch(
        /assertVirtualizedSelectionFollowsFocusSupported\(\s*\{ bound: this\._selectionFollowsFocusInput\(\)/,
      );
    }
  });

  it('defines the FORCDK-CORE-009 report in the helper alone', () => {
    const emitters = [...LIBRARY_CODE]
      .filter(([, code]) => code.includes("'FORCDK-CORE-009'"))
      .map(([path]) => path);

    expect(emitters).toEqual(['core/src/typeahead/list-typeahead.ts']);
  });
});
