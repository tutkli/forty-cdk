/**
 * The directional intents a calendar grid keyboard move can express. Each
 * sub-grid (day / month / year) maps these onto its own coordinate space —
 * dates for the day grid, a linear month index for the month grid, a year
 * number for the year grid — so the arrow / `Home` / `End` / `PageUp` /
 * `PageDown` dispatch lives in one place instead of three near-identical
 * `switch` statements.
 */
export interface CalendarGridMoves<T> {
  /** Move one column horizontally (signed: `-1` left, `1` right) before RTL mirroring. */
  horizontal(step: -1 | 1): T;
  /** Move one row vertically (signed: `-1` up, `1` down). */
  vertical(step: -1 | 1): T;
  /** Move to the first cell of the current line (`Home`). */
  lineStart(): T;
  /** Move to the last cell of the current line (`End`). */
  lineEnd(): T;
  /** Page backward (`PageUp`); `shiftKey` distinguishes the coarser step where it applies. */
  pageBackward(shiftKey: boolean): T;
  /** Page forward (`PageDown`); `shiftKey` distinguishes the coarser step where it applies. */
  pageForward(shiftKey: boolean): T;
}

/**
 * Resolve a calendar grid keydown into the target the move lands on, or `null`
 * when the key is not a navigation key. `rtl` mirrors the horizontal arrows.
 * Shared by all three sub-grids via their {@link CalendarGridMoves} mapping.
 */
export function resolveCalendarGridMove<T>(
  event: KeyboardEvent,
  rtl: boolean,
  moves: CalendarGridMoves<T>,
): T | null {
  switch (event.key) {
    case 'ArrowLeft':
      return moves.horizontal(rtl ? 1 : -1);
    case 'ArrowRight':
      return moves.horizontal(rtl ? -1 : 1);
    case 'ArrowUp':
      return moves.vertical(-1);
    case 'ArrowDown':
      return moves.vertical(1);
    case 'Home':
      return moves.lineStart();
    case 'End':
      return moves.lineEnd();
    case 'PageUp':
      return moves.pageBackward(event.shiftKey);
    case 'PageDown':
      return moves.pageForward(event.shiftKey);
    default:
      return null;
  }
}

/** Whether a keydown is the activation key (`Enter` / `Space`) every sub-grid selects on. */
export function isCalendarActivationKey(event: KeyboardEvent): boolean {
  return event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar';
}
