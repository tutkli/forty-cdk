# Tree

Headless implementation of the [WAI-ARIA Tree View pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) — a nested `role="tree"` → `treeitem` → `group` → `treeitem` widget for hierarchical data (file explorers, nav trees, category pickers). Roving-tabindex focus management (APG Approach A — DOM focus rides the `treeitem`), single / multi select, full keyboard interaction, typeahead, RTL arrow mirroring, and `aria-level` / `aria-setsize` / `aria-posinset` wiring.

Selection and expansion are two independent models: `value` (selected nodes) and `expanded` (open nodes). Expansion is always multi; only `value` honours `multiple`.

## Pieces

| Class               | Selector             | Role                                                                                               |
| ------------------- | -------------------- | -------------------------------------------------------------------------------------------------- |
| `ForTree`           | `[forTree]`          | Root container (`role="tree"`). Owns selection + expansion, navigation, and the shared context.    |
| `ForTreeItem`       | `[forTreeItem]`      | One node (`role="treeitem"`). Carries ARIA state, the roving tab stop, and the keyboard interaction. |
| `ForTreeItemLabel`  | `[forTreeItemLabel]` | Pointer target inside an item (click selects + focuses) and the default typeahead text source.      |
| `ForTreeItemToggle` | `[forTreeItemToggle]`| Optional expand / collapse control. Its presence marks the item a **parent** (emits `aria-expanded`).|
| `ForTreeGroup`      | `[forTreeGroup]`     | Nested container (`role="group"`) holding a parent's child items. Rendered behind `@if`.            |

## Inputs / models

### `ForTree`

| API                     | Type                                  | Description                                                                                                                            |
| ----------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `value`                 | `model<readonly string[]>`            | Two-way bindable. Selected node values. Single mode keeps 0 or 1; multi any number. Default `[]`.                                      |
| `expanded`              | `model<readonly string[]>`            | Two-way bindable. Open (expanded) parent node values. Always multi. Default `[]`.                                                      |
| `selected`              | `Signal<string \| null>`              | Read-only single-select convenience view of `value`: the sole selected value, or `null` when none / many are selected.                |
| `multiple`              | `input<boolean>`                      | When true, multiple nodes can be selected. Default `false`.                                                                            |
| `disabled`              | `input<boolean>`                      | Disables the whole tree. Reflected as `aria-disabled` / `data-disabled`.                                                               |
| `orientation`           | `input<'vertical' \| 'horizontal'>`   | Navigation axis. Default `'vertical'` (ArrowUp/Down move; ArrowLeft/Right expand/collapse). Reflected as `aria-orientation` / `data-orientation`. |
| `ariaLabel`             | `input<string \| null>`               | Reactive accessible name, reflected as `aria-label`. Default `null` (and empty) emits no attribute. Prefer native `aria-labelledby` when a visible label exists. |
| `dir`                   | `input<'ltr' \| 'rtl' \| null>`       | Writing direction. Default `null` resolves the inherited ambient direction; an explicit value wins. Reflected to the host `dir` attribute and mirrors the expand/collapse arrows in RTL. |
| `selectionFollowsFocus` | `input<boolean>`                      | Single-mode only. When true, arrow navigation also selects the focused node. Default from `provideForTreeDefaults` (library default `false`). |

### `ForTreeItem`

| API         | Type                     | Description                                                                                  |
| ----------- | ------------------------ | -------------------------------------------------------------------------------------------- |
| `value`     | `input.required<string>` | The node's value. Must be unique within the tree.                                            |
| `disabled`  | `input<boolean>`         | Disables this node: not selectable, skipped by keyboard navigation.                          |
| `textValue` | `input<string>`          | Typeahead text override. Falls back to the `[forTreeItemLabel]` text content when empty.     |

## Usage (recursive component)

Trees are recursive, and the idiomatic Angular shape is a small **recursive component** for the node. This keeps dependency injection correct at every depth: each node component nests its element injector under its enclosing `[forTreeGroup]`, so `[forTreeItem]` resolves the right level / container automatically.

```ts
import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import {
  ForTree,
  ForTreeGroup,
  ForTreeItem,
  ForTreeItemLabel,
  ForTreeItemToggle,
} from 'forty-cdk';

interface Node {
  id: string;
  name: string;
  children?: Node[];
}

@Component({
  selector: 'app-tree-node',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTreeItem, ForTreeItemLabel, ForTreeItemToggle, ForTreeGroup, TreeNode],
  // `display: contents` keeps this wrapper out of layout and the a11y tree, so
  // the <li role="treeitem"> stays a direct child of <ul role="group">.
  host: { style: 'display: contents' },
  template: `
    <li forTreeItem [value]="node().id">
      <div forTreeItemLabel>
        @if (node().children?.length) {
          <span forTreeItemToggle>▸</span>
        }
        {{ node().name }}
      </div>

      @if (node().children?.length && expanded().includes(node().id)) {
        <ul forTreeGroup>
          @for (child of node().children ?? []; track child.id) {
            <app-tree-node [node]="child" [expanded]="expanded()" />
          }
        </ul>
      }
    </li>
  `,
})
export class TreeNode {
  readonly node = input.required<Node>();
  readonly expanded = input.required<readonly string[]>();
}

@Component({
  selector: 'app-files',
  imports: [ForTree, TreeNode],
  template: `
    <ul forTree [(value)]="selected" [(expanded)]="expanded" aria-label="File system">
      @for (n of roots; track n.id) {
        <app-tree-node [node]="n" [expanded]="expanded()" />
      }
    </ul>
  `,
})
export class Files {
  readonly selected = signal<readonly string[]>([]);
  readonly expanded = signal<readonly string[]>([]);
  readonly roots: Node[] = [
    {
      id: 'documents',
      name: 'Documents',
      children: [
        { id: 'resume', name: 'Resume' },
        { id: 'projects', name: 'Projects', children: [{ id: 'alpha', name: 'Alpha' }] },
      ],
    },
    { id: 'readme', name: 'Readme' },
  ];
}
```

> **Why not `ngTemplateOutlet`?** A single recursive `<ng-template>` instantiated with `[ngTemplateOutlet]` resolves dependency injection from where the template is **declared**, not where it is inserted — so a nested `[forTreeItem]` would inject the root tree as its container instead of its enclosing `[forTreeGroup]`, breaking `aria-level` and visible-order navigation. The recursive component above avoids this. If you must use `ngTemplateOutlet`, pass an explicit `[ngTemplateOutletInjector]` captured at each insertion point.

Mounting is the consumer's responsibility: wrap `[forTreeGroup]` in `@if (expanded().includes(node.id))` so a collapsed parent drops its subtree. A node is treated as a **parent** (and emits `aria-expanded` / `data-state`) only when a `[forTreeItemToggle]` is registered inside it — leaves render no toggle and emit neither, matching the APG "end nodes lack `aria-expanded`" rule.

## Multi select

```html
<ul forTree multiple [(value)]="selected" [(expanded)]="expanded" aria-label="Files">
  ...
</ul>
```

In multi mode `Space` toggles the focused node; `Shift+ArrowUp/Down` extends; `Shift+Space` selects the contiguous range from the anchor; `Ctrl/Cmd+A` selects every visible enabled node (or clears when all are already selected).

## Keyboard

Vertical, LTR (mirrored for `dir="rtl"`):

| Key                          | Behavior                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------- |
| **ArrowDown / ArrowUp**      | Move focus to the next / previous visible node (no wrap; collapsed subtrees are skipped).         |
| **ArrowRight**               | Closed parent → expand (focus stays); open parent → focus first child; leaf → no-op.              |
| **ArrowLeft**                | Open parent → collapse (focus stays); otherwise → focus the parent node; closed root → no-op.     |
| **Home / End**               | First / last visible node.                                                                        |
| **Enter**                    | Select / activate the focused node.                                                               |
| **Space**                    | Single: select. Multi: toggle the focused node's selection.                                       |
| **\***                       | Expand every sibling parent at the focused node's level.                                          |
| **type a character**         | Typeahead: focus the next visible node whose label starts with the buffer.                        |
| **Shift+ArrowUp/Down**       | Multi: move focus and toggle the new node's selection.                                             |
| **Shift+Space**              | Multi: select the contiguous range from the anchor to the focused node.                           |
| **Ctrl/Cmd+A**               | Multi: select every visible enabled node (toggles off when all are already selected).             |

Under `dir="rtl"` the expand / collapse arrows swap: **ArrowLeft** expands and **ArrowRight** collapses.

## Scope defaults

```ts
import { provideForTreeDefaults } from 'forty-cdk';

// app config or a component's providers
providers: [provideForTreeDefaults({ selectionFollowsFocus: true })];
```

## Accessibility notes

- **Label the tree** via the reactive `[ariaLabel]` input or a native `aria-labelledby` pointing at a visible heading.
- **`data-state="open" | "closed"`** is reflected on parent nodes only (and on the toggle); leaves carry neither, matching `aria-expanded`.
- **`data-selected`** (present / absent) reflects selection on every node — a node is simultaneously expandable and selectable, so expansion (`data-state`) and selection (`data-selected`) get separate hooks.
- **`data-highlighted=""`** marks the current roving-tabindex node, the same hook used across the listbox / menu / select primitives.
- **Exactly one node is tabbable** at a time (the selected node, or the first enabled node). `Tab` enters and leaves the whole tree in one stop.
