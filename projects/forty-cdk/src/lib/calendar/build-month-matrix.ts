import { type DateAdapter } from 'forty-cdk/core';

/**
 * Builds the day grid for the month containing `monthAnchor`.
 *
 * Returns rows of 7 dates each, starting at `firstDayOfWeek`. Leading and
 * trailing days from the adjacent months are included so every row is full;
 * callers mark them with `data-outside-month`. The number of rows is the
 * minimum needed to cover the month (4-6), so there is no empty trailing week.
 *
 * Pure and adapter-driven: the same `(adapter, anchor, firstDayOfWeek)` always
 * yields the same matrix, and two adapters over the same calendar system
 * produce day-identical grids.
 *
 * @param adapter The date adapter to compute with.
 * @param monthAnchor Any date within the target month.
 * @param firstDayOfWeek First column's day of week, **0-6** (`0` = Sunday).
 */
export function buildMonthMatrix<D>(
  adapter: DateAdapter<D>,
  monthAnchor: D,
  firstDayOfWeek: number,
): D[][] {
  const firstOfMonth = adapter.createDate(
    adapter.getYear(monthAnchor),
    adapter.getMonth(monthAnchor),
    1,
  );
  const daysInMonth = adapter.getDaysInMonth(firstOfMonth);
  const leading = (adapter.getDayOfWeek(firstOfMonth) - firstDayOfWeek + 7) % 7;
  const numWeeks = Math.ceil((leading + daysInMonth) / 7);
  const gridStart = adapter.addDays(firstOfMonth, -leading);

  const weeks: D[][] = [];
  for (let week = 0; week < numWeeks; week++) {
    const row: D[] = [];
    for (let day = 0; day < 7; day++) {
      row.push(adapter.addDays(gridStart, week * 7 + day));
    }
    weeks.push(row);
  }
  return weeks;
}
