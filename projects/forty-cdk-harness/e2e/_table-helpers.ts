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

/** Every stamped row, in document order. */
export function rows(page: Page): Locator {
  return page.locator('[forTableRow]');
}

/** The row at `position` in the rendered list — non-virtualized bodies. */
export function rowAt(page: Page, position: number): Locator {
  return rows(page).nth(position);
}

/** The row carrying the absolute `data-index` — virtualized bodies. */
export function rowByIndex(page: Page, index: number): Locator {
  return page.locator(`[forTableRow][data-index="${index}"]`);
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
  return page.locator(`[forTableHeaderCell][data-column="${column}"]`);
}

/** The stamped header columns, left to right. */
export function headerOrder(page: Page): Promise<(string | null)[]> {
  return page
    .locator('[forTableHeaderCell]')
    .evaluateAll((cells) => cells.map((c) => c.getAttribute('data-column')));
}

/** Scroll the fixture's `data-testid="root"` scroll container to `offset`. */
export async function scrollRootTo(page: Page, offset: number): Promise<void> {
  await page.locator('[data-testid="root"]').evaluate((node, top) => {
    (node as HTMLElement).scrollTop = top;
  }, offset);
}
