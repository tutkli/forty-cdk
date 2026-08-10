import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import {
  ForCombobox,
  ForComboboxAction,
  ForComboboxChips,
  ForComboboxClear,
  ForComboboxContent,
  ForComboboxGroup,
  ForComboboxGroupLabel,
  ForComboboxInput,
  ForComboboxList,
  ForComboboxOption,
} from 'forty-cdk/combobox';
import {
  ForListbox,
  ForListboxGroup,
  ForListboxGroupLabel,
  ForListboxOption,
} from 'forty-cdk/listbox';
import { ForRadio, ForRadioGroup } from 'forty-cdk/radio-group';
import {
  ForSelect,
  ForSelectContent,
  ForSelectGroup,
  ForSelectGroupLabel,
  ForSelectOption,
  ForSelectTrigger,
} from 'forty-cdk/select';
import {
  ForTable,
  ForTableCell,
  ForTableHeaderCell,
  ForTableHeaderRow,
  ForTableRow,
  ForTableRowSelector,
  ForTableSelectAll,
} from 'forty-cdk/table';
import { ForTree, ForTreeItem, ForTreeItemLabel } from 'forty-cdk/tree';

import type { StaticAdoptionAdopter } from './mount';

@Component({
  imports: [ForListbox, ForListboxGroup, ForListboxGroupLabel, ForListboxOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ul forListbox [(value)]="value" aria-label="Probe toppings">
    <li forListboxGroup aria-labelledby="probe-group-labelledby">
      <div forListboxGroupLabel id="probe-group-label">Group</div>
      <button type="button" forListboxOption value="a" id="probe-option">A</button>
    </li>
  </ul>`,
})
class ListboxAdopted {
  readonly value = signal<readonly string[]>([]);
}

@Component({
  imports: [ForListbox, ForListboxGroup, ForListboxGroupLabel, ForListboxOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ul forListbox [(value)]="value">
    <li forListboxGroup>
      <div forListboxGroupLabel>Group</div>
      <button type="button" forListboxOption value="a">A</button>
    </li>
  </ul>`,
})
class ListboxBare {
  readonly value = signal<readonly string[]>([]);
}

@Component({
  imports: [
    ForSelect,
    ForSelectTrigger,
    ForSelectContent,
    ForSelectGroup,
    ForSelectGroupLabel,
    ForSelectOption,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forSelect [(value)]="value" [(open)]="open">
    <button forSelectTrigger id="probe-trigger">Select</button>
    @if (open()) {
      <div
        forSelectContent
        id="probe-content"
        aria-label="Probe toppings surface"
        aria-labelledby="probe-labelledby"
      >
        <div forSelectGroup aria-labelledby="probe-group-labelledby">
          <div forSelectGroupLabel id="probe-group-label">Group</div>
          <button forSelectOption value="a" id="probe-option">A</button>
        </div>
      </div>
    }
  </div>`,
})
class SelectAdopted {
  readonly value = signal<readonly string[]>([]);
  readonly open = signal(true);
}

@Component({
  imports: [
    ForSelect,
    ForSelectTrigger,
    ForSelectContent,
    ForSelectGroup,
    ForSelectGroupLabel,
    ForSelectOption,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forSelect [(value)]="value" [(open)]="open">
    <button forSelectTrigger>Select</button>
    @if (open()) {
      <div forSelectContent>
        <div forSelectGroup>
          <div forSelectGroupLabel>Group</div>
          <button forSelectOption value="a">A</button>
        </div>
      </div>
    }
  </div>`,
})
class SelectBare {
  readonly value = signal<readonly string[]>([]);
  readonly open = signal(true);
}

@Component({
  imports: [
    ForCombobox,
    ForComboboxInput,
    ForComboboxContent,
    ForComboboxList,
    ForComboboxGroup,
    ForComboboxGroupLabel,
    ForComboboxOption,
    ForComboboxAction,
    ForComboboxClear,
    ForComboboxChips,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forCombobox [(query)]="query" [(value)]="value" [(open)]="open" multiple>
    <div forComboboxChips aria-label="Probe chips"></div>
    <input forComboboxInput id="probe-input" />
    <button forComboboxClear aria-label="Probe reset">x</button>
    @if (open()) {
      <div
        forComboboxContent
        id="probe-content"
        aria-label="Probe results surface"
        aria-labelledby="probe-labelledby"
      >
        <div
          forComboboxList
          id="probe-list"
          aria-label="Probe results"
          aria-labelledby="probe-list-labelledby"
        >
          <div forComboboxGroup aria-labelledby="probe-group-labelledby">
            <div forComboboxGroupLabel id="probe-group-label">Group</div>
            <div forComboboxOption value="a" id="probe-option">A</div>
          </div>
        </div>
        <button forComboboxAction id="probe-action">Create</button>
      </div>
    }
  </div>`,
})
class ComboboxAdopted {
  readonly query = signal('');
  readonly value = signal<readonly string[]>([]);
  readonly open = signal(true);
}

@Component({
  imports: [
    ForCombobox,
    ForComboboxInput,
    ForComboboxContent,
    ForComboboxList,
    ForComboboxGroup,
    ForComboboxGroupLabel,
    ForComboboxOption,
    ForComboboxAction,
    ForComboboxClear,
    ForComboboxChips,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forCombobox [(query)]="query" [(value)]="value" [(open)]="open" multiple>
    <div forComboboxChips></div>
    <input forComboboxInput />
    <button forComboboxClear>x</button>
    @if (open()) {
      <div forComboboxContent>
        <div forComboboxList>
          <div forComboboxGroup>
            <div forComboboxGroupLabel>Group</div>
            <div forComboboxOption value="a">A</div>
          </div>
        </div>
        <button forComboboxAction>Create</button>
      </div>
    }
  </div>`,
})
class ComboboxBare {
  readonly query = signal('');
  readonly value = signal<readonly string[]>([]);
  readonly open = signal(true);
}

@Component({
  imports: [ForRadioGroup, ForRadio],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forRadioGroup [(value)]="value">
    <button type="button" forRadio value="a" id="probe-radio">A</button>
  </div>`,
})
class RadioGroupAdopted {
  readonly value = signal('');
}

@Component({
  imports: [ForRadioGroup, ForRadio],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forRadioGroup [(value)]="value">
    <button type="button" forRadio value="a">A</button>
  </div>`,
})
class RadioGroupBare {
  readonly value = signal('');
}

@Component({
  imports: [ForTree, ForTreeItem, ForTreeItemLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ul forTree [totalCount]="1" aria-label="Probe files">
    <li
      forTreeItem
      value="a"
      id="probe-item"
      [itemIndex]="0"
      [level]="1"
      [setSize]="1"
      [posInSet]="1"
    >
      <div forTreeItemLabel>A</div>
    </li>
  </ul>`,
})
class TreeAdopted {}

@Component({
  imports: [ForTree, ForTreeItem, ForTreeItemLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ul forTree [totalCount]="1">
    <li forTreeItem value="a" [itemIndex]="0" [level]="1" [setSize]="1" [posInSet]="1">
      <div forTreeItemLabel>A</div>
    </li>
  </ul>`,
})
class TreeBare {}

@Component({
  imports: [
    ForTable,
    ForTableHeaderRow,
    ForTableHeaderCell,
    ForTableRow,
    ForTableCell,
    ForTableRowSelector,
    ForTableSelectAll,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forTable selectionMode="multiple" aria-label="Probe people">
    <div role="rowgroup">
      <div forTableHeaderRow>
        <div forTableHeaderCell name="sel">
          <span forTableSelectAll aria-label="Probe select all"></span>
        </div>
        <div forTableHeaderCell name="name">Name</div>
      </div>
    </div>
    <div role="rowgroup">
      <div forTableRow value="1">
        <div forTableCell name="sel">
          <span forTableRowSelector aria-label="Probe select row"></span>
        </div>
        <div forTableCell name="name">Ada</div>
      </div>
    </div>
  </div>`,
})
class TableAdopted {}

@Component({
  imports: [
    ForTable,
    ForTableHeaderRow,
    ForTableHeaderCell,
    ForTableRow,
    ForTableCell,
    ForTableRowSelector,
    ForTableSelectAll,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forTable selectionMode="multiple">
    <div role="rowgroup">
      <div forTableHeaderRow>
        <div forTableHeaderCell name="sel">
          <span forTableSelectAll></span>
        </div>
        <div forTableHeaderCell name="name">Name</div>
      </div>
    </div>
    <div role="rowgroup">
      <div forTableRow value="1">
        <div forTableCell name="sel"><span forTableRowSelector></span></div>
        <div forTableCell name="name">Ada</div>
      </div>
    </div>
  </div>`,
})
class TableBare {}

/**
 * The selection collections: an id on every option / group label, the group's
 * `aria-labelledby` fallback to its label, and the root or surface's optional
 * accessible name — plus Combobox's two defaults-backed names, where a static
 * attribute is a per-instance override of the scope default.
 */
export const COLLECTION_FAMILY_ADOPTERS: readonly StaticAdoptionAdopter[] = [
  {
    label: 'Listbox',
    adopted: ListboxAdopted,
    bare: ListboxBare,
    claims: [
      {
        key: '[forListboxOption]',
        channel: 'id',
        source: 'listbox/src/listbox-option.ts',
        seam: 'hostId',
        probe: 'probe-option',
        fallback: { generated: 'for-listbox-option' },
      },
      {
        key: '[forListboxGroupLabel]',
        channel: 'id',
        source: 'core/src/collection/register-handle.ts',
        seam: 'resolveHostId',
        probe: 'probe-group-label',
        fallback: { generated: 'for-listbox-group-label' },
      },
      {
        key: '[forListboxGroup]',
        channel: 'aria-labelledby',
        source: 'listbox/src/listbox-group.ts',
        seam: 'hostLabelledBy',
        probe: 'probe-group-labelledby',
        fallback: { pairs: '[forListboxGroupLabel]' },
      },
      {
        key: '[forListbox]',
        channel: 'aria-label',
        source: 'listbox/src/listbox.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe toppings',
        fallback: null,
      },
    ],
  },
  {
    label: 'Select',
    adopted: SelectAdopted,
    bare: SelectBare,
    claims: [
      {
        key: '[forSelectTrigger]',
        channel: 'id',
        source: 'core-overlay/src/overlay-controller/element-registry.ts',
        seam: 'adoptHostId',
        probe: 'probe-trigger',
        fallback: { generated: 'for-select-trigger' },
      },
      {
        key: '[forSelectContent]',
        channel: 'id',
        source: 'core-overlay/src/overlay-controller/element-registry.ts',
        seam: 'adoptHostId',
        probe: 'probe-content',
        fallback: { generated: 'for-select-content' },
      },
      {
        key: '[forSelectOption]',
        channel: 'id',
        source: 'select/src/select-option.ts',
        seam: 'hostId',
        probe: 'probe-option',
        fallback: { generated: 'for-select-option' },
      },
      {
        key: '[forSelectGroupLabel]',
        channel: 'id',
        source: 'core/src/collection/register-handle.ts',
        seam: 'resolveHostId',
        probe: 'probe-group-label',
        fallback: { generated: 'for-select-group-label' },
      },
      {
        key: '[forSelectGroup]',
        channel: 'aria-labelledby',
        source: 'select/src/select-group.ts',
        seam: 'hostLabelledBy',
        probe: 'probe-group-labelledby',
        fallback: { pairs: '[forSelectGroupLabel]' },
      },
      {
        key: '[forSelectContent]',
        channel: 'aria-labelledby',
        source: 'select/src/select-content.ts',
        seam: 'hostLabelledBy',
        probe: 'probe-labelledby',
        fallback: { pairs: '[forSelectTrigger]' },
      },
      {
        key: '[forSelectContent]',
        channel: 'aria-label',
        source: 'select/src/select-content.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe toppings surface',
        fallback: null,
      },
    ],
  },
  {
    label: 'Combobox',
    adopted: ComboboxAdopted,
    bare: ComboboxBare,
    claims: [
      {
        key: '[forComboboxInput]',
        channel: 'id',
        source: 'core-overlay/src/overlay-controller/element-registry.ts',
        seam: 'adoptHostId',
        probe: 'probe-input',
        fallback: { generated: 'for-combobox-input' },
      },
      {
        key: '[forComboboxContent]',
        channel: 'id',
        source: 'core-overlay/src/overlay-controller/element-registry.ts',
        seam: 'adoptHostId',
        probe: 'probe-content',
        fallback: { generated: 'for-combobox-content' },
      },
      {
        key: '[forComboboxList]',
        channel: 'id',
        source: 'core-overlay/src/overlay-controller/element-registry.ts',
        seam: 'adoptHostId',
        probe: 'probe-list',
        fallback: { generated: 'for-combobox-list' },
      },
      {
        key: '[forComboboxOption]',
        channel: 'id',
        source: 'combobox/src/combobox-option.ts',
        seam: 'hostId',
        probe: 'probe-option',
        fallback: { generated: 'for-combobox-option' },
      },
      {
        key: '[forComboboxAction]',
        channel: 'id',
        source: 'combobox/src/combobox-action.ts',
        seam: 'hostId',
        probe: 'probe-action',
        fallback: { generated: 'for-combobox-action' },
      },
      {
        key: '[forComboboxGroupLabel]',
        channel: 'id',
        source: 'core/src/collection/register-handle.ts',
        seam: 'resolveHostId',
        probe: 'probe-group-label',
        fallback: { generated: 'for-combobox-group-label' },
      },
      {
        key: '[forComboboxGroup]',
        channel: 'aria-labelledby',
        source: 'combobox/src/combobox-group.ts',
        seam: 'hostLabelledBy',
        probe: 'probe-group-labelledby',
        fallback: { pairs: '[forComboboxGroupLabel]' },
      },
      {
        key: '[forComboboxList]',
        channel: 'aria-labelledby',
        source: 'combobox/src/combobox-list.ts',
        seam: 'hostLabelledBy',
        probe: 'probe-list-labelledby',
        fallback: { pairs: '[forComboboxInput]' },
      },
      {
        key: '[forComboboxContent]',
        channel: 'aria-labelledby',
        source: 'combobox/src/combobox-content.ts',
        seam: 'hostLabelledBy',
        probe: 'probe-labelledby',
        fallback: null,
      },
      {
        key: '[forComboboxContent]',
        channel: 'aria-label',
        source: 'combobox/src/combobox-content.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe results surface',
        fallback: null,
      },
      {
        key: '[forComboboxList]',
        channel: 'aria-label',
        source: 'combobox/src/combobox-list.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe results',
        fallback: null,
      },
      {
        key: '[forComboboxClear]',
        channel: 'aria-label',
        source: 'combobox/src/combobox-clear.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe reset',
        fallback: 'Clear',
      },
      {
        key: '[forComboboxChips]',
        channel: 'aria-label',
        source: 'combobox/src/combobox-chips.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe chips',
        fallback: 'Selected items',
      },
    ],
  },
  {
    label: 'RadioGroup',
    adopted: RadioGroupAdopted,
    bare: RadioGroupBare,
    claims: [
      {
        key: '[forRadio]',
        channel: 'id',
        source: 'radio-group/src/radio.ts',
        seam: 'hostId',
        probe: 'probe-radio',
        fallback: { generated: 'for-radio' },
      },
    ],
  },
  {
    label: 'Tree',
    adopted: TreeAdopted,
    bare: TreeBare,
    claims: [
      {
        key: '[forTreeItem]',
        channel: 'id',
        source: 'tree/src/tree-item.ts',
        seam: 'hostId',
        probe: 'probe-item',
        fallback: { generated: 'for-tree-item' },
      },
      {
        key: '[forTree]',
        channel: 'aria-label',
        source: 'tree/src/tree.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe files',
        fallback: null,
      },
    ],
  },
  {
    label: 'Table',
    adopted: TableAdopted,
    bare: TableBare,
    claims: [
      {
        key: '[forTable]',
        channel: 'aria-label',
        source: 'table/src/table.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe people',
        fallback: null,
      },
      {
        key: '[forTableSelectAll]',
        channel: 'aria-label',
        source: 'table/src/table-select-all.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe select all',
        fallback: null,
      },
      {
        key: '[forTableRowSelector]',
        channel: 'aria-label',
        source: 'table/src/table-row-selector.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe select row',
        fallback: null,
      },
    ],
  },
];
