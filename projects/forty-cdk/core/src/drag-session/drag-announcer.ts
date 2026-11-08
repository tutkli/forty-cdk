import type { LiveAnnouncer } from '../live-announcer/live-announcer';

import { dragAnnouncementLabel, dragElementName } from './drag-announcement-label';

/** What a positional announcement says about the list its position belongs to. */
export interface DragAnnouncementContext {
  /** The list's accessible name from `aria-labelledby` / `aria-label`, or `''`. */
  readonly list: string;
  /** Whether that list is not the one the item was lifted from. */
  readonly transfer: boolean;
}

/** A positional announcement builder: 1-based `index` of `total` valid positions. */
export type PositionalDragAnnouncement = (
  label: string,
  index: number,
  total: number,
  context: DragAnnouncementContext,
) => string;

/** The four builders a reorder coordinator announces a drag with. */
export interface DragAnnouncementText {
  readonly lift: PositionalDragAnnouncement;
  readonly move: PositionalDragAnnouncement;
  readonly drop: PositionalDragAnnouncement;
  readonly cancel: (label: string) => string;
}

/**
 * The dragged item: its host, plus the `[textValue]` override naming it when it has one. A
 * `null` host, read after the session it belonged to ended, names the item `''`.
 */
export interface DragAnnouncedItem {
  readonly host: Element | null;
  readonly textValue?: string | null;
}

/** A position an announcement describes. */
export interface DragAnnouncedPosition {
  /** 0-based position within `list`. */
  readonly index: number;
  /** Number of valid drop positions in `list`. */
  readonly total: number;
  /** Host of the list the position belongs to. */
  readonly list: Element;
  /** Host of the list the item was lifted from. */
  readonly source: Element;
}

/**
 * The one place a reorder coordinator turns a drag into live-region text. It names the item
 * through {@link dragAnnouncementLabel}, names the list a position belongs to and whether that
 * list is a transfer target, and hands both to the coordinator's builders. Lift, drop and cancel
 * are announced assertively and a move politely unless the caller asks otherwise.
 */
export class DragAnnouncer {
  readonly #announcer: LiveAnnouncer;
  readonly #text: () => DragAnnouncementText;

  constructor(announcer: LiveAnnouncer, text: () => DragAnnouncementText) {
    this.#announcer = announcer;
    this.#text = text;
  }

  lift(item: DragAnnouncedItem, at: DragAnnouncedPosition): void {
    this.#positional(this.#text().lift, item, at, 'assertive');
  }

  move(
    item: DragAnnouncedItem,
    at: DragAnnouncedPosition,
    politeness: 'polite' | 'assertive' = 'polite',
  ): void {
    this.#positional(this.#text().move, item, at, politeness);
  }

  drop(item: DragAnnouncedItem, at: DragAnnouncedPosition): void {
    this.#positional(this.#text().drop, item, at, 'assertive');
  }

  cancel(item: DragAnnouncedItem): void {
    this.#announcer.announce(this.#text().cancel(itemName(item)), 'assertive');
  }

  #positional(
    build: PositionalDragAnnouncement,
    item: DragAnnouncedItem,
    at: DragAnnouncedPosition,
    politeness: 'polite' | 'assertive',
  ): void {
    const context = { list: dragElementName(at.list), transfer: at.list !== at.source };
    this.#announcer.announce(build(itemName(item), at.index + 1, at.total, context), politeness);
  }
}

function itemName(item: DragAnnouncedItem): string {
  return item.host === null ? '' : dragAnnouncementLabel(item.host, item.textValue);
}

/** `index` clamped to the positions `[0, count - 1]`; `0` when there are none. */
export function clampDragIndex(index: number, count: number): number {
  return Math.max(0, Math.min(count - 1, index));
}

/**
 * The position a keyboard step from `current` towards `requested` lands on, clamped to
 * `[0, count - 1]`, or `null` when it lands on `current`. A coordinator applies a step only when
 * this is non-null, so a key pressed at a boundary neither announces nor scrolls.
 */
export function stepDragTarget(current: number, requested: number, count: number): number | null {
  const next = clampDragIndex(requested, count);
  return next === current ? null : next;
}
