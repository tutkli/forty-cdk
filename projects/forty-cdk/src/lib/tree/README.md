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

## Virtualization

For very large trees (thousands of nodes) bind `[totalCount]` to switch to an **activedescendant focus model** over a consumer-owned virtualized window.

### Opt-in API

#### `ForTree` additions

| API             | Type                                            | Description                                                                                                                      |
| --------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `totalCount`    | `input<number \| undefined>`                    | Total flattened node count. Setting this switches the tree to the activedescendant focus model. Leave unset for roving-tabindex. |
| `visibleRange`  | `input<readonly [number, number] \| undefined>` | Inclusive-exclusive `[start, end)` index range of the currently rendered nodes. Provided by `injectVirtualizer`.                 |
| `scrollToIndex` | `output<number>`                                | Emitted when keyboard navigation reaches a node outside the rendered window. Forward to `injectVirtualizer`'s `scrollToIndex`.   |

#### `ForTreeItem` additions (virtualized path only)

| API         | Type                    | Description                                                                                                                                            |
| ----------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `itemIndex` | `input<number \| null>` | Zero-based absolute index in the flattened node list. **Required** in the virtualized path. Leave unset (default `null`) outside the virtualized path. |
| `level`     | `input<number \| null>` | Tree depth of this node (1-based). Overrides the container-derived `aria-level` in the virtualized path.                                               |
| `setSize`   | `input<number \| null>` | Total siblings at this node's level. Overrides the container-derived `aria-setsize` in the virtualized path.                                           |
| `posInSet`  | `input<number \| null>` | 1-based position among siblings (matches `aria-posinset`). Overrides the container-derived value in the virtualized path.                              |

**Naming note:** `[posInSet]` is the per-level `aria-posinset` (position among siblings at this level, 1-based). It is **not** the absolute flat index — that is `[itemIndex]`. This matches the ARIA attribute name and is intentionally different from how some other APIs name it.

### Focus-model switch

| Mode                              | Tree host tabindex | Item tabindex   | Focus mechanism                     |
| --------------------------------- | ------------------ | --------------- | ----------------------------------- |
| Standard (no `totalCount`)        | none               | `0` on one item | DOM focus rides the item (roving)   |
| Virtualized (`totalCount` is set) | `0`                | `-1` always     | `aria-activedescendant` on the host |

### Navigation flow

1. Consumer flattens their visible tree into a flat list, computing `level`, `setSize`, `posInSet`, and `itemIndex` for each node (using the true sibling totals — off-window siblings contribute their real counts because the consumer knows them).
2. `injectVirtualizer({ count: flatCount, estimateSize, scrollElement })` drives the render window.
3. The tree host receives `(scrollToIndex)` when keyboard navigation needs a node outside the window; the consumer forwards the index to `v.scrollToIndex(idx, { align: 'auto' })`.
4. Once the target node mounts (carrying the requested `[itemIndex]`), the bridge effect resolves the pending activedescendant.

### Consumer example

```ts
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  signal,
  viewChild,
} from '@angular/core';
import {
  ForTree,
  ForTreeItem,
  ForTreeItemLabel,
  ForTreeItemToggle,
  injectVirtualizer,
} from 'forty-cdk';

interface TreeNode {
  value: string;
  label: string;
  children?: TreeNode[];
}

interface FlatNode {
  value: string;
  label: string;
  level: number;
  setSize: number;
  posInSet: number;
  itemIndex: number;
  expandable: boolean;
}

function flatten(nodes: TreeNode[], expanded: ReadonlySet<string>, level = 1): FlatNode[] {
  const result: FlatNode[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    result.push({
      value: node.value,
      label: node.label,
      level,
      setSize: nodes.length,
      posInSet: i + 1,
      itemIndex: result.length,
      expandable: !!node.children?.length,
    });
    if (node.children?.length && expanded.has(node.value)) {
      result.push(...flatten(node.children, expanded, level + 1));
    }
  }
  return result;
}

@Component({
  selector: 'app-virtual-tree',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTree, ForTreeItem, ForTreeItemLabel, ForTreeItemToggle],
  template: `
    <ul
      forTree
      #scroll
      aria-label="Files"
      [(value)]="selected"
      [(expanded)]="expanded"
      [totalCount]="flat().length"
      [visibleRange]="v.range()"
      (scrollToIndex)="v.scrollToIndex($event, { align: 'auto' })"
      style="overflow: auto; max-height: 400px; position: relative;"
    >
      <div [style.height.px]="v.totalSize()" style="position: relative">
        @for (vi of v.virtualItems(); track vi.key) {
          <li
            forTreeItem
            [value]="flat()[vi.index]!.value"
            [level]="flat()[vi.index]!.level"
            [setSize]="flat()[vi.index]!.setSize"
            [posInSet]="flat()[vi.index]!.posInSet"
            [itemIndex]="vi.index"
            [style.transform]="'translateY(' + vi.start + 'px)'"
            style="position: absolute; left: 0; right: 0;"
          >
            @if (flat()[vi.index]!.expandable) {
              <span forTreeItemToggle>▸</span>
            }
            <div forTreeItemLabel>{{ flat()[vi.index]!.label }}</div>
          </li>
        }
      </div>
    </ul>
  `,
})
export class VirtualTree {
  readonly selected = signal<readonly string[]>([]);
  readonly expanded = signal<readonly string[]>([]);

  readonly roots: TreeNode[] = [
    /* large tree data */
  ];

  readonly flat = computed(() => flatten(this.roots, new Set(this.expanded())));

  private readonly scrollRef = viewChild<ElementRef<HTMLElement>>('scroll');
  private readonly scrollElement = computed(() => this.scrollRef()?.nativeElement ?? null);

  readonly v = injectVirtualizer({
    count: computed(() => this.flat().length),
    estimateSize: () => 32,
    scrollElement: this.scrollElement,
  });
}
```

### Intentional limitations

The following behaviors are unavailable in the virtualized path and are documented intentional limitations (same as listbox/select virtualization):

- **Multi-select range modifiers** (Shift+ArrowUp/Down, Shift+Space, Ctrl/Cmd+A) are dropped. Range selection requires knowing the full list of enabled nodes in the range, which is not available when the list is partially unmounted. Provide a custom selection UI (checkboxes with `selectionMode="checkbox"`) for multi-select over large trees.
- **Cross-window typeahead** only matches within the currently rendered window. Typeahead over unmounted nodes is not supported.
- **`*` (expand-all-siblings)** is dropped. It requires knowing all siblings at the focused node's level, including those outside the window.

## Drag & drop

Add `[forTreeNodeDrag]` on the same element as `[forTree]` to enable pointer and keyboard drag reordering and re-parenting.

### Pieces

| Class                   | Selector                  | Description                                                                                          |
| ----------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------- |
| `ForTreeNodeDrag`       | `[forTreeNodeDrag]`       | Root coordinator. Apply on the same element as `[forTree]`.                                          |
| `ForTreeNodeDragHandle` | `[forTreeNodeDragHandle]` | Optional grab-area constraint inside an item. When present, pointer drags start only from within it. |

### Inputs / outputs

| API        | Type                                              | Description                                                                                             |
| ---------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `disabled` | `input<boolean>`                                  | Disables all drag interactions. Default `false`.                                                        |
| `canDrop`  | `input<(event: ForTreeDragDropEvent) => boolean>` | Optional veto callback. Return `false` to reject a specific move. When omitted, all drops are accepted. |
| `nodeDrop` | `output<ForTreeDragDropEvent>`                    | Emitted once per committed move. Apply `moveTreeNode` in the handler to update your data.               |

### Keyboard interaction

| Key               | Behavior while **not** lifted | Behavior while **lifted**                                        |
| ----------------- | ----------------------------- | ---------------------------------------------------------------- |
| `Ctrl/Cmd+Space`  | Lifts the focused node.       | —                                                                |
| `ArrowDown`       | Normal tree navigation.       | Moves the insertion point one row down.                          |
| `ArrowUp`         | Normal tree navigation.       | Moves the insertion point one row up.                            |
| `ArrowRight`      | Normal expand / enter.        | Deepens the target level by 1 (LTR; reversed under RTL).         |
| `ArrowLeft`       | Normal collapse / leave.      | Shallows the target level by 1 (LTR; reversed under RTL).        |
| `Space` / `Enter` | Normal select / activate.     | Drops the node at the current resolved position.                 |
| `Escape`          | —                             | Cancels the drag; the node is returned to its original position. |
| `Tab`             | Normal focus leave.           | Cancels the drag.                                                |

### Minimal example

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForTree,
  ForTreeGroup,
  ForTreeItem,
  ForTreeItemLabel,
  ForTreeItemToggle,
  ForTreeNodeDrag,
  ForTreeNodeDragHandle,
  moveTreeNode,
  type ForTreeDragDropEvent,
} from 'forty-cdk';

interface Node {
  id: string;
  name: string;
  children?: Node[];
}

@Component({
  selector: 'app-tree-node',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForTreeItem,
    ForTreeItemLabel,
    ForTreeItemToggle,
    ForTreeGroup,
    ForTreeNodeDragHandle,
    TreeNode,
  ],
  host: { style: 'display: contents' },
  template: `
    <li forTreeItem [value]="node().id">
      <div forTreeItemLabel>
        <span forTreeNodeDragHandle aria-hidden="true">⠿</span>
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
  imports: [ForTree, ForTreeNodeDrag, TreeNode],
  template: `
    <ul
      forTree
      forTreeNodeDrag
      [(value)]="selected"
      [(expanded)]="expanded"
      [canDrop]="canDrop"
      (nodeDrop)="onDrop($event)"
      aria-label="File system"
    >
      @for (n of roots(); track n.id) {
        <app-tree-node [node]="n" [expanded]="expanded()" />
      }
    </ul>
  `,
})
export class Files {
  readonly selected = signal<readonly string[]>([]);
  readonly expanded = signal<readonly string[]>([]);
  readonly roots = signal<Node[]>([
    {
      id: 'documents',
      name: 'Documents',
      children: [
        { id: 'resume', name: 'Resume' },
        { id: 'projects', name: 'Projects', children: [{ id: 'alpha', name: 'Alpha' }] },
      ],
    },
    { id: 'readme', name: 'Readme' },
  ]);

  readonly canDrop = (event: ForTreeDragDropEvent): boolean => {
    return event.newParent !== event.node;
  };

  onDrop(event: ForTreeDragDropEvent): void {
    this.roots.update((r) =>
      moveTreeNode(r, {
        event,
        trackBy: (n) => n.id,
        children: (n) => n.children,
        withChildren: (n, children) => ({ ...n, children: children as Node[] }),
      }),
    );
  }
}
```

### Data attributes on `[forTreeNodeDrag]`

| Attribute               | Values       | When present                                  |
| ----------------------- | ------------ | --------------------------------------------- |
| `data-dragging`         | `""` (empty) | A drag session is live (pointer or keyboard). |
| `data-drop-target`      | `""` (empty) | A valid drop target has been resolved.        |
| `--for-tree-drop-level` | integer 1–N  | The resolved depth of the current target.     |

On lift the dragged node's subtree is collapsed (and restored on drop / cancel). This keeps the drop geometry tractable and structurally prevents dropping a node into its own descendant; `[canDrop]` adds consumer-defined vetoes on top.
