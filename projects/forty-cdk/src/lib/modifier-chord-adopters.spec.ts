import { ChangeDetectionStrategy, Component, signal, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  ForCalendar,
  ForCalendarCell,
  ForCalendarGrid,
  ForCalendarMonthCell,
  ForCalendarMonthGrid,
  ForCalendarYearCell,
  ForCalendarYearGrid,
} from 'forty-cdk/calendar';
import {
  ForCombobox,
  ForComboboxChip,
  ForComboboxChips,
  ForComboboxInput,
} from 'forty-cdk/combobox';
import { ForDateField, ForDateFieldSegment } from 'forty-cdk/date-field';
import { ForDraggable } from 'forty-cdk/drag-drop';
import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';
import { ForListbox, ForListboxOption, ForListboxReorder } from 'forty-cdk/listbox';
import { ForMenuContent, ForMenuItem, ForMenuSub, ForMenuSubTrigger } from 'forty-cdk/menu';
import { ForMenubar, ForMenubarTrigger } from 'forty-cdk/menubar';
import {
  ForNavigationMenu,
  ForNavigationMenuContent,
  ForNavigationMenuItem,
  ForNavigationMenuLink,
  ForNavigationMenuList,
  ForNavigationMenuTrigger,
} from 'forty-cdk/navigation-menu';
import { ForPaneResizer } from 'forty-cdk/pane-resizer';
import { provideNativeDateAdapter } from 'forty-cdk/shared';
import { ForSlider, ForSliderThumb, ForSliderTrack } from 'forty-cdk/slider';
import {
  ForTable,
  ForTableCell,
  ForTableColumnResizer,
  ForTableHeaderCell,
  ForTableHeaderRow,
  ForTableRow,
  ForTableRowReorder,
} from 'forty-cdk/table';
import { installObserverPolyfills, pressKey } from 'forty-cdk/testing';
import { ForTimeField, ForTimeFieldSegment } from 'forty-cdk/time-field';
import { ForToolbar, ForToolbarButton } from 'forty-cdk/toolbar';
import {
  ForTree,
  ForTreeGroup,
  ForTreeItem,
  ForTreeItemLabel,
  ForTreeNodeDrag,
} from 'forty-cdk/tree';

import { afterEachOverlayCleanup, renderHost, type RenderResult } from '../test-utils';
import { LIBRARY_CODE } from '../test-utils/source-scan';

interface Chord {
  readonly key: string;
  readonly init: KeyboardEventInit;
}

interface ChordCase<T = unknown> {
  readonly name: string;
  readonly host: Type<T>;
  readonly arm?: (r: RenderResult<T>) => Promise<void>;
  readonly target: (r: RenderResult<T>) => HTMLElement;
  readonly bare: string;
  readonly chords: readonly Chord[];
  readonly observe: (r: RenderResult<T>) => Promise<unknown>;
}

const alt = (key: string): Chord => ({ key, init: { altKey: true } });
const meta = (key: string): Chord => ({ key, init: { metaKey: true } });
const ctrl = (key: string): Chord => ({ key, init: { ctrlKey: true } });

const byTestId = (id: string): HTMLElement =>
  document.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
const byId = (id: string): HTMLElement => document.getElementById(id)!;
const focusedLabel = (): string | null => {
  const active = document.activeElement as HTMLElement | null;
  return active?.dataset['testid'] ?? active?.id ?? null;
};
const tabStop = (selector: string): string | null =>
  document.querySelector<HTMLElement>(`${selector}[tabindex="0"]`)?.dataset['testid'] ?? null;
const lift = async (r: RenderResult<unknown>, host: HTMLElement): Promise<void> => {
  host.focus();
  pressKey(host, ' ', { ctrlKey: true });
  await r.flush();
};

@Component({
  imports: [ForTimeField, ForTimeFieldSegment],
  providers: [...provideNativeDateAdapter()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forTimeField [(value)]="value" [hourCycle]="12" locale="en-US" #field="forTimeField">
      @for (seg of field.segments(); track seg.id) {
        @if (!seg.isLiteral) {
          <span forTimeFieldSegment [segment]="seg.type!" [attr.data-testid]="seg.type">{{
            seg.text
          }}</span>
        }
      }
    </div>
  `,
})
class TimeFieldHost {
  readonly value = signal<Date | null>(new Date(2026, 0, 1, 9, 30));
}

@Component({
  imports: [ForDateField, ForDateFieldSegment],
  providers: [...provideNativeDateAdapter()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forDateField [(value)]="value" locale="en-US" #field="forDateField">
      @for (seg of field.segments(); track seg.id) {
        @if (!seg.isLiteral) {
          <span forDateFieldSegment [segment]="seg.type!" [attr.data-testid]="seg.type">{{
            seg.text
          }}</span>
        }
      }
    </div>
  `,
})
class DateFieldHost {
  readonly value = signal<Date | null>(new Date(2026, 5, 15));
}

@Component({
  imports: [
    ForCalendar,
    ForCalendarGrid,
    ForCalendarCell,
    ForCalendarMonthGrid,
    ForCalendarMonthCell,
    ForCalendarYearGrid,
    ForCalendarYearCell,
  ],
  providers: [...provideNativeDateAdapter()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forCalendar [(value)]="value" [(view)]="view" locale="en-US">
      @let activeView = view();
      @switch (activeView) {
        @case ('day') {
          <table forCalendarGrid #grid="forCalendarGrid">
            <tbody>
              @for (week of grid.weeks(); track week.key) {
                <tr>
                  @for (c of week.days; track c.key) {
                    <td forCalendarCell [date]="c.date" [attr.data-testid]="'day-' + c.key">
                      {{ c.label }}
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        }
        @case ('month') {
          <table forCalendarMonthGrid #mg="forCalendarMonthGrid">
            <tbody>
              @for (row of mg.rows(); track row.key) {
                <tr>
                  @for (m of row.months; track m.value) {
                    <td
                      forCalendarMonthCell
                      [month]="m.value"
                      [attr.data-testid]="'month-' + m.value"
                    >
                      {{ m.label }}
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        }
        @case ('year') {
          <table forCalendarYearGrid #yg="forCalendarYearGrid">
            <tbody>
              @for (row of yg.rows(); track row.key) {
                <tr>
                  @for (y of row.years; track y.value) {
                    <td forCalendarYearCell [year]="y.value" [attr.data-testid]="'year-' + y.value">
                      {{ y.label }}
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        }
        @default never;
      }
    </div>
  `,
})
class CalendarHost {
  readonly value = signal<Date | null>(new Date(2026, 5, 15));
  readonly view = signal<'day' | 'month' | 'year'>('day');
}

@Component({
  imports: [ForCalendar, ForCalendarMonthGrid, ForCalendarMonthCell],
  providers: [...provideNativeDateAdapter()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forCalendar [(value)]="value" [(view)]="view" locale="en-US">
      @if (view() === 'month') {
        <table forCalendarMonthGrid #mg="forCalendarMonthGrid">
          <tbody>
            @for (row of mg.rows(); track row.key) {
              <tr>
                @for (m of row.months; track m.value) {
                  <td
                    forCalendarMonthCell
                    [month]="m.value"
                    [attr.data-testid]="'month-' + m.value"
                  >
                    {{ m.label }}
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
class CalendarMonthHost {
  readonly value = signal<Date | null>(new Date(2026, 5, 15));
  readonly view = signal<'day' | 'month' | 'year'>('month');
}

@Component({
  imports: [ForCalendar, ForCalendarYearGrid, ForCalendarYearCell],
  providers: [...provideNativeDateAdapter()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forCalendar [(value)]="value" [(view)]="view" locale="en-US">
      @if (view() === 'year') {
        <table forCalendarYearGrid #yg="forCalendarYearGrid">
          <tbody>
            @for (row of yg.rows(); track row.key) {
              <tr>
                @for (y of row.years; track y.value) {
                  <td forCalendarYearCell [year]="y.value" [attr.data-testid]="'year-' + y.value">
                    {{ y.label }}
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
class CalendarYearHost {
  readonly value = signal<Date | null>(new Date(2026, 5, 15));
  readonly view = signal<'day' | 'month' | 'year'>('year');
}

@Component({
  imports: [
    ForDropdownMenu,
    ForDropdownMenuTrigger,
    ForMenuContent,
    ForMenuItem,
    ForMenuSub,
    ForMenuSubTrigger,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forDropdownMenu [(open)]="open">
      <button forDropdownMenuTrigger>Options</button>
      @if (open()) {
        <div forMenuContent>
          <button id="cut" forMenuItem>Cut</button>
          <div forMenuSub [(open)]="subOpen">
            <button id="more" forMenuSubTrigger>More</button>
            @if (subOpen()) {
              <div forMenuSubContent>
                <button id="advanced" forMenuItem>Advanced</button>
                <div forMenuSub [(open)]="deepOpen">
                  <button id="deeper" forMenuSubTrigger>Deeper</button>
                  @if (deepOpen()) {
                    <div forMenuSubContent>
                      <button id="deepest" forMenuItem>Deepest</button>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
class DropdownMenuHost {
  readonly open = signal(true);
  readonly subOpen = signal(true);
  readonly deepOpen = signal(false);
}

@Component({
  imports: [
    ForMenubar,
    ForMenubarTrigger,
    ForMenuContent,
    ForMenuItem,
    ForMenuSub,
    ForMenuSubTrigger,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forMenubar [(value)]="open" [orientation]="orientation()" aria-label="Main">
      <button forMenubarTrigger value="file" data-testid="file">File</button>
      @if (open() === 'file') {
        <div forMenuContent>
          <button id="file-new" forMenuItem>New</button>
          <div forMenuSub [(open)]="shareOpen">
            <button id="share" forMenuSubTrigger>Share</button>
            @if (shareOpen()) {
              <div forMenuSubContent>
                <button id="email" forMenuItem>Email</button>
              </div>
            }
          </div>
        </div>
      }
      <button forMenubarTrigger value="edit">Edit</button>
      @if (open() === 'edit') {
        <div forMenuContent>
          <button id="edit-undo" forMenuItem>Undo</button>
        </div>
      }
    </div>
  `,
})
class MenubarHost {
  readonly open = signal<string | null>('file');
  readonly shareOpen = signal(false);
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
}

@Component({
  imports: [ForMenubar, ForMenubarTrigger, ForMenuContent, ForMenuItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forMenubar [(value)]="open" orientation="vertical" aria-label="Main">
      <button forMenubarTrigger value="file" data-testid="file">File</button>
      @if (open() === 'file') {
        <div forMenuContent>
          <button id="file-new" forMenuItem>New</button>
        </div>
      }
    </div>
  `,
})
class VerticalMenubarHost {
  readonly open = signal<string | null>(null);
}

@Component({
  imports: [ForMenubar, ForMenubarTrigger, ForMenuContent, ForMenuItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forMenubar [(value)]="open" aria-label="Main">
      <button forMenubarTrigger value="file" data-testid="file">File</button>
      @if (open() === 'file') {
        <div forMenuContent>
          <button id="file-new" forMenuItem>New</button>
        </div>
      }
    </div>
  `,
})
class HorizontalMenubarHost {
  readonly open = signal<string | null>(null);
}

@Component({
  imports: [
    ForNavigationMenu,
    ForNavigationMenuList,
    ForNavigationMenuItem,
    ForNavigationMenuTrigger,
    ForNavigationMenuContent,
    ForNavigationMenuLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav forNavigationMenu [ariaLabel]="'Main'" [(value)]="open" orientation="vertical">
      <ul forNavigationMenuList>
        <li forNavigationMenuItem value="products">
          <button forNavigationMenuTrigger data-testid="products">Products</button>
          @if (open() === 'products') {
            <div forNavigationMenuContent>
              <a href="/p/a" forNavigationMenuLink>A</a>
            </div>
          }
        </li>
      </ul>
    </nav>
  `,
})
class NavigationMenuHost {
  readonly open = signal<string | null>(null);
}

@Component({
  imports: [ForCombobox, ForComboboxChips, ForComboboxChip, ForComboboxInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forCombobox multiple [(value)]="value">
      <div forComboboxChips>
        @for (v of value(); track v) {
          <span forComboboxChip [value]="v" [attr.data-testid]="'chip-' + v">{{ v }}</span>
        }
        <input forComboboxInput data-testid="input" />
      </div>
    </div>
  `,
})
class ComboboxChipsHost {
  readonly value = signal<readonly string[]>(['a', 'b', 'c']);
}

@Component({
  imports: [ForSlider, ForSliderTrack, ForSliderThumb],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forSlider [(value)]="value">
      <span forSliderTrack>
        <span forSliderThumb [index]="0" ariaLabel="Volume" data-testid="thumb"></span>
      </span>
    </div>
  `,
})
class SliderHost {
  readonly value = signal<readonly number[]>([50]);
}

@Component({
  imports: [ForPaneResizer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div
    forPaneResizer
    orientation="vertical"
    [(value)]="value"
    data-testid="resizer"
  ></div>`,
})
class PaneResizerHost {
  readonly value = signal(50);
}

@Component({
  imports: [ForTable, ForTableHeaderRow, ForTableHeaderCell, ForTableColumnResizer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forTable mode="grid">
      <div forTableHeaderRow>
        <div forTableHeaderCell name="name">
          Name
          <button
            forTableColumnResizer
            column="name"
            [(width)]="width"
            data-testid="resizer"
          ></button>
        </div>
      </div>
    </div>
  `,
})
class ColumnResizerHost {
  readonly width = signal(200);
}

@Component({
  imports: [ForTable, ForTableRow, ForTableCell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forTable mode="grid" ariaLabel="Grid">
      <div role="rowgroup">
        @for (row of rows; track row) {
          <div forTableRow>
            <div forTableCell name="a" [attr.data-testid]="'a-' + row">{{ row }}a</div>
            <div forTableCell name="b" [attr.data-testid]="'b-' + row">{{ row }}b</div>
          </div>
        }
      </div>
    </div>
  `,
})
class GridHost {
  protected readonly rows = [0, 1];
}

@Component({
  imports: [ForToolbar, ForToolbarButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forToolbar aria-label="Format">
      <button forToolbarButton data-testid="bold">Bold</button>
      <button forToolbarButton data-testid="italic">Italic</button>
      <button forToolbarButton data-testid="underline">Underline</button>
    </div>
  `,
})
class ToolbarHost {}

@Component({
  imports: [ForListbox, ForListboxOption, ForListboxReorder],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul
      forListbox
      forListboxReorder
      multiple
      (optionReorder)="moves.push($event)"
      aria-label="Tags"
    >
      @for (tag of tags; track tag) {
        <li>
          <button type="button" forListboxOption [value]="tag" [attr.data-testid]="'opt-' + tag">
            {{ tag }}
          </button>
        </li>
      }
    </ul>
  `,
})
class ListboxReorderHost {
  protected readonly tags = ['a', 'b', 'c'];
  readonly moves: unknown[] = [];
}

@Component({
  imports: [ForTable, ForTableRow, ForTableCell, ForTableRowReorder, ForDraggable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forTable mode="grid" ariaLabel="Reorderable rows">
      <div role="rowgroup" forTableRowReorder (rowReorder)="moves.push($event)">
        @for (row of rows; track row) {
          <div forTableRow forDraggable [dragData]="row">
            <div forTableCell name="a" [attr.data-testid]="'cell-' + row">{{ row }}</div>
          </div>
        }
      </div>
    </div>
  `,
})
class TableRowReorderHost {
  protected readonly rows = [0, 1, 2];
  readonly moves: unknown[] = [];
}

@Component({
  imports: [ForTree, ForTreeNodeDrag, ForTreeItem, ForTreeItemLabel, ForTreeGroup],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul forTree forTreeNodeDrag (nodeDrop)="drops.push($event)" aria-label="Files">
      <li forTreeItem value="docs" data-testid="docs">
        <div forTreeItemLabel>Docs</div>
      </li>
      <li forTreeItem value="music" data-testid="music">
        <div forTreeItemLabel>Music</div>
      </li>
    </ul>
  `,
})
class TreeNodeDragHost {
  readonly drops: unknown[] = [];
}

const chordCase = <T>(c: ChordCase<T>): ChordCase<never> => c as unknown as ChordCase<never>;

const HORIZONTAL_HISTORY_CHORDS = [
  alt('ArrowLeft'),
  alt('ArrowRight'),
  meta('ArrowLeft'),
  meta('ArrowRight'),
];

const CASES: readonly ChordCase<never>[] = [
  chordCase({
    name: 'a 12-hour time field day period segment',
    host: TimeFieldHost,
    target: () => byTestId('dayPeriod'),
    bare: 'p',
    chords: [ctrl('p'), ctrl('a'), meta('p'), meta('a'), ctrl('P')],
    observe: async () => byTestId('dayPeriod').getAttribute('aria-valuetext'),
  }),
  chordCase({
    name: 'a time field hour segment',
    host: TimeFieldHost,
    target: () => byTestId('hour'),
    bare: '1',
    chords: [ctrl('1'), meta('1'), alt('1')],
    observe: async () => byTestId('hour').getAttribute('aria-valuenow'),
  }),
  chordCase({
    name: 'a date field segment',
    host: DateFieldHost,
    arm: async () => byTestId('day').focus(),
    target: () => byTestId('day'),
    bare: 'ArrowLeft',
    chords: [...HORIZONTAL_HISTORY_CHORDS, alt('ArrowUp'), meta('ArrowDown'), meta('Home')],
    observe: async () => [focusedLabel(), byTestId('day').getAttribute('aria-valuetext')],
  }),
  chordCase({
    name: 'a calendar day cell',
    host: CalendarHost,
    arm: async (r: RenderResult<CalendarHost>) => {
      const cell = document.querySelector<HTMLElement>('[forCalendarCell][tabindex="0"]')!;
      cell.focus();
      pressKey(cell, 'ArrowLeft');
      await r.flush();
    },
    target: () => document.activeElement as HTMLElement,
    bare: 'ArrowLeft',
    chords: [
      ...HORIZONTAL_HISTORY_CHORDS,
      alt('ArrowUp'),
      ctrl('Enter'),
      meta('Enter'),
      alt('Enter'),
      ctrl(' '),
    ],
    observe: async (r: RenderResult<CalendarHost>) => [
      tabStop('[forCalendarCell]'),
      r.instance.value()?.getDate(),
    ],
  }),
  chordCase({
    name: 'a calendar month cell',
    host: CalendarMonthHost,
    arm: async () => byTestId('month-6').focus(),
    target: () => byTestId('month-6'),
    bare: 'ArrowLeft',
    chords: [...HORIZONTAL_HISTORY_CHORDS, ctrl('Enter'), meta(' ')],
    observe: async (r: RenderResult<CalendarMonthHost>) => [
      tabStop('[forCalendarMonthCell]'),
      r.instance.view(),
    ],
  }),
  chordCase({
    name: 'a calendar year cell',
    host: CalendarYearHost,
    arm: async () => byTestId('year-2026').focus(),
    target: () => byTestId('year-2026'),
    bare: 'ArrowLeft',
    chords: [...HORIZONTAL_HISTORY_CHORDS, ctrl('Enter'), meta(' ')],
    observe: async (r: RenderResult<CalendarYearHost>) => [
      tabStop('[forCalendarYearCell]'),
      r.instance.view(),
    ],
  }),
  chordCase({
    name: 'a submenu item',
    host: DropdownMenuHost,
    arm: async () => byId('advanced').focus(),
    target: () => byId('advanced'),
    bare: 'ArrowLeft',
    chords: [alt('ArrowLeft'), meta('ArrowLeft')],
    observe: async (r: RenderResult<DropdownMenuHost>) => [r.instance.subOpen(), focusedLabel()],
  }),
  chordCase({
    name: 'a submenu trigger',
    host: DropdownMenuHost,
    arm: async () => byId('deeper').focus(),
    target: () => byId('deeper'),
    bare: 'ArrowRight',
    chords: HORIZONTAL_HISTORY_CHORDS,
    observe: async (r: RenderResult<DropdownMenuHost>) => [
      r.instance.subOpen(),
      r.instance.deepOpen(),
      focusedLabel(),
    ],
  }),
  chordCase({
    name: 'a menubar menu item',
    host: MenubarHost,
    arm: async () => byId('file-new').focus(),
    target: () => byId('file-new'),
    bare: 'ArrowRight',
    chords: HORIZONTAL_HISTORY_CHORDS,
    observe: async (r: RenderResult<MenubarHost>) => [r.instance.open(), focusedLabel()],
  }),
  chordCase({
    name: 'a submenu trigger in a menubar menu',
    host: MenubarHost,
    arm: async () => byId('share').focus(),
    target: () => byId('share'),
    bare: 'ArrowLeft',
    chords: HORIZONTAL_HISTORY_CHORDS,
    observe: async (r: RenderResult<MenubarHost>) => [
      r.instance.open(),
      r.instance.shareOpen(),
      focusedLabel(),
    ],
  }),
  chordCase({
    name: 'a vertical menubar trigger',
    host: VerticalMenubarHost,
    arm: async () => byTestId('file').focus(),
    target: () => byTestId('file'),
    bare: 'ArrowRight',
    chords: HORIZONTAL_HISTORY_CHORDS,
    observe: async (r: RenderResult<VerticalMenubarHost>) => [r.instance.open(), focusedLabel()],
  }),
  chordCase({
    name: 'a vertical navigation menu trigger',
    host: NavigationMenuHost,
    arm: async () => byTestId('products').focus(),
    target: () => byTestId('products'),
    bare: 'ArrowRight',
    chords: HORIZONTAL_HISTORY_CHORDS,
    observe: async (r: RenderResult<NavigationMenuHost>) => [r.instance.open(), focusedLabel()],
  }),
  chordCase({
    name: 'a combobox chip',
    host: ComboboxChipsHost,
    arm: async () => byTestId('chip-b').focus(),
    target: () => byTestId('chip-b'),
    bare: 'ArrowRight',
    chords: HORIZONTAL_HISTORY_CHORDS,
    observe: async () => focusedLabel(),
  }),
  chordCase({
    name: 'a slider thumb',
    host: SliderHost,
    arm: async () => byTestId('thumb').focus(),
    target: () => byTestId('thumb'),
    bare: 'ArrowRight',
    chords: HORIZONTAL_HISTORY_CHORDS,
    observe: async (r: RenderResult<SliderHost>) => r.instance.value(),
  }),
  chordCase({
    name: 'a pane resizer',
    host: PaneResizerHost,
    arm: async () => byTestId('resizer').focus(),
    target: () => byTestId('resizer'),
    bare: 'ArrowRight',
    chords: HORIZONTAL_HISTORY_CHORDS,
    observe: async (r: RenderResult<PaneResizerHost>) => r.instance.value(),
  }),
  chordCase({
    name: 'a table column resizer',
    host: ColumnResizerHost,
    arm: async () => byTestId('resizer').focus(),
    target: () => byTestId('resizer'),
    bare: 'ArrowRight',
    chords: HORIZONTAL_HISTORY_CHORDS,
    observe: async (r: RenderResult<ColumnResizerHost>) => r.instance.width(),
  }),
  chordCase({
    name: 'a grid cell',
    host: GridHost,
    arm: async () => byTestId('b-0').focus(),
    target: () => byTestId('b-0'),
    bare: 'ArrowLeft',
    chords: HORIZONTAL_HISTORY_CHORDS,
    observe: async () => focusedLabel(),
  }),
  chordCase({
    name: 'a toolbar item',
    host: ToolbarHost,
    arm: async () => byTestId('italic').focus(),
    target: () => byTestId('italic'),
    bare: 'ArrowLeft',
    chords: HORIZONTAL_HISTORY_CHORDS,
    observe: async () => focusedLabel(),
  }),
  chordCase({
    name: 'a lifted listbox option',
    host: ListboxReorderHost,
    arm: async (r: RenderResult<ListboxReorderHost>) => lift(r, byTestId('opt-b')),
    target: () => byTestId('opt-b'),
    bare: 'ArrowRight',
    chords: HORIZONTAL_HISTORY_CHORDS,
    observe: async (r: RenderResult<ListboxReorderHost>) => {
      pressKey(byTestId('opt-b'), ' ');
      await r.flush();
      return r.instance.moves;
    },
  }),
  chordCase({
    name: 'a lifted table row',
    host: TableRowReorderHost,
    arm: async (r: RenderResult<TableRowReorderHost>) => lift(r, byTestId('cell-1')),
    target: () => byTestId('cell-1'),
    bare: 'ArrowLeft',
    chords: HORIZONTAL_HISTORY_CHORDS,
    observe: async (r: RenderResult<TableRowReorderHost>) => {
      pressKey(byTestId('cell-1'), ' ');
      await r.flush();
      return [r.instance.moves, focusedLabel()];
    },
  }),
  chordCase({
    name: 'a lifted tree node',
    host: TreeNodeDragHost,
    arm: async (r: RenderResult<TreeNodeDragHost>) => lift(r, byTestId('music')),
    target: () => byTestId('music'),
    bare: 'ArrowRight',
    chords: HORIZONTAL_HISTORY_CHORDS,
    observe: async (r: RenderResult<TreeNodeDragHost>) => {
      pressKey(byTestId('music'), ' ');
      await r.flush();
      return r.instance.drops;
    },
  }),
];

async function mount(c: ChordCase<never>): Promise<RenderResult<never>> {
  const r = renderHost(c.host);
  await r.flush();
  await c.arm?.(r);
  await r.flush();
  return r;
}

const describeChord = ({ key, init }: Chord): string =>
  [
    init.ctrlKey && 'Ctrl',
    init.altKey && 'Alt',
    init.metaKey && 'Meta',
    key === ' ' ? 'Space' : key,
  ]
    .filter(Boolean)
    .join('+');

describe('modifier chords reach the browser from every hand-written keydown handler', () => {
  afterEachOverlayCleanup();

  let restoreObservers: () => void;
  beforeEach(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterEach(() => restoreObservers());

  describe.each(CASES)('$name', (c) => {
    it(`still claims the bare ${c.bare}`, async () => {
      const r = await mount(c);

      const event = pressKey(c.target(r), c.bare);
      await r.flush();

      expect(event.defaultPrevented).toBe(true);
    });

    it.each(c.chords.map((chord) => [describeChord(chord), chord] as const))(
      'leaves %s unprevented and acts on nothing',
      async (_label, chord) => {
        const baseline = await c.observe(await mount(c));
        TestBed.resetTestingModule();

        const r = await mount(c);
        const event = pressKey(c.target(r), chord.key, chord.init);
        await r.flush();

        expect(event.defaultPrevented).toBe(false);
        expect(await c.observe(r)).toEqual(baseline);
      },
    );
  });

  it('opens a horizontal menubar menu on Alt+ArrowDown', async () => {
    const r = renderHost(HorizontalMenubarHost);
    await r.flush();
    byTestId('file').focus();

    const event = pressKey(byTestId('file'), 'ArrowDown', { altKey: true });
    await r.flush();

    expect(event.defaultPrevented).toBe(true);
    expect(r.instance.open()).toBe('file');
  });

  it('types a digit composed through AltGraph into a time segment', async () => {
    const r = renderHost(TimeFieldHost);
    await r.flush();
    byTestId('hour').focus();

    const event = pressKey(byTestId('hour'), '1', {
      ctrlKey: true,
      altKey: true,
      modifierAltGraph: true,
    });
    await r.flush();

    expect(event.defaultPrevented).toBe(true);
    expect(byTestId('hour').getAttribute('aria-valuenow')).toBe('1');
  });
});

const CHORD_MODULE = 'core/src/keyboard-navigation/modifier-chord.ts';
const HORIZONTAL_ARROW = /'Arrow(?:Left|Right)'/;
const KEYDOWN_HANDLER =
  /\(keydown\)|addEventListener\(\s*'keydown'|onLiftedKeydown|onKeyDown|handleKeydown/;
const TYPES_A_KEY = /\bunicodeDigitValue\(|\bsetDayPeriodFromKey\(/;
const INLINE_HISTORY_CHORD = /\b(\w+)\.altKey\s*\|\|\s*\1\.metaKey\b/;

const NOT_A_HANDLER: Readonly<Record<string, string>> = {
  'slider/src/slider.ts': 'maps an arrow the thumb already accepted to a direction',
  'slider/src/slider-context.ts': 'declares the arrow key type',
  'combobox/src/combobox-input.ts':
    'never prevents a horizontal arrow, so the caret moves natively',
};

function horizontalArrowSources(sources: ReadonlyMap<string, string> = LIBRARY_CODE): string[] {
  return [...sources]
    .filter(([path, code]) => path !== CHORD_MODULE && HORIZONTAL_ARROW.test(code))
    .map(([path]) => path)
    .sort();
}

function typingHandlers(sources: ReadonlyMap<string, string> = LIBRARY_CODE): string[] {
  return [...sources]
    .filter(([, code]) => TYPES_A_KEY.test(code) && KEYDOWN_HANDLER.test(code))
    .map(([path]) => path)
    .sort();
}

describe('modifier chord adoption', () => {
  it('derives a live family of horizontal-arrow handlers', () => {
    const family = horizontalArrowSources();

    expect(family).toContain('core/src/datetime/segment-directive.ts');
    expect(family).toContain('calendar/src/calendar-keyboard.ts');
    expect(family).toContain('menu/src/menu-horizontal-arrow.ts');
    expect(family).toContain('combobox/src/combobox-chip.ts');
    expect(family.length).toBeGreaterThan(15);
  });

  it('asks isHistoryChord in every source that acts on a horizontal arrow', () => {
    const unguarded = horizontalArrowSources().filter(
      (path) => !(path in NOT_A_HANDLER) && !LIBRARY_CODE.get(path)!.includes('isHistoryChord('),
    );

    expect(unguarded).toEqual([]);
  });

  it('keeps every exemption naming a source that still mentions a horizontal arrow', () => {
    const family = horizontalArrowSources();

    expect(Object.keys(NOT_A_HANDLER).filter((path) => !family.includes(path))).toEqual([]);
  });

  it('asks isShortcutChord in every keydown handler that types a key', () => {
    const family = typingHandlers();

    expect(family).toContain('core/src/datetime/segment-directive.ts');
    expect(family.filter((path) => !LIBRARY_CODE.get(path)!.includes('isShortcutChord('))).toEqual(
      [],
    );
  });

  it('defines the history chord once', () => {
    const inline = [...LIBRARY_CODE]
      .filter(([path, code]) => path !== CHORD_MODULE && INLINE_HISTORY_CHORD.test(code))
      .map(([path]) => path);

    expect(inline).toEqual([]);
  });

  it('counts a handler that only names a horizontal arrow through a ternary', () => {
    const sources = new Map([
      ['a/src/a.ts', "const open = rtl ? 'ArrowLeft' : 'ArrowRight';"],
      ['b/src/b.ts', "if (event.key === 'ArrowDown') {}"],
      [CHORD_MODULE, "'ArrowLeft'"],
    ]);

    expect(horizontalArrowSources(sources)).toEqual(['a/src/a.ts']);
  });
});
