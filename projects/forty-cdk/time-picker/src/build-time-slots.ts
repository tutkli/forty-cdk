import { type TimeCapableDateAdapter, secondsOfDay } from 'forty-cdk/core';

/** The time granularity at which the picker operates. */
export type TimePickerGranularity = 'hour' | 'minute' | 'second';

/**
 * A single generated time slot in the listbox.
 *
 * @typeParam D The adapter's date-time type.
 */
export interface ForTimeSlot<D> {
  /** Stable identifier for use as the `track` expression in `@for`. Value is `'slot-' + totalSeconds`. */
  readonly id: string;
  /** The date-time value this slot represents, anchored to the consumer's selected date (or a sentinel). */
  readonly value: D;
  /** Display label formatted via the active adapter and the resolved format options. */
  readonly label: string;
  /** Whether this slot is currently selected, compared at the configured granularity. */
  readonly selected: boolean;
  /** Whether this slot is disabled because its time-of-day falls outside `[minTime, maxTime]`. */
  readonly disabled: boolean;
}

/**
 * Configuration bag for {@link buildTimeSlots}.
 *
 * @typeParam D The adapter's date-time type.
 */
export interface BuildTimeSlotsConfig<D> {
  readonly adapter: TimeCapableDateAdapter<D>;
  /** The date-time used as the date anchor for every slot value. Typically `value ?? sentinel`. */
  readonly anchor: D;
  /** The currently committed value, or `null` when nothing is selected. */
  readonly selected: D | null;
  /** Lower bound (inclusive). Only the time-of-day component is considered. `null` = start-of-day. */
  readonly minTime: D | null;
  /** Upper bound (inclusive). Only the time-of-day component is considered. `null` = end-of-day. */
  readonly maxTime: D | null;
  /** Slot interval in whole minutes. Clamped to ≥ 1. */
  readonly step: number;
  readonly granularity: TimePickerGranularity;
  /** `Intl.DateTimeFormat` options for the slot label. */
  readonly formatOptions: Intl.DateTimeFormatOptions;
}

function timeOfDaySeconds<D>(
  adapter: TimeCapableDateAdapter<D>,
  d: D,
  granularity: TimePickerGranularity,
): number {
  const h = adapter.getHours(d);
  if (granularity === 'hour') {
    return h * 3600;
  }
  if (granularity === 'minute') {
    return h * 3600 + adapter.getMinutes(d) * 60;
  }
  return secondsOfDay(adapter, d);
}

/**
 * Generates the full-day slot list for a {@link ForTimePicker}.
 *
 * Slots span the full 24-hour day (00:00:00 up to but not past 24:00). Each slot's
 * `disabled` flag is `true` when its time-of-day falls outside `[minTime, maxTime]`
 * — slots are never omitted, following the WAI-ARIA option convention for disabled
 * items.
 *
 * Pure function: no signals, no DOM, no side effects.
 */
export function buildTimeSlots<D>(config: BuildTimeSlotsConfig<D>): readonly ForTimeSlot<D>[] {
  const { adapter, anchor, selected, minTime, maxTime, step, granularity, formatOptions } = config;
  const stepSeconds = Math.max(1, Math.round(step)) * 60;
  const minSec = minTime !== null ? timeOfDaySeconds(adapter, minTime, 'second') : null;
  const maxSec = maxTime !== null ? timeOfDaySeconds(adapter, maxTime, 'second') : null;

  const slots: ForTimeSlot<D>[] = [];
  for (let t = 0; t < 86400; t += stepSeconds) {
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    const value = adapter.setTime(anchor, h, m, s);
    const label = adapter.format(value, formatOptions);
    const slotGranularSec = timeOfDaySeconds(adapter, value, granularity);
    const slotFullSec = h * 3600 + m * 60 + s;
    const isSelected =
      selected !== null && slotGranularSec === timeOfDaySeconds(adapter, selected, granularity);
    const disabled =
      (minSec !== null && slotFullSec < minSec) || (maxSec !== null && slotFullSec > maxSec);
    slots.push({ id: `slot-${t}`, value, label, selected: isSelected, disabled });
  }
  return slots;
}
