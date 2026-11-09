import { Component, signal } from '@angular/core';
import {
  ForCombobox,
  ForComboboxAction,
  ForComboboxAnchor,
  ForComboboxChip,
  ForComboboxChipRemove,
  ForComboboxChips,
  ForComboboxClear,
  ForComboboxContent,
  ForComboboxEmpty,
  ForComboboxGroup,
  ForComboboxGroupLabel,
  ForComboboxIndicator,
  ForComboboxInput,
  ForComboboxList,
  ForComboboxOption,
  ForComboboxSeparator,
  ForComboboxStatus,
  ForComboboxToggle,
  ForComboboxTrigger,
  ForComboboxVirtualized,
} from 'forty-cdk/combobox';
import {
  ForListbox,
  ForListboxController,
  ForListboxGroup,
  ForListboxGroupLabel,
  ForListboxOption,
  ForListboxOptionIndicator,
  ForListboxReorder,
  ForListboxVirtualized,
} from 'forty-cdk/listbox';
import {
  ForSelect,
  ForSelectAnchor,
  ForSelectContent,
  ForSelectGroup,
  ForSelectGroupLabel,
  ForSelectIndicator,
  ForSelectOption,
  ForSelectSeparator,
  ForSelectTrigger,
  ForSelectValue,
  ForSelectVirtualized,
} from 'forty-cdk/select';
import {
  ForTree,
  ForTreeGroup,
  ForTreeItem,
  ForTreeItemCheckbox,
  ForTreeItemCheckboxIndicator,
  ForTreeItemLabel,
  ForTreeItemToggle,
  ForTreeNodeDrag,
  ForTreeNodeDragHandle,
  ForTreeVirtualized,
} from 'forty-cdk/tree';

@Component({
  imports: [ForSelect, ForSelectTrigger, ForSelectValue, ForSelectContent, ForSelectOption],
  template: `
    <div forSelect [open]="true" [(value)]="value">
      <button forSelectTrigger>
        <span forSelectValue></span>
      </button>
      <div forSelectContent>
        <button forSelectOption value="a">A</button>
      </div>
    </div>
  `,
})
export class SelectOpenFixture {
  readonly value = signal<readonly string[]>(['a']);
}

@Component({
  imports: [ForSelect, ForSelectTrigger, ForSelectContent, ForSelectOption, ForSelectVirtualized],
  template: `
    <div forSelect forSelectVirtualized [open]="true" [totalCount]="3" [(value)]="value">
      <button forSelectTrigger>T</button>
      <div forSelectContent>
        <button forSelectOption value="a" [posInSet]="0">A</button>
        <button forSelectOption value="b" [posInSet]="1">B</button>
        <button forSelectOption value="c" [posInSet]="2">C</button>
      </div>
    </div>
  `,
})
export class SelectVirtualizedOpenFixture {
  readonly value = signal<readonly string[]>([]);
}

@Component({
  imports: [
    ForCombobox,
    ForComboboxInput,
    ForComboboxContent,
    ForComboboxList,
    ForComboboxOption,
    ForComboboxAction,
    ForComboboxToggle,
  ],
  template: `
    <div forCombobox [open]="true">
      <input forComboboxInput />
      <button forComboboxToggle></button>
      <div forComboboxContent>
        <button forComboboxAction>Create new</button>
        <div forComboboxList>
          <div forComboboxOption value="a" label="A">A</div>
        </div>
      </div>
    </div>
  `,
})
export class ComboboxOpenFixture {}

@Component({
  imports: [ForListbox, ForListboxOption],
  template: `
    <ul forListbox ariaLabel="Fruit">
      <li><button type="button" forListboxOption value="apple">Apple</button></li>
    </ul>
  `,
})
export class ListboxFixture {}

@Component({
  imports: [ForListbox, ForListboxController, ForListboxOption],
  template: `
    <input [forListboxController]="commands" aria-label="Search commands" />
    <div forListbox #commands="forListbox" ariaLabel="Commands">
      <button type="button" forListboxOption value="open">Open</button>
    </div>
  `,
})
export class ListboxControllerFixture {}

@Component({
  imports: [ForListbox, ForListboxOption, ForListboxVirtualized],
  template: `
    <div forListbox forListboxVirtualized ariaLabel="Virtualized" [totalCount]="3">
      <button type="button" forListboxOption value="a" [posInSet]="0">A</button>
      <button type="button" forListboxOption value="b" [posInSet]="1">B</button>
      <button type="button" forListboxOption value="c" [posInSet]="2">C</button>
    </div>
  `,
})
export class ListboxVirtualizedFixture {}

@Component({
  imports: [ForListbox, ForListboxOption, ForListboxReorder],
  template: `
    <ul forListbox forListboxReorder multiple ariaLabel="Tags">
      <li><button type="button" forListboxOption value="a">Alpha</button></li>
      <li><button type="button" forListboxOption value="b">Beta</button></li>
    </ul>
  `,
})
export class ListboxReorderFixture {}

@Component({
  imports: [ForTree, ForTreeItem, ForTreeItemLabel, ForTreeItemToggle, ForTreeGroup],
  template: `
    <ul forTree ariaLabel="Files">
      <li forTreeItem value="root">
        <div forTreeItemLabel>
          <span forTreeItemToggle>▸</span>
          Root
        </div>
        <ul forTreeGroup>
          <li forTreeItem value="child">
            <div forTreeItemLabel>Child</div>
          </li>
        </ul>
      </li>
    </ul>
  `,
})
export class TreeFixture {}

@Component({
  imports: [
    ForTree,
    ForTreeItem,
    ForTreeItemLabel,
    ForTreeItemCheckbox,
    ForTreeItemCheckboxIndicator,
  ],
  template: `
    <ul forTree selectionMode="checkbox" ariaLabel="Categories">
      <li forTreeItem value="a">
        <div forTreeItemLabel>
          <span forTreeItemCheckbox>
            <span forTreeItemCheckboxIndicator>✓</span>
          </span>
          Alpha
        </div>
      </li>
      <li forTreeItem value="b">
        <div forTreeItemLabel>
          <span forTreeItemCheckbox>
            <span forTreeItemCheckboxIndicator>✓</span>
          </span>
          Beta
        </div>
      </li>
    </ul>
  `,
})
export class TreeCheckboxFixture {}

@Component({
  imports: [
    ForTree,
    ForTreeItem,
    ForTreeItemLabel,
    ForTreeItemCheckbox,
    ForTreeItemCheckboxIndicator,
  ],
  template: `
    <ul forTree selectionMode="checkbox" cascade [descendantsOf]="descendantsFn" ariaLabel="Groups">
      <li forTreeItem value="parent">
        <div forTreeItemLabel>
          <span forTreeItemCheckbox>
            <span forTreeItemCheckboxIndicator>✓</span>
          </span>
          Parent
        </div>
      </li>
      <li forTreeItem value="child">
        <div forTreeItemLabel>
          <span forTreeItemCheckbox>
            <span forTreeItemCheckboxIndicator>✓</span>
          </span>
          Child
        </div>
      </li>
    </ul>
  `,
})
export class TreeCascadeFixture {
  readonly descendantsFn = (v: string): readonly string[] => (v === 'parent' ? ['child'] : []);
}

@Component({
  imports: [ForTree, ForTreeItem, ForTreeItemLabel, ForTreeVirtualized],
  template: `
    <ul forTree forTreeVirtualized ariaLabel="Virtualized" [totalCount]="3">
      <li forTreeItem value="a" [level]="1" [setSize]="3" [posInSet]="1" [itemIndex]="0">
        <div forTreeItemLabel>A</div>
      </li>
      <li forTreeItem value="b" [level]="1" [setSize]="3" [posInSet]="2" [itemIndex]="1">
        <div forTreeItemLabel>B</div>
      </li>
      <li forTreeItem value="c" [level]="1" [setSize]="3" [posInSet]="3" [itemIndex]="2">
        <div forTreeItemLabel>C</div>
      </li>
    </ul>
  `,
})
export class TreeVirtualizedFixture {}

@Component({
  imports: [
    ForTree,
    ForTreeNodeDrag,
    ForTreeNodeDragHandle,
    ForTreeItem,
    ForTreeItemLabel,
    ForTreeItemToggle,
    ForTreeGroup,
  ],
  template: `
    <ul forTree forTreeNodeDrag ariaLabel="Files">
      <li forTreeItem value="root">
        <div forTreeItemLabel>
          <span forTreeNodeDragHandle aria-hidden="true">⠿</span>
          <span forTreeItemToggle>▸</span>
          Root
        </div>
        @if (true) {
          <ul forTreeGroup>
            <li forTreeItem value="child">
              <div forTreeItemLabel>
                <span forTreeNodeDragHandle aria-hidden="true">⠿</span>
                Child
              </div>
            </li>
          </ul>
        }
      </li>
    </ul>
  `,
})
export class TreeNodeDragFixture {}

@Component({
  imports: [
    ForSelect,
    ForSelectAnchor,
    ForSelectTrigger,
    ForSelectValue,
    ForSelectContent,
    ForSelectGroup,
    ForSelectGroupLabel,
    ForSelectOption,
    ForSelectIndicator,
    ForSelectSeparator,
  ],
  template: `
    <div forSelect [open]="true" [(value)]="value">
      <div forSelectAnchor>
        <button forSelectTrigger>
          <span forSelectValue></span>
        </button>
      </div>
      <div forSelectContent>
        <div forSelectGroup>
          <div forSelectGroupLabel>Letters</div>
          <button forSelectOption value="a">A <span forSelectIndicator>✓</span></button>
        </div>
        <div forSelectSeparator></div>
        <button forSelectOption value="b">B</button>
      </div>
    </div>
  `,
})
export class SelectGroupedOpenFixture {
  readonly value = signal<readonly string[]>(['a']);
}

@Component({
  imports: [
    ForCombobox,
    ForComboboxAnchor,
    ForComboboxTrigger,
    ForComboboxContent,
    ForComboboxInput,
    ForComboboxList,
    ForComboboxGroup,
    ForComboboxGroupLabel,
    ForComboboxOption,
    ForComboboxIndicator,
    ForComboboxSeparator,
    ForComboboxEmpty,
    ForComboboxStatus,
  ],
  template: `
    <div forCombobox [open]="true" [(value)]="value">
      <span id="ssr-picker-label">Country</span>
      <div forComboboxAnchor>
        <button forComboboxTrigger aria-labelledby="ssr-picker-label">A</button>
      </div>
      <div forComboboxContent>
        <input forComboboxInput aria-label="Search countries" />
        <div forComboboxList>
          <div forComboboxGroup>
            <div forComboboxGroupLabel>Europe</div>
            <div forComboboxOption value="a" label="A">A <span forComboboxIndicator>✓</span></div>
          </div>
          <div forComboboxSeparator></div>
          <div forComboboxOption value="b" label="B">B</div>
        </div>
        <div forComboboxEmpty>No matches.</div>
        <div forComboboxStatus>2 results</div>
      </div>
    </div>
  `,
})
export class ComboboxPickerOpenFixture {
  readonly value = signal<readonly string[]>(['a']);
}

@Component({
  imports: [
    ForCombobox,
    ForComboboxChips,
    ForComboboxChip,
    ForComboboxChipRemove,
    ForComboboxInput,
    ForComboboxClear,
    ForComboboxContent,
    ForComboboxOption,
  ],
  template: `
    <div forCombobox multiple [open]="true" [(value)]="value">
      <div forComboboxChips>
        @for (chip of value(); track chip) {
          <span forComboboxChip [value]="chip">
            {{ chip }}
            <button forComboboxChipRemove>×</button>
          </span>
        }
        <input forComboboxInput aria-label="Tags" />
      </div>
      <button forComboboxClear>×</button>
      <div forComboboxContent>
        <div forComboboxOption value="a" label="Alpha">Alpha</div>
      </div>
    </div>
  `,
})
export class ComboboxChipsOpenFixture {
  readonly value = signal<readonly string[]>(['a']);
}

@Component({
  imports: [
    ForCombobox,
    ForComboboxVirtualized,
    ForComboboxInput,
    ForComboboxContent,
    ForComboboxOption,
  ],
  template: `
    <div forCombobox forComboboxVirtualized [open]="true" [totalCount]="3">
      <input forComboboxInput aria-label="Letters" />
      <div forComboboxContent>
        <div forComboboxOption value="a" label="A" [posInSet]="0">A</div>
        <div forComboboxOption value="b" label="B" [posInSet]="1">B</div>
        <div forComboboxOption value="c" label="C" [posInSet]="2">C</div>
      </div>
    </div>
  `,
})
export class ComboboxVirtualizedOpenFixture {}

@Component({
  imports: [
    ForListbox,
    ForListboxGroup,
    ForListboxGroupLabel,
    ForListboxOption,
    ForListboxOptionIndicator,
  ],
  template: `
    <div forListbox ariaLabel="Fruit">
      <div forListboxGroup>
        <div forListboxGroupLabel>Citrus</div>
        <button type="button" forListboxOption value="lemon">
          Lemon
          <span forListboxOptionIndicator>✓</span>
        </button>
      </div>
    </div>
  `,
})
export class ListboxGroupedFixture {}
