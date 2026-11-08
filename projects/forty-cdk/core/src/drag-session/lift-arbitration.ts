import { isImeComposing } from '../keyboard-navigation/ime-composition';

/** A pointer press arriving at a reorder coordinator, read against its keyboard lift. */
export interface LiftPress {
  /** Whether a keyboard lift is live. */
  readonly keyboardLifted: boolean;
  /** The item the keyboard lift holds, `null` when none is held. */
  readonly liftedHost: HTMLElement | null;
  /** The item the press landed on, `null` when it landed on no item. */
  readonly pressedHost: HTMLElement | null;
  /** Ends the live keyboard lift through the owner's announced cancel path. */
  cancelKeyboardLift(): void;
}

/**
 * Arbitrates a pointer press against a live keyboard lift, so the two never run at once. Every
 * keyboard-drop owner calls it from its pointer `canStart`, before writing any pointer state.
 *
 * With no keyboard lift live the press is free. A press on another item cancels the lift first,
 * so the pointer gesture that may follow starts from a clean session. A press on the lifted item,
 * or on no item, is refused and the lift continues.
 *
 * @returns Whether the press may go on to start a pointer gesture.
 */
export function arbitrateLiftPress(press: LiftPress): boolean {
  if (!press.keyboardLifted) {
    return true;
  }
  if (press.pressedHost === null || press.pressedHost === press.liftedHost) {
    return false;
  }
  press.cancelKeyboardLift();
  return true;
}

/**
 * Whether a key keeps its browser default while an item is lifted: a Ctrl / Cmd / Alt chord, a
 * function key, or a key belonging to an IME composition.
 *
 * @param event The keydown event fired while an item is lifted.
 */
export function isLiftedPassthroughKey(event: KeyboardEvent): boolean {
  return (
    isImeComposing(event) ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    /^F\d{1,2}$/.test(event.key)
  );
}

/**
 * Consumes a keydown the lifted drag maps to no action. The event never reaches the collection
 * under the coordinator, and its browser default is cancelled unless
 * {@link isLiftedPassthroughKey} keeps it.
 *
 * @param event The keydown event fired while an item is lifted.
 */
export function consumeUnmappedLiftedKey(event: KeyboardEvent): void {
  event.stopPropagation();
  if (!isLiftedPassthroughKey(event)) {
    event.preventDefault();
  }
}
