# ForTable

Headless table primitive that decorates either a native `<table>` or a `<div role>` CSS-grid structure with correct WAI-ARIA table semantics. Implements the [WAI-ARIA Table pattern](https://www.w3.org/WAI/ARIA/apg/patterns/table/).

The library sets roles, `aria-label`, writing direction, `data-column`, and sticky hooks. The consumer owns all styles.

## Native `<table>` mode

```html
<table forTable [ariaLabel]="caption">
  <thead>
    <tr forTableHeaderRow>
      <th forTableHeaderCell name="name" sticky>Name</th>
      <th forTableHeaderCell name="role">Role</th>
    </tr>
  </thead>
  <tbody>
    <tr forTableRow>
      <td forTableCell name="name">Ada Lovelace</td>
      <td forTableCell name="role">Engineer</td>
    </tr>
  </tbody>
</table>
```

## `<div>` mode (required for virtualization)

When you need virtual scrolling, use `<div role>` structure with `mode="grid"` on the root. The `<div>` mode is the only shape supported by virtualizers because native `<table>` cannot have its rows omitted from the DOM mid-body. All pieces accept any element.

```html
<div
  forTable
  mode="grid"
  ariaLabel="People"
  style="display: grid; grid-template-columns: 1fr 1fr; overflow-y: auto; max-height: 400px;"
>
  <div role="rowgroup">
    <div forTableHeaderRow style="display: contents;">
      <div forTableHeaderCell name="name" sticky style="position: sticky; top: 0;">Name</div>
      <div forTableHeaderCell name="role" sticky style="position: sticky; top: 0;">Role</div>
    </div>
  </div>
  <div role="rowgroup">
    @for (row of rows(); track row.id) {
      <div forTableRow style="display: contents;">
        <div forTableCell name="name">{{ row.name }}</div>
        <div forTableCell name="role">{{ row.role }}</div>
      </div>
    }
  </div>
</div>
```

## Sticky header + CSS custom property

`ForTable` measures the header row height with `ResizeObserver` and exposes it as `--for-table-header-height` on the root host (the header row must generate a box — use `display: grid` / `flex` on `[forTableHeaderRow]`, not `display: contents`). Use it to keep data cells stuck below the header row without hard-coding a pixel offset that drifts when the header content wraps:

```css
[forTableHeaderCell][data-sticky] {
  position: sticky;
  top: 0;
  z-index: 1;
}

[forTableCell][data-sticky] {
  position: sticky;
  left: 0; /* start-edge sticky */
  z-index: 1;
}

[forTableCell][data-sticky='end'] {
  position: sticky;
  right: 0; /* end-edge sticky */
}
```

End-edge sticky cells use `sticky="end"` on the directive:

```html
<th forTableHeaderCell name="actions" sticky="end">Actions</th>
<td forTableCell name="actions" sticky="end">…</td>
```

## Inputs

| Directive          | Input      | Type                           | Default     | Description                                           |
| ------------------ | ---------- | ------------------------------ | ----------- | ----------------------------------------------------- |
| `[forTable]`       | `mode`     | `'table' \| 'grid' \| 'treegrid'` | `'table'` | ARIA role emitted on the host.                        |
| `[forTable]`       | `ariaLabel` | `string \| null`              | `null`      | Reactive accessible label.                            |
| `[forTable]`       | `dir`      | `'ltr' \| 'rtl' \| null`      | `null`      | Writing direction; resolves ambient when unset.       |
| `[forTableHeaderCell]` | `name` | `string` (required)           | —           | Column identifier, reflected as `data-column`.        |
| `[forTableHeaderCell]` | `sticky` | `boolean \| 'end'`          | `false`     | Sticky edge; reflected as `data-sticky`.              |
| `[forTableCell]`   | `name`     | `string` (required)            | —           | Column identifier, reflected as `data-column`.        |
| `[forTableCell]`   | `sticky`   | `boolean \| 'end'`             | `false`     | Sticky edge; reflected as `data-sticky`.              |

## CSS hooks

| Token / attribute             | Emitted by       | Description                                                |
| ----------------------------- | ---------------- | ---------------------------------------------------------- |
| `--for-table-header-height`   | `[forTable]`     | Header row height in px. Updated on resize.                |
| `data-mode`                   | `[forTable]`     | `'table' \| 'grid' \| 'treegrid'`                         |
| `data-column`                 | header / data cell | Column name from the `name` input.                       |
| `data-sticky`                 | header / data cell | `''` (start-edge) or `'end'` when sticky; absent otherwise. |
