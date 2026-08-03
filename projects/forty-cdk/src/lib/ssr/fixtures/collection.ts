import { Component, signal } from '@angular/core';
import {
  ForCombobox,
  ForComboboxAction,
  ForComboboxContent,
  ForComboboxInput,
  ForComboboxList,
  ForComboboxOption,
} from 'forty-cdk/combobox';
import { ForListbox, ForListboxOption, ForListboxReorder } from 'forty-cdk/listbox';
import {
  ForSelect,
  ForSelectContent,
  ForSelectOption,
  ForSelectTrigger,
  ForSelectValue,
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
  imports: [ForSelect, ForSelectTrigger, ForSelectContent, ForSelectOption],
  template: `
    <div forSelect [open]="true" [totalCount]="3" [(value)]="value">
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
  ],
  template: `
    <div forCombobox [open]="true">
      <input forComboboxInput />
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
  imports: [ForListbox, ForListboxOption],
  template: `
    <div forListbox ariaLabel="Virtualized" [totalCount]="3">
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
  imports: [ForTree, ForTreeItem, ForTreeItemLabel],
  template: `
    <ul forTree ariaLabel="Virtualized" [totalCount]="3">
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
