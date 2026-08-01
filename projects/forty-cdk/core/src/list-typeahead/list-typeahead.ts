import { isDevMode } from '@angular/core';

import {
  type ListOrientation,
  resolveListNavigation,
  type WritingDirection,
} from '../keyboard-navigation/keyboard-navigation';
import { findTypeaheadMatch } from '../typeahead/match-options';
import type { Typeahead } from '../typeahead/typeahead';

/** Orientation / direction context {@link isRangeSelectShortcut} reads to resolve arrow intent. */
export interface RangeSelectShortcutContext {
  /** The list's navigation orientation. */
  readonly orientation: ListOrientation;
  /** The list's resolved writing direction. */
  readonly dir: WritingDirection;
}

/**
 * Whether a keydown is one of the APG multi-select range-selection shortcuts:
 * Ctrl/Cmd+A (select all), Ctrl+Shift+Home / End (range to edge), Shift+Space
 * (range to focused), or Shift+Arrow along the list axis (extend by one).
 * `Alt` disqualifies every combination. Shared by the virtualized keydown
 * handlers of Listbox and Select to detect an unsupported range action before
 * throwing.
 */
export function isRangeSelectShortcut(
  event: KeyboardEvent,
  context: RangeSelectShortcutContext,
): boolean {
  if (event.altKey) {
    return false;
  }
  const mod = event.ctrlKey || event.metaKey;
  if (mod && !event.shiftKey) {
    return event.key === 'a' || event.key === 'A';
  }
  if (mod && event.shiftKey) {
    return event.key === 'Home' || event.key === 'End';
  }
  if (event.shiftKey) {
    if (event.key === ' ' || event.key === 'Spacebar') {
      return true;
    }
    const action = resolveListNavigation(event, {
      orientation: context.orientation,
      dir: context.dir,
    });
    return action === 'next' || action === 'prev';
  }
  return false;
}

/** Identity of the primitive throwing {@link throwUnsupportedVirtualizedRangeSelect}. */
export interface UnsupportedVirtualizedRangeSelectContext {
  /** Primitive name for the `[forty-cdk/<primitive>]` error prefix (e.g. `'listbox'`). */
  readonly primitive: string;
  /** Non-virtualized focus model named in the remediation hint (e.g. `'roving-tabindex'`). */
  readonly focusModel: string;
}

/**
 * Throws (in dev mode only) the standard error explaining that APG range
 * keyboard is unsupported together with virtualization, because range selection
 * needs the full set of enabled options across the range while the list is only
 * partially mounted. Shared by Listbox and Select; the primitive name and the
 * non-virtualized focus-model hint are the only per-primitive differences.
 */
export function throwUnsupportedVirtualizedRangeSelect(
  context: UnsupportedVirtualizedRangeSelectContext,
): void {
  if (isDevMode()) {
    throw new Error(
      `[forty-cdk/${context.primitive}] Multi-select range keyboard (Shift+Arrow, Shift+Space, Ctrl/Cmd+A, ` +
        'Ctrl+Shift+Home/End) is not supported together with virtualization (`totalCount` set). ' +
        'Range selection needs the full set of enabled options across the range, which is ' +
        'unavailable while the list is partially unmounted. Toggle options individually with ' +
        `Enter, Space, or click, or drop \`totalCount\` to use the non-virtualized ${context.focusModel} ` +
        'listbox.',
    );
  }
}

/**
 * Identity of the primitive throwing
 * {@link throwUnsupportedVirtualizedSelectionFollowsFocus}.
 */
export interface UnsupportedVirtualizedSelectionFollowsFocusContext {
  /** Primitive name for the `[forty-cdk/<primitive>]` error prefix (e.g. `'listbox'`). */
  readonly primitive: string;
  /** Non-virtualized focus model named in the remediation hint (e.g. `'roving-tabindex'`). */
  readonly focusModel: string;
  /** Collection the hint names after the focus model (e.g. `'listbox'`, `'tree'`). */
  readonly collection: string;
}

/**
 * Throws (in dev mode only) the standard error explaining that
 * `selectionFollowsFocus` is unsupported together with virtualization, because
 * the activedescendant path resolves off-window navigation targets
 * asynchronously and so cannot carry selection with focus.
 *
 * Call it from **every keyboard move of the virtualized activedescendant**
 * rather than from a config-watching `effect`: the combination degrades a
 * keyboard move, so the move is the point at which a throw carries a stack the
 * consumer can act on. "Every" is load-bearing — arrow navigation is only one
 * of the moves, and a guard on that branch alone leaves a consumer who
 * navigates by typeahead (or, in a tree, by entering a child) with the same
 * silent degradation and no report. Each root routes its moves through one
 * private `#assertSelectionFollowsFocusSupported()` for that reason. Seeding
 * the activedescendant on focus / open is not a move and is deliberately
 * uncovered.
 *
 * Shared by Listbox, Select and Tree; the primitive name and the two hint
 * fragments are the only per-primitive differences.
 */
export function throwUnsupportedVirtualizedSelectionFollowsFocus(
  context: UnsupportedVirtualizedSelectionFollowsFocusContext,
): void {
  if (isDevMode()) {
    throw new Error(
      `[forty-cdk/${context.primitive}] \`selectionFollowsFocus\` is not supported together with ` +
        'virtualization (`totalCount` set). The virtualized activedescendant path resolves ' +
        'off-window navigation targets asynchronously, so selection cannot follow focus there. ' +
        'Remove one of the two: use `selectionFollowsFocus` only with the non-virtualized ' +
        `${context.focusModel} ${context.collection}.`,
    );
  }
}

/** Per-call inputs {@link resolveListTypeahead} needs to run a match. */
export interface ListTypeaheadConfig<H> {
  /** Live options to scan, in document order. */
  readonly items: readonly H[];
  /** Index of the currently-anchored option, or `-1` when nothing is anchored. */
  readonly anchorIndex: number;
  /** Resolve an option's match text (e.g. its accessible `textContent`). */
  readonly getText: (item: H) => string;
  /** Whether an option is skipped. */
  readonly isDisabled: (item: H) => boolean;
}

/** Outcome of a {@link resolveListTypeahead} call. */
export interface ListTypeaheadResult<H> {
  /** Whether the key was a printable character the typeahead buffer consumed. */
  readonly handled: boolean;
  /** The matched option when the buffer resolved one, else `null`. */
  readonly match: H | null;
}

/**
 * The shared list-typeahead policy for the open (DOM-focus) and virtualized
 * (activedescendant) paths of Listbox and Select: feed the key to the
 * `Typeahead` buffer, and — when consumed — run `findTypeaheadMatch` always
 * threading `repeated: isRepeatedChar()` and the caller-resolved `anchorIndex`.
 * Callers decide what to do with the match (focus it, or move
 * `aria-activedescendant`) and whether the consumed key ends the event.
 */
export function resolveListTypeahead<H>(
  typeahead: Typeahead,
  event: KeyboardEvent,
  config: ListTypeaheadConfig<H>,
): ListTypeaheadResult<H> {
  if (!typeahead.handle(event)) {
    return { handled: false, match: null };
  }
  const match = findTypeaheadMatch(
    config.items,
    {
      buffer: typeahead.buffer(),
      repeated: typeahead.isRepeatedChar(),
      anchorIndex: config.anchorIndex,
    },
    config.getText,
    config.isDisabled,
  );
  return { handled: true, match };
}
