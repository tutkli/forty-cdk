import {
  booleanAttribute,
  contentChild,
  Directive,
  inject,
  input,
  isDevMode,
  TemplateRef,
} from '@angular/core';

import { assertInputBound, isUnset, unsetInput } from 'forty-cdk/core';

import {
  registerTableColumnDef,
  registerTableColumnDragPlaceholder,
  registerTablePlaceholderCellDefault,
} from './def-registry';
import {
  assertColumnName,
  assertColumnTrack,
  coerceSticky,
  type TableStickyValue,
} from './table-context';

/**
 * Template context handed to each `[forTableCellDef]` stamped by `ForTableBody`:
 * the row datum (`let-row`) and its 0-based dataset index (`let-i="index"`).
 */
export interface ForTableCellDefContext<T> {
  /** The row datum for this cell (`let-row`). */
  $implicit: T;
  /**
   * 0-based dataset index of the row (`let-i="index"`). In a non-virtualized
   * table this equals the row's rendered position; under `[forTableVirtualized]`
   * it is the **absolute** index into the full dataset, not the position within
   * the rendered window.
   */
  index: number;
}

/**
 * Marks the header-cell template of a column definition. Place on an
 * `<ng-template forTableHeaderCellDef>` inside a `[forTableColumnDef]`; its content is
 * stamped into the column's `[forTableHeaderCell]` by `ForTableBody`.
 */
@Directive({ selector: 'ng-template[forTableHeaderCellDef]' })
export class ForTableHeaderCellDef {
  /** The captured header-cell template. */
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}

/**
 * Marks the data-cell template of a column definition. Place on an
 * `<ng-template forTableCellDef>` inside a `[forTableColumnDef]`; its content is stamped
 * into the column's `[forTableCell]` for every rendered row, with the row datum
 * and index exposed through `ForTableCellDefContext`.
 *
 * Bind `[forTableCellDefRow]` to the same array passed to `ForTableBody`'s `rows`
 * to type `let-row` — the input is read only for type inference, never at
 * runtime.
 *
 * When the row type is a discriminated union whose variant members render
 * through a `[forTableRowDef]` instead of the per-column cells, bind
 * `[forTableCellDefUnless]` to the same type guard(s) used on those defs' `[when]`
 * so `let-row` is narrowed to the variant-excluded members (`Exclude<T, V>`).
 */
@Directive({ selector: 'ng-template[forTableCellDef]' })
export class ForTableCellDef<T, V extends T = never> {
  /** The captured data-cell template, typed with `ForTableCellDefContext<T>`. */
  readonly template = inject<TemplateRef<ForTableCellDefContext<T>>>(TemplateRef);

  /**
   * Type-inference hint: bind to the same collection as `ForTableBody`'s `rows`
   * so `let-row` is typed as the row type. Read only by the compiler; the
   * directive never touches its value.
   */
  readonly rowType = input<readonly T[]>([], { alias: 'forTableCellDefRow' });

  /**
   * Type-inference hint: bind the type guard(s) that match the variant rows
   * rendered by `[forTableRowDef]` (the same predicate used on their `[when]`) so
   * `let-row` is narrowed to `Exclude<T, V>` — the members this per-column
   * template actually receives. Compose several variants into one union guard
   * (`(r): r is A | B => …`). Read only by the compiler; the directive never
   * touches its value. Omitting it leaves `let-row` typed as the full `T`.
   */
  readonly excludeType = input<((row: T, index: number) => row is V) | null>(null, {
    alias: 'forTableCellDefUnless',
  });

  /** Narrows the template context type for `let-row` under strict template checking. */
  static ngTemplateContextGuard<T, V extends T>(
    _directive: ForTableCellDef<T, V>,
    _context: unknown,
  ): _context is ForTableCellDefContext<Exclude<T, V>> {
    return true;
  }
}

/**
 * Marks the placeholder/skeleton template of a column definition. Optional;
 * place on an `<ng-template forTablePlaceholderCellDef>` inside a `[forTableColumnDef]`. When
 * `ForTableBody` is in its `loading` state it stamps this into the column's
 * `[forTableCell]` for each placeholder row.
 *
 * It is the first step of a three-step resolution: a column's own
 * `[forTablePlaceholderCellDef]` wins, else the body-level
 * `[forTablePlaceholderCellDefault]`, else the cell stays empty.
 */
@Directive({ selector: 'ng-template[forTablePlaceholderCellDef]' })
export class ForTablePlaceholderCellDef {
  /** The captured placeholder-cell template. */
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}

/**
 * Marks the **body-level default** placeholder/skeleton template. Optional and
 * declared **once per body** (not per column); place on an
 * `<ng-template forTablePlaceholderCellDefault>` among the `[forTableColumnDef]`s.
 * `ForTableBody` stamps it into every displayed column that declares no
 * `[forTablePlaceholderCellDef]` of its own — most columns of a table share one skeleton
 * shape, so it is declared once rather than repeated per def.
 *
 * Resolution order per column, in both stamping paths (`[loading]` placeholder
 * rows and `placeholderCells` row variants): the column's own
 * `[forTablePlaceholderCellDef]` → this default → an empty cell when neither exists.
 * The template receives no context, exactly like `[forTablePlaceholderCellDef]`.
 *
 * It registers itself with the surrounding body's def registry at construction,
 * so a wrapping component can declare it (or project it) — see
 * {@link ForTableDefRegistry}. Declared outside any registry it throws.
 */
@Directive({ selector: 'ng-template[forTablePlaceholderCellDefault]' })
export class ForTablePlaceholderCellDefault {
  /** The captured default placeholder-cell template. */
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);

  constructor() {
    registerTablePlaceholderCellDefault(this);
  }
}

/**
 * Marks the shared drag placeholder for the reorderable columns of a
 * `<for-table-body>`. Optional and declared **once per body** (not per column);
 * place on an `<ng-template forTableColumnDragPlaceholder>` among the `[forTableColumnDef]`s.
 * `ForTableBody` stamps it as every reorderable header cell's
 * `[forDragPlaceholder]`, so during a pointer reorder the dragged column's slot
 * shows this template. Omit it to keep drag-drop's default placeholder behaviour.
 *
 * It registers itself with the surrounding body's def registry at construction,
 * so a wrapping component can declare it (or project it) — see
 * {@link ForTableDefRegistry}. Declared outside any registry it throws.
 */
@Directive({ selector: 'ng-template[forTableColumnDragPlaceholder]' })
export class ForTableColumnDragPlaceholder {
  /** The captured placeholder template rendered in a reordered column's slot. */
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);

  constructor() {
    registerTableColumnDragPlaceholder(this);
  }
}

/**
 * Declarative definition of a single table column, co-locating its header,
 * data, and (optional) placeholder templates plus its per-column config in one
 * place. Place `[forTableColumnDef]` on an `<ng-container>` inside a `<for-table-body>`;
 * the container renders nothing itself — `ForTableBody` harvests the defs and
 * stamps the header row and data rows from them.
 *
 * The def **registers itself** with the surrounding body through DI at
 * construction (and unregisters when destroyed), so it does not have to be
 * declared content of the `<for-table-body>` element: a preset column component
 * may declare it in its own view, and a scaffold wrapper may project it into a
 * body it owns. See {@link ForTableDefRegistry} for both recipes. A def with no
 * reachable registry throws.
 *
 * @example
 * ```html
 * <ng-container forTableColumnDef="name" sticky sortable resizable resizeAriaLabel="Resize name">
 *   <ng-template forTableHeaderCellDef>Name</ng-template>
 *   <ng-template forTableCellDef [forTableCellDefRow]="rows()" let-row>{{ row.name }}</ng-template>
 * </ng-container>
 * ```
 */
@Directive({ selector: '[forTableColumnDef]' })
export class ForTableColumnDef {
  /**
   * Column identifier — reflected as `data-column` on the stamped cells and used
   * to key the resize width var. Mandatory: it is seeded with the `unsetInput`
   * sentinel rather than declared `input.required` so the registry can skip a def
   * that has registered but not been bound yet, and an unbound def throws in dev
   * mode.
   */
  readonly name = input(unsetInput<string>(), { alias: 'forTableColumnDef' });

  /**
   * Sticky placement forwarded to both the header cell and every data cell:
   * `true` (or the bare `sticky` attribute) pins to the start edge, `'end'` to
   * the end edge, `false` (default) is not sticky. The consumer applies
   * `position: sticky` + offsets in CSS off the emitted `data-sticky` hook.
   */
  readonly sticky = input(false as TableStickyValue, { transform: coerceSticky });

  /**
   * When set, the column's header cell becomes a sortable affordance: `ForTableBody`
   * applies `[forTableSortHeader]`, derives its direction from the body's `sort`
   * input, and re-emits activation through the body's `sortChange` output.
   */
  readonly sortable = input(false, { transform: booleanAttribute });

  /**
   * When set, `ForTableBody` renders a `[forTableColumnResizer]` inside the column's
   * header cell and re-emits its commits through the body's `resizeCommit` output.
   * Provide `resizeAriaLabel` so the handle is named. Tune the handle per column with
   * `resizeMin` / `resizeMax` / `resizeStep` / `autoFit` / `fitIncludesHeader`, and
   * seed / track its width through the body's `[(columnWidths)]`.
   */
  readonly resizable = input(false, { transform: booleanAttribute });

  /**
   * When set, the column's header cell becomes a drag-reorder handle: with at least
   * one `reorderable` column, `ForTableBody` applies `[forTableColumnReorder]` to the
   * stamped header row and `[forDraggable]` (with `[dragData]` set to this column's
   * `name`) to this header cell, and re-emits committed reorders through the body's
   * `columnReorder` output. Non-reorderable columns stay static (not draggable).
   * Any `reorderable` column makes the body bundle `forty-cdk/drag-drop`.
   */
  readonly reorderable = input(false, { transform: booleanAttribute });

  /**
   * Accessible name for the auto-wired resize handle (only meaningful with
   * `resizable`). Supplied by the consumer so it is localizable; `null` (default)
   * ships no `aria-label`.
   */
  readonly resizeAriaLabel = input<string | null>(null);

  /**
   * Minimum width (px) the auto-wired resize handle clamps to (only meaningful with
   * `resizable`). Forwarded to the stamped `[forTableColumnResizer]`'s `min`; drives
   * its `aria-valuemin`. Default `0`.
   */
  readonly resizeMin = input<number>(0);

  /**
   * Maximum width (px) the auto-wired resize handle clamps to (only meaningful with
   * `resizable`). Forwarded to the stamped `[forTableColumnResizer]`'s `max`; drives
   * its `aria-valuemax` (omitted when non-finite). Default `Infinity` (no upper bound).
   */
  readonly resizeMax = input<number>(Infinity);

  /**
   * Pixels applied per `ArrowLeft` / `ArrowRight` press on the auto-wired resize
   * handle (only meaningful with `resizable`). Forwarded to the stamped
   * `[forTableColumnResizer]`'s `step`. Default `10`.
   */
  readonly resizeStep = input<number>(10);

  /**
   * Whether double-clicking the auto-wired resize handle fits the column to its
   * widest content (only meaningful with `resizable`). Forwarded to the stamped
   * `[forTableColumnResizer]`'s `autoFit`. Default `true` — the historical
   * hardcoded behaviour; set `false` to make the double-click a no-op.
   */
  readonly autoFit = input(true, { transform: booleanAttribute });

  /**
   * Whether header-inclusive auto-fit also accounts for the column header's label
   * (only meaningful with `resizable` + `autoFit`). Forwarded to the stamped
   * `[forTableColumnResizer]`'s `fitIncludesHeader`; isolate the header text with a
   * `[forTableColumnLabel]` inside the `[forTableHeaderCellDef]` template. Default `false`.
   */
  readonly fitIncludesHeader = input(false, { transform: booleanAttribute });

  /**
   * `grid-template-columns` track fragment for this column (e.g. `'160px'`,
   * `'minmax(160px, 1fr)'`). When unset, `ForTableBody` falls back to the
   * published `--for-table-col-<name>-width` resize var with `fallbackWidth`
   * (or `minmax(0, 1fr)`) as the var's default, so a resized column drives its
   * own track. A static `width` **takes precedence** over that resize var — so
   * leave it unset on a `resizable` column whose width you drive through
   * `resizeCommit` or the body's `[(columnWidths)]`, otherwise the pinned track
   * ignores the resized width (the handle still reports `aria-valuenow` but the
   * column won't move). Dev-mode-guarded against fragments that would escape the
   * derived track string (see `fallbackWidth`).
   */
  readonly width = input<string | null>(null);

  /**
   * `grid-template-columns` track fragment used as the resize-var **fallback**
   * for a column with no explicit `width` — the track the column renders before
   * a width is committed or seeded (e.g. `'minmax(120px, 2.5fr)'` for a
   * weighted, floor-bounded fluid column). Unlike `width` it does not pin the
   * column, so the resizer (and the body's `[(columnWidths)]`) still drives it
   * and the first published width snaps the column to px. Ignored when `width`
   * is set. Defaults to `minmax(0, 1fr)`.
   *
   * Any open track vocabulary is accepted (`minmax()`, `fit-content()`,
   * `calc()`, `clamp()`, `var()`), but in dev mode a fragment that would escape
   * the derived `grid-template-columns` string throws instead of silently
   * collapsing the layout: an empty fragment (pass `null` to leave the track
   * unset), a `;` / `{` / `}` / quote / comment opener, or unbalanced
   * parentheses — a stray `)` here would close the enclosing `var(` early and
   * swallow the rest of the track.
   */
  readonly fallbackWidth = input<string | null>(null);

  /**
   * Static class(es) applied to this column's stamped `[forTableHeaderCell]`.
   * `ForTableBody` owns the header cell element, so this is the styling seam a
   * consumer (or wrapping design system) uses to reach it without scoping CSS to
   * the body's template internals. `null` (default) adds no class attribute.
   */
  readonly headerClass = input<string | null>(null);

  /**
   * Static class(es) applied to this column's stamped `[forTableCell]` on every
   * data **and** placeholder row. The styling seam for the cell box itself
   * (padding, truncation, alignment, sticky backgrounds) that `ForTableBody`
   * owns. Per-datum row styling is out of scope. `null` (default) adds no class
   * attribute.
   */
  readonly cellClass = input<string | null>(null);

  /** The column's header-cell template. */
  readonly header = contentChild.required(ForTableHeaderCellDef);
  /** The column's data-cell template. */
  readonly dataCell = contentChild.required(ForTableCellDef);
  /**
   * The column's optional placeholder-cell template. When absent, `ForTableBody`
   * falls back to its `[forTablePlaceholderCellDefault]`, then to an empty cell.
   */
  readonly placeholderCell = contentChild(ForTablePlaceholderCellDef);

  constructor() {
    assertInputBound(this.name, 'table', '[forTableColumnDef]', 'forTableColumnDef');
    registerTableColumnDef(this);
  }
}

/**
 * Dev-mode guard for one column definition's CSS-bound config: its `name`
 * (interpolated into the `--for-table-col-<name>-width` custom property) and
 * its `width` / `fallbackWidth` track fragments.
 *
 * Called from `ForTableBody`'s track builder — the point at which the values are
 * interpolated — rather than from an `effect` on the def, so the throw carries a
 * stack naming the render that would have produced the broken declaration and
 * no reactive node is created per def in a production build. It follows that
 * only a *displayed* column is checked, which is exactly the set whose values
 * reach CSS.
 *
 * @param def The column definition to check.
 */
export function assertColumnDefConfig(def: ForTableColumnDef): void {
  if (!isDevMode()) {
    return;
  }
  const name = def.name();
  const piece = isUnset(name) ? '[forTableColumnDef]' : `forTableColumnDef="${name}"`;
  if (!isUnset(name)) {
    assertColumnName(name, 'ForTableColumnDef');
  }
  const width = def.width();
  if (width !== null) {
    assertColumnTrack(width, 'width', piece);
  }
  const fallbackWidth = def.fallbackWidth();
  if (fallbackWidth !== null) {
    assertColumnTrack(fallbackWidth, 'fallbackWidth', piece);
  }
}
