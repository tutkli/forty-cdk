# Tree

Headless implementation of the [WAI-ARIA Tree View pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) — a nested `role="tree"` → `treeitem` → `group` → `treeitem` widget for hierarchical data (file explorers, nav trees, category pickers). Roving-tabindex focus management (APG Approach A — DOM focus rides the `treeitem`), single / multi select, full keyboard interaction, typeahead, RTL arrow mirroring, and `aria-level` / `aria-setsize` / `aria-posinset` wiring.

Selection and expansion are two independent models: `value` (selected nodes) and `expanded` (open nodes). Expansion is always multi; only `value` honours `multiple`.

## Pieces

| Class                          | Selector                         | Role                                                                                                                                                      |
| ------------------------------ | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ForTree`                      | `[forTree]`                      | Root container (`role="tree"`). Owns selection + expansion, navigation, and the shared context.                                                           |
| `ForTreeItem`                  | `[forTreeItem]`                  | One node (`role="treeitem"`). Carries ARIA state, the roving tab stop, and the keyboard interaction.                                                      |
| `ForTreeItemLabel`             | `[forTreeItemLabel]`             | Pointer target inside an item (click selects + focuses) and the default typeahead text source.                                                            |
| `ForTreeItemToggle`            | `[forTreeItemToggle]`            | Optional expand / collapse control. Its presence marks the item a **parent** (emits `aria-expanded`).                                                     |
| `ForTreeGroup`                 | `[forTreeGroup]`                 | Nested container (`role="group"`) holding a parent's child items. Rendered behind `@if`.                                                                  |
| `ForTreeItemCheckbox`          | `[forTreeItemCheckbox]`          | Visible checkbox surface inside `[forTreeItemLabel]`, used in `selectionMode="checkbox"`. Decorative (`aria-hidden`); the `treeitem` owns `aria-checked`. |
| `ForTreeItemCheckboxIndicator` | `[forTreeItemCheckboxIndicator]` | Optional glyph slot inside `[forTreeItemCheckbox]`. Self-hides while the node is unchecked.                                                               |

## Inputs / models

### `ForTree`

| API                     | Type                                          | Description                                                                                                                                                                                                                                         |
| ----------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`                 | `model<readonly string[]>`                    | Two-way bindable. Selected node values. Single mode keeps 0 or 1; multi any number. Default `[]`.                                                                                                                                                   |
| `expanded`              | `model<readonly string[]>`                    | Two-way bindable. Open (expanded) parent node values. Always multi. Default `[]`.                                                                                                                                                                   |
| `selected`              | `Signal<string \| null>`                      | Read-only single-select convenience view of `value`: the sole selected value, or `null` when none / many are selected.                                                                                                                              |
| `multiple`              | `input<boolean>`                              | When true, multiple nodes can be selected. Default `false`.                                                                                                                                                                                         |
| `disabled`              | `input<boolean>`                              | Disables the whole tree. Reflected as `aria-disabled` / `data-disabled`.                                                                                                                                                                            |
| `orientation`           | `input<'vertical' \| 'horizontal'>`           | Navigation axis. Default `'vertical'` (ArrowUp/Down move; ArrowLeft/Right expand/collapse). Reflected as `aria-orientation` / `data-orientation`.                                                                                                   |
| `ariaLabel`             | `input<string \| null>`                       | Reactive accessible name, reflected as `aria-label`. Default `null` (and empty) emits no attribute. Prefer native `aria-labelledby` when a visible label exists.                                                                                    |
| `dir`                   | `input<'ltr' \| 'rtl' \| null>`               | Writing direction. Default `null` resolves the inherited ambient direction; an explicit value wins. Reflected to the host `dir` attribute and mirrors the expand/collapse arrows in RTL.                                                            |
| `selectionFollowsFocus` | `input<boolean>`                              | Single-mode only. When true, arrow navigation also selects the focused node. Default from `provideForTreeDefaults` (library default `false`).                                                                                                       |
| `selectionMode`         | `input<'highlight' \| 'checkbox'>`            | Selection presentation. `'highlight'` (default) uses `aria-selected`; `'checkbox'` uses `aria-checked` and renders the checkbox anatomy (inherently multi-select). Default `'highlight'`.                                                           |
| `cascade`               | `input<boolean>`                              | Enables cascade selection in `selectionMode="checkbox"`: checking / unchecking a node propagates to all descendants, and a parent reports `aria-checked="mixed"` when only some descendants are checked. Requires `descendantsOf`. Default `false`. |
| `descendantsOf`         | `input<(value: string) => readonly string[]>` | Returns the selectable descendant values of a node (excluding the node itself). Required when `cascade` is `true`; the tree throws a `[forty-cdk/tree]` error otherwise.                                                                            |

### `ForTreeItem`

| API         | Type                     | Description                                                                              |
| ----------- | ------------------------ | ---------------------------------------------------------------------------------------- |
| `value`     | `input.required<string>` | The node's value. Must be unique within the tree.                                        |
| `disabled`  | `input<boolean>`         | Disables this node: not selectable, skipped by keyboard navigation.                      |
| `textValue` | `input<string>`          | Typeahead text override. Falls back to the `[forTreeItemLabel]` text content when empty. |

## Usage (recursive component)

Trees are recursive, and the idiomatic Angular shape is a small **recursive component** for the node. This keeps dependency injection correct at every depth: each node component nests its element injector under its enclosing `[forTreeGroup]`, so `[forTreeItem]` resolves the right level / container automatically.

```ts
import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { ForTree, ForTreeGroup, ForTreeItem, ForTreeItemLabel, ForTreeItemToggle } from 'forty-cdk';

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
    <li forTreeItem class="tree-item" [value]="node().id">
      <div forTreeItemLabel>
        @if (node().children?.length) {
          <span forTreeItemToggle class="tree-toggle">▸</span>
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

## Checkbox selection

`selectionMode="checkbox"` switches each `treeitem` to `aria-checked` (instead of `aria-selected`) and makes every node toggle independently — `multiple` is not required. Place `[forTreeItemCheckbox]` and `[forTreeItemCheckboxIndicator]` inside the label for a visible checkbox surface.

```ts
import {
  ForTree,
  ForTreeGroup,
  ForTreeItem,
  ForTreeItemLabel,
  ForTreeItemToggle,
  ForTreeItemCheckbox,
  ForTreeItemCheckboxIndicator,
} from 'forty-cdk';

@Component({
  selector: 'app-tree-node',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForTreeItem,
    ForTreeItemLabel,
    ForTreeItemToggle,
    ForTreeGroup,
    ForTreeItemCheckbox,
    ForTreeItemCheckboxIndicator,
    TreeNode,
  ],
  host: { style: 'display: contents' },
  template: `
    <li forTreeItem [value]="node().id">
      <div forTreeItemLabel>
        @if (node().children?.length) {
          <span forTreeItemToggle>▸</span>
        }
        <span forTreeItemCheckbox>
          <span forTreeItemCheckboxIndicator>✓</span>
        </span>
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
  selector: 'app-categories',
  imports: [ForTree, TreeNode],
  template: `
    <ul
      forTree
      selectionMode="checkbox"
      [(value)]="selected"
      [(expanded)]="expanded"
      aria-label="Categories"
    >
      @for (n of roots; track n.id) {
        <app-tree-node [node]="n" [expanded]="expanded()" />
      }
    </ul>
  `,
})
export class Categories {
  readonly selected = signal<readonly string[]>([]);
  readonly expanded = signal<readonly string[]>([]);
  readonly roots: Node[] = [
    { id: 'a', name: 'Alpha' },
    { id: 'b', name: 'Beta', children: [{ id: 'b1', name: 'Beta 1' }] },
  ];
}
```

### Cascade selection

Add `cascade` and `[descendantsOf]` to enable tri-state propagation. Checking a parent selects it and all its descendants atomically (including collapsed / unmounted ones), and a parent derives `aria-checked="mixed"` / `data-checked="mixed"` when only some descendants are checked. The `descendantsOf` function must return every selectable descendant id of the given node (not just direct children).

```ts
@Component({
  selector: 'app-categories',
  imports: [ForTree, TreeNode],
  template: `
    <ul
      forTree
      selectionMode="checkbox"
      cascade
      [descendantsOf]="descendantsFn"
      [(value)]="selected"
      [(expanded)]="expanded"
      aria-label="Categories"
    >
      @for (n of roots; track n.id) {
        <app-tree-node [node]="n" [expanded]="expanded()" />
      }
    </ul>
  `,
})
export class Categories {
  readonly selected = signal<readonly string[]>([]);
  readonly expanded = signal<readonly string[]>([]);
  readonly roots: Node[] = [
    {
      id: 'fruits',
      name: 'Fruits',
      children: [
        { id: 'apple', name: 'Apple' },
        { id: 'pear', name: 'Pear' },
      ],
    },
  ];

  readonly descendantsFn = (id: string): readonly string[] => {
    const flatten = (nodes: Node[]): string[] =>
      nodes.flatMap((n) => [n.id, ...flatten(n.children ?? [])]);
    const find = (nodes: Node[]): Node | undefined =>
      nodes.find((n) => n.id === id) ?? nodes.flatMap((n) => find(n.children ?? [])).find(Boolean);
    const node = find(this.roots);
    return node?.children ? flatten(node.children) : [];
  };
}
```

## Filtering

forty-cdk ships no filtering machinery — matching stays consumer-owned. The library exports one pure helper, `expandToReveal`, that translates the matched set into the ancestor values you need to expand so every match becomes visible.

**Three-step recipe:**

1. **Filter your own data and re-render.** Derive a filtered node list with `computed()` and drive the tree's `@for` off that signal. The library adds no filtering engine, empty-state pieces, or snapshot logic.
2. **Expand ancestors with `expandToReveal`.** Call `expandToReveal(matches, ancestorsOf)` to get the unique ancestor values to merge into `[(expanded)]`. The helper is pure — it has no Angular reactivity, no DOM, and no side effects.
3. **Highlight matched text with consumer CSS.** Wrap matched text in a `<mark>` element or apply a `.match` class while rendering filtered labels. No new data attribute is emitted by the library.

```ts
import { expandToReveal } from 'forty-cdk';

readonly query = signal('');
readonly filtered = computed(() => filterNodes(this.roots, this.query()));

constructor() {
  // Consumer-owned: re-reveal matches whenever the query changes.
  effect(() => {
    const matches = collectIds(this.filtered());
    this.expanded.update((open) => [
      ...new Set([...open, ...expandToReveal(matches, this.ancestorsOf)]),
    ]);
  });
}

// Returns a node's ancestor ids from the consumer's own hierarchy.
ancestorsOf = (id: string): readonly string[] => { /* walk roots, return the path */ };
```

`expandToReveal` accepts any `Iterable<string>` (array, `Set`, generator). Root-level matches contribute nothing — a root has no ancestors to expand.

## Keyboard

Vertical, LTR (mirrored for `dir="rtl"`):

| Key                     | Behavior                                                                                      |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| **ArrowDown / ArrowUp** | Move focus to the next / previous visible node (no wrap; collapsed subtrees are skipped).     |
| **ArrowRight**          | Closed parent → expand (focus stays); open parent → focus first child; leaf → no-op.          |
| **ArrowLeft**           | Open parent → collapse (focus stays); otherwise → focus the parent node; closed root → no-op. |
| **Home / End**          | First / last visible node.                                                                    |
| **Enter**               | Select / activate the focused node.                                                           |
| **Space**               | Single: select. Multi: toggle the focused node's selection.                                   |
| **\***                  | Expand every sibling parent at the focused node's level.                                      |
| **type a character**    | Typeahead: focus the next visible node whose label starts with the buffer.                    |
| **Shift+ArrowUp/Down**  | Multi: move focus and toggle the new node's selection.                                        |
| **Shift+Space**         | Multi: select the contiguous range from the anchor to the focused node.                       |
| **Ctrl/Cmd+A**          | Multi: select every visible enabled node (toggles off when all are already selected).         |

Under `dir="rtl"` the expand / collapse arrows swap: **ArrowLeft** expands and **ArrowRight** collapses.

## Scope defaults

```ts
import { provideForTreeDefaults } from 'forty-cdk';

// app config or a component's providers
providers: [provideForTreeDefaults({ selectionFollowsFocus: true })];
```

## Styling

forty-cdk ships no styles. Add your own class to each piece — the for\* selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../../../docs/styling.md)). Key your CSS off the reflected data-\* attributes below.

### Data attributes

| Piece                            | Attribute          | Values                                                  |
| -------------------------------- | ------------------ | ------------------------------------------------------- |
| `[forTree]`                      | `data-orientation` | `vertical` \| `horizontal`                              |
| `[forTree]`                      | `data-disabled`    | present \| absent                                       |
| `[forTreeItem]`                  | `data-state`       | `open` \| `closed` (parent items only)                  |
| `[forTreeItem]`                  | `data-selected`    | present \| absent                                       |
| `[forTreeItem]`                  | `data-highlighted` | present \| absent                                       |
| `[forTreeItem]`                  | `data-disabled`    | present \| absent                                       |
| `[forTreeItem]`                  | `data-checked`     | `"true"` \| `"false"` \| `"mixed"` (checkbox mode only) |
| `[forTreeItemToggle]`            | `data-state`       | `open` \| `closed`                                      |
| `[forTreeItemCheckbox]`          | `data-state`       | `checked` \| `unchecked` \| `indeterminate`             |
| `[forTreeItemCheckboxIndicator]` | `data-state`       | `checked` \| `unchecked` \| `indeterminate`             |

A `[forTreeItem]` emits `data-state` only when it is a parent (a `[forTreeItemToggle]` is registered inside it); leaves carry neither `data-state` nor `aria-expanded`. Expansion (`data-state`) and selection (`data-selected`) are independent hooks because a node can be both expandable and selected at once.

```css
.tree-toggle {
  display: inline-block;
  transition: transform 150ms;
}
.tree-toggle[data-state='open'] {
  transform: rotate(90deg);
}
.tree-item[data-highlighted] {
  outline: 2px solid Highlight;
}
```

## Accessibility notes

- **Label the tree** via the reactive `[ariaLabel]` input or a native `aria-labelledby` pointing at a visible heading.
- **`data-state="open" | "closed"`** is reflected on parent nodes only (and on the toggle); leaves carry neither, matching `aria-expanded`.
- **`data-selected`** (present / absent) reflects selection on every node — a node is simultaneously expandable and selectable, so expansion (`data-state`) and selection (`data-selected`) get separate hooks.
- **`data-highlighted=""`** marks the current roving-tabindex node, the same hook used across the listbox / menu / select primitives.
- **Exactly one node is tabbable** at a time (the selected node, or the first enabled node). `Tab` enters and leaves the whole tree in one stop.
- **In `selectionMode="checkbox"`** each `treeitem` emits `aria-checked` (`"true"` / `"false"`) and no `aria-selected`; the `[forTreeItemCheckbox]` and `[forTreeItemCheckboxIndicator]` are `aria-hidden` / decorative — the `treeitem` itself is the accessible checkbox. With `cascade`, a parent reports `aria-checked="mixed"` (and `data-checked="mixed"`) when only some of its descendants are checked; the cascade reaches collapsed / unmounted descendants through the `descendantsOf` descriptor, so the tri-state is always correct even when children are not yet mounted.
