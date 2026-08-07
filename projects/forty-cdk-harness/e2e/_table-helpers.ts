/**
 * Locators shared by the table E2E specs.
 *
 * The table family owns the largest spec group in the suite, and every file
 * used to re-declare the same four or five locators with slightly different
 * shapes — `dataCell` addressed by `nth()` in one file and by `data-index` in
 * the next, `headerCell` appeared verbatim in three. That drift is what makes
 * a change to the stamped attribute set a multi-file edit, so the locators
 * live here and the specs import them.
 *
 * Two addressing modes exist on purpose, because the DOM genuinely differs:
 * a non-virtualized body stamps every row (address by position, `*At`), while
 * a virtualized one stamps only the window and labels each row with its
 * absolute `data-index` (address by index).
 */
import { type Locator, type Page } from '@playwright/test';

/**
 * Excludes the default drag preview from an enumerator.
 *
 * The preview is a `cloneNode(true)` copy of the dragged row / header cell
 * appended to `document.body`, so for the whole gesture — and past the drop, for
 * as long as the settle transition runs — it answers `[forTableRow]` /
 * `[forTableHeaderCell]` and carries the source's `data-index` and `data-column`
 * ([#1691](https://github.com/tutkli/forty-cdk/issues/1691)). Its `id` and
 * `data-testid` are stripped, so `el(page, …)` is safe; a selector enumerator is
 * not, and `data-for-drag-preview` is the supported way to filter it out.
 */
const NOT_PREVIEW = ':not([data-for-drag-preview])';

/**
 * Selector matching every stamped row but the drag preview.
 *
 * The exclusion is exported as a **string** and not only as the locators below
 * because an enumerator inside a `page.evaluate` body has no `Locator` to reach
 * for and would otherwise have to respell it — which is how the exclusion ends
 * up living in more than one file
 * ([#1711](https://github.com/tutkli/forty-cdk/issues/1711)). Append further
 * attribute selectors to it; a `:not()` mid-compound is valid CSS.
 */
export const ROW_SELECTOR = `[forTableRow]${NOT_PREVIEW}`;

/** Selector matching every stamped header cell but the drag preview. */
export const HEADER_CELL_SELECTOR = `[forTableHeaderCell]${NOT_PREVIEW}`;

/** Every stamped row, in document order. */
export function rows(page: Page): Locator {
  return page.locator(ROW_SELECTOR);
}

/** The row at `position` in the rendered list — non-virtualized bodies. */
export function rowAt(page: Page, position: number): Locator {
  return rows(page).nth(position);
}

/** The row carrying the absolute `data-index` — virtualized bodies. */
export function rowByIndex(page: Page, index: number): Locator {
  return page.locator(`${ROW_SELECTOR}[data-index="${index}"]`);
}

/** A column's cell inside the row at `position` — non-virtualized bodies. */
export function dataCellAt(page: Page, position: number, column: string): Locator {
  return rowAt(page, position).locator(`[data-column="${column}"]`);
}

/** A column's cell inside the row with absolute `index` — virtualized bodies. */
export function dataCell(page: Page, index: number, column: string): Locator {
  return rowByIndex(page, index).locator(`[data-column="${column}"]`);
}

/** The full-span presentational cell of a variant row at `position`. */
export function variantCellAt(page: Page, position: number): Locator {
  return rowAt(page, position).locator('[data-row-variant]');
}

/** The full-span presentational cell of the variant row with absolute `index`. */
export function variantCell(page: Page, index: number): Locator {
  return rowByIndex(page, index).locator('[data-row-variant]');
}

/** The header cell stamped for `column`. */
export function headerCell(page: Page, column: string): Locator {
  return page.locator(`${HEADER_CELL_SELECTOR}[data-column="${column}"]`);
}

/** The header cell at `position`, left to right — for a column-agnostic claim. */
export function headerCellAt(page: Page, position: number): Locator {
  return page.locator(HEADER_CELL_SELECTOR).nth(position);
}

/** The stamped header columns, left to right. */
export function headerOrder(page: Page): Promise<(string | null)[]> {
  return page
    .locator(HEADER_CELL_SELECTOR)
    .evaluateAll((cells) => cells.map((c) => c.getAttribute('data-column')));
}

/** Scroll the fixture's `data-testid="root"` scroll container to `offset`. */
export async function scrollRootTo(page: Page, offset: number): Promise<void> {
  await page.locator('[data-testid="root"]').evaluate((node, top) => {
    (node as HTMLElement).scrollTop = top;
  }, offset);
}
