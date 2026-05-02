/**
 * Pure helpers that translate keyboard events into navigation intents and
 * compute the resulting index for 1D lists and 2D grids. No DOM access, no
 * DI, no state — primitives compose them inside their own keydown handlers.
 *
 * Pair with `RovingTabindex` to actually move focus.
 */

export type ListOrientation = 'horizontal' | 'vertical' | 'both';
export type WritingDirection = 'ltr' | 'rtl';

export type ListNavigationAction = 'next' | 'prev' | 'first' | 'last';

export interface ListNavigationOptions {
  orientation: ListOrientation;
  /** Reading direction. RTL swaps ArrowLeft/ArrowRight. Default `'ltr'`. */
  dir?: WritingDirection;
  /**
   * When true, PageUp / PageDown map to `first` / `last`. Default `false` —
   * controls that handle paging themselves should keep this off.
   */
  pageKeys?: boolean;
}

/**
 * Maps a keyboard event to a 1D navigation action, or `null` if the key is
 * not handled by the configured orientation.
 */
export function resolveListNavigation(
  event: KeyboardEvent,
  options: ListNavigationOptions,
): ListNavigationAction | null {
  const { orientation, dir = 'ltr', pageKeys = false } = options;
  const acceptsVertical = orientation === 'vertical' || orientation === 'both';
  const acceptsHorizontal = orientation === 'horizontal' || orientation === 'both';

  switch (event.key) {
    case 'Home':
      return 'first';
    case 'End':
      return 'last';
    case 'PageUp':
      return pageKeys ? 'first' : null;
    case 'PageDown':
      return pageKeys ? 'last' : null;
    case 'ArrowUp':
      return acceptsVertical ? 'prev' : null;
    case 'ArrowDown':
      return acceptsVertical ? 'next' : null;
    case 'ArrowLeft':
      return acceptsHorizontal ? (dir === 'rtl' ? 'next' : 'prev') : null;
    case 'ArrowRight':
      return acceptsHorizontal ? (dir === 'rtl' ? 'prev' : 'next') : null;
    default:
      return null;
  }
}

export type GridNavigationAction =
  | 'next'
  | 'prev'
  | 'next-row'
  | 'prev-row'
  | 'first'
  | 'last'
  | 'first-in-row'
  | 'last-in-row';

export interface GridNavigationOptions {
  /** Number of columns in the grid. Required. */
  cols: number;
  /** Reading direction. RTL swaps ArrowLeft/ArrowRight. Default `'ltr'`. */
  dir?: WritingDirection;
  /** PageUp / PageDown map to first / last when true. Default `false`. */
  pageKeys?: boolean;
}

/**
 * Maps a keyboard event to a 2D grid navigation action.
 *
 * APG: `Ctrl+Home` / `Ctrl+End` jump to the first / last cell of the entire
 * grid. Plain `Home` / `End` go to the first / last cell of the current row.
 */
export function resolveGridNavigation(
  event: KeyboardEvent,
  options: GridNavigationOptions,
): GridNavigationAction | null {
  const { dir = 'ltr', pageKeys = false } = options;

  switch (event.key) {
    case 'ArrowUp':
      return 'prev-row';
    case 'ArrowDown':
      return 'next-row';
    case 'ArrowLeft':
      return dir === 'rtl' ? 'next' : 'prev';
    case 'ArrowRight':
      return dir === 'rtl' ? 'prev' : 'next';
    case 'Home':
      return event.ctrlKey ? 'first' : 'first-in-row';
    case 'End':
      return event.ctrlKey ? 'last' : 'last-in-row';
    case 'PageUp':
      return pageKeys ? 'first' : null;
    case 'PageDown':
      return pageKeys ? 'last' : null;
    default:
      return null;
  }
}

export interface MoveIndexOptions {
  /** Wrap around at the ends. Default `false`. */
  loop?: boolean;
  /** Predicate to skip indices (e.g. disabled items). */
  isDisabled?: (index: number) => boolean;
}

/**
 * Computes the resulting index for a 1D navigation action, respecting `loop`
 * and skipping disabled items. Returns `null` when no enabled target exists
 * in the requested direction.
 */
export function moveIndex(
  current: number,
  count: number,
  action: ListNavigationAction,
  options: MoveIndexOptions = {},
): number | null {
  if (count <= 0) {
    return null;
  }
  const { loop = false, isDisabled } = options;

  if (action === 'first') {
    return scanFirstEnabled(0, count, 1, isDisabled);
  }
  if (action === 'last') {
    return scanFirstEnabled(count - 1, count, -1, isDisabled);
  }

  const step = action === 'next' ? 1 : -1;
  return scanNextEnabled(current, count, step, loop, isDisabled);
}

export interface MoveGridIndexOptions extends MoveIndexOptions {
  cols: number;
}

/**
 * Computes the resulting index for a 2D grid navigation action.
 *
 * - `next` / `prev`: linear forward / backward — wraps within the row when
 *   `loop=true`, then to next / previous row.
 * - `next-row` / `prev-row`: jumps one row vertically. The last row may be
 *   incomplete; if the column doesn't exist there, falls back to the last
 *   filled cell of that row.
 * - `first` / `last`: first / last enabled cell overall.
 * - `first-in-row` / `last-in-row`: row extremes.
 *
 * Returns `null` when no enabled target exists for the requested action.
 */
export function moveGridIndex(
  current: number,
  count: number,
  action: GridNavigationAction,
  options: MoveGridIndexOptions,
): number | null {
  if (count <= 0 || options.cols <= 0) {
    return null;
  }
  const { cols, loop = false, isDisabled } = options;
  const rowOf = (i: number) => Math.floor(i / cols);
  const colOf = (i: number) => i % cols;
  const totalRows = Math.ceil(count / cols);

  switch (action) {
    case 'first':
      return scanFirstEnabled(0, count, 1, isDisabled);
    case 'last':
      return scanFirstEnabled(count - 1, count, -1, isDisabled);
    case 'first-in-row': {
      const row = rowOf(current);
      const start = row * cols;
      const end = Math.min(start + cols, count);
      return scanFirstEnabledInRange(start, end, 1, isDisabled);
    }
    case 'last-in-row': {
      const row = rowOf(current);
      const start = row * cols;
      const end = Math.min(start + cols, count);
      return scanFirstEnabledInRange(end - 1, start - 1, -1, isDisabled);
    }
    case 'next':
      return scanNextEnabled(current, count, 1, loop, isDisabled);
    case 'prev':
      return scanNextEnabled(current, count, -1, loop, isDisabled);
    case 'next-row':
    case 'prev-row': {
      const direction = action === 'next-row' ? 1 : -1;
      const col = colOf(current);
      let row = rowOf(current) + direction;
      for (let visited = 0; visited < totalRows; visited++) {
        if (row < 0 || row >= totalRows) {
          if (!loop) {
            return null;
          }
          row = ((row % totalRows) + totalRows) % totalRows;
        }
        const candidateRowStart = row * cols;
        const candidateRowEnd = Math.min(candidateRowStart + cols, count);
        // Try the same column; if missing in last partial row, fall back to row's last cell.
        const target =
          candidateRowStart + col < candidateRowEnd
            ? candidateRowStart + col
            : candidateRowEnd - 1;
        if (target === current) {
          return null;
        }
        if (!isDisabled || !isDisabled(target)) {
          return target;
        }
        row += direction;
      }
      return null;
    }
    default:
      return null;
  }
}

function scanFirstEnabled(
  start: number,
  count: number,
  step: number,
  isDisabled: ((i: number) => boolean) | undefined,
): number | null {
  for (let i = start; i >= 0 && i < count; i += step) {
    if (!isDisabled || !isDisabled(i)) {
      return i;
    }
  }
  return null;
}

function scanFirstEnabledInRange(
  start: number,
  end: number,
  step: number,
  isDisabled: ((i: number) => boolean) | undefined,
): number | null {
  for (let i = start; step > 0 ? i < end : i > end; i += step) {
    if (!isDisabled || !isDisabled(i)) {
      return i;
    }
  }
  return null;
}

function scanNextEnabled(
  current: number,
  count: number,
  step: number,
  loop: boolean,
  isDisabled: ((i: number) => boolean) | undefined,
): number | null {
  for (let visited = 1; visited <= count; visited++) {
    let candidate = current + step * visited;
    if (candidate < 0 || candidate >= count) {
      if (!loop) {
        return null;
      }
      candidate = ((candidate % count) + count) % count;
    }
    if (candidate === current) {
      return null;
    }
    if (!isDisabled || !isDisabled(candidate)) {
      return candidate;
    }
  }
  return null;
}
