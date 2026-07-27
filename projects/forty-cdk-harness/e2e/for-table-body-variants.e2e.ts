import { expect, test, type Locator, type Page } from '@playwright/test';
import { el, expectFocused, gotoFixture } from './_helpers';
import {
  dataCell,
  dataCellAt,
  headerCell,
  rowAt,
  rows,
  scrollRootTo,
  variantCell,
  variantCellAt,
} from './_table-helpers';

const ROW_HEIGHT = 44;
const MID = 250;
const LAST = 499;

/**
 * A full-span row variant behaves the same whether the body renders every row
 * or only a window of them: the variant cell is presentational, it is not a
 * roving tab stop, and vertical arrow navigation steps over it onto the
 * adjacent data row while preserving the column.
 *
 * That shared behaviour used to live twice — once per fixture — in two spec
 * files, so the virtualization axis had multiplied the file count rather than
 * the case count. It is parameterised over the axis here instead: the axis
 * supplies the route, how to bring a row into the DOM, and how to address a
 * row (by position when every row is stamped, by absolute `data-index` when
 * only the window is). Adding a third axis adds an entry, not a file.
 *
 * Assertions that only make sense on one axis (the static body's
 * `aria-rowindex` reading order, the virtualized body's cross-window
 * Ctrl+Home / Ctrl+End) stay in their own describes below.
 */
interface VariantAxis {
  readonly name: string;
  readonly route: string;
  /** Bring the rows around the variant into the DOM. */
  readonly reveal: (page: Page) => Promise<void>;
  /** The data row before the variant, the variant itself, the data row after. */
  readonly before: number;
  readonly variant: number;
  readonly after: number;
  /**
   * A second stamped column, so the column-preservation half of the arrow
   * assertions is exercised on a column other than the one the ArrowDown case
   * uses. The two fixtures declare different column sets.
   */
  readonly otherColumn: string;
  readonly cell: (page: Page, row: number, column: string) => Locator;
  readonly variantCell: (page: Page, row: number) => Locator;
}

const AXES: readonly VariantAxis[] = [
  {
    name: 'static body',
    route: 'for-table-body-variants',
    reveal: async () => {},
    before: 2,
    variant: 3,
    after: 4,
    otherColumn: 'role',
    cell: dataCellAt,
    variantCell: variantCellAt,
  },
  {
    name: 'virtualized body',
    route: 'for-table-body-variants-virtualized',
    reveal: (page) => scrollRootTo(page, (MID - 5) * ROW_HEIGHT),
    before: MID - 1,
    variant: MID,
    after: MID + 1,
    otherColumn: 'id',
    cell: dataCell,
    variantCell,
  },
];

for (const axis of AXES) {
  test.describe(`ForTableBody — row variants (${axis.name})`, () => {
    test.beforeEach(async ({ page }) => {
      await gotoFixture(page, axis.route);
      await axis.reveal(page);
    });

    test('stamps the variant row as a full-span presentational gridcell', async ({ page }) => {
      await expect(axis.variantCell(page, axis.variant)).toHaveAttribute('role', 'gridcell');
    });

    test('the variant cell is not a roving tab stop', async ({ page }) => {
      await expect(axis.variantCell(page, axis.variant)).not.toHaveAttribute('tabindex', /.*/);
    });

    test('ArrowDown steps over the variant row onto the next data row, preserving the column', async ({
      page,
    }) => {
      const start = axis.cell(page, axis.before, 'name');
      await expect(start).toBeAttached();
      await start.click();
      await expectFocused(start);

      await page.keyboard.press('ArrowDown');
      await expectFocused(axis.cell(page, axis.after, 'name'));
    });

    test('ArrowUp steps over the variant row onto the previous data row, preserving the column', async ({
      page,
    }) => {
      const start = axis.cell(page, axis.after, axis.otherColumn);
      await expect(start).toBeAttached();
      await start.click();
      await expectFocused(start);

      await page.keyboard.press('ArrowUp');
      await expectFocused(axis.cell(page, axis.before, axis.otherColumn));
    });
  });
}

test.describe('ForTableBody — row variants (static body only)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFixture(page, 'for-table-body-variants');
  });

  test('stamps a full-span variant cell for matched rows and per-column cells otherwise', async ({
    page,
  }) => {
    await expect(variantCellAt(page, 0)).toHaveAttribute('aria-colspan', '2');
    await expect(variantCellAt(page, 0)).toHaveText('Engineers');

    await expect(rowAt(page, 1).locator('[data-column]')).toHaveCount(2);
    await expect(dataCellAt(page, 1, 'name')).toHaveText('Ada');
  });

  test('counts variant rows in aria-rowindex reading order', async ({ page }) => {
    const rowindices = await rows(page).evaluateAll((all) =>
      all.map((r) => r.getAttribute('aria-rowindex')),
    );
    expect(rowindices).toEqual(['2', '3', '4', '5', '6']);
  });
});

test.describe('ForTableBody — row variants (virtualized body only)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoFixture(page, 'for-table-body-variants-virtualized');
  });

  test('Ctrl+End with a trailing summary variant focuses the last data cell', async ({ page }) => {
    const start = dataCell(page, 1, 'id');
    await expect(start).toBeAttached();
    await start.click();
    await expectFocused(start);

    await page.keyboard.press('Control+End');

    await expect(dataCell(page, LAST - 1, 'name')).toBeAttached();
    await expectFocused(dataCell(page, LAST - 1, 'name'));
  });

  test('Ctrl+Home lands on the first header cell when the header participates in roving', async ({
    page,
  }) => {
    await el(page, 'root').evaluate((node) => {
      node.scrollTop = node.scrollHeight;
    });

    const start = dataCell(page, LAST - 1, 'name');
    await expect(start).toBeAttached();
    await start.click();
    await expectFocused(start);

    await page.keyboard.press('Control+Home');

    await expectFocused(headerCell(page, 'id'));
  });
});
