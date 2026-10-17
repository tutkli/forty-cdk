import { secondsOfDay, timeSentinel } from 'forty-cdk/core';
import { type TimeCapableDateAdapter } from 'forty-cdk/date-adapter';

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
  /**
   * The date-time value this slot represents, anchored to a fixed DST-stable
   * sentinel date. The consumer grafts this wall-clock time onto the real
   * selected date at commit time.
   */
  readonly value: D;
  /** Display label formatted via the active adapter and the resolved format options. */
  readonly label: string;
  /**
   * Whether this slot is the selected one. At most one slot is selected: the slot the value falls
   * in at step resolution when that slot shares the value's `granularity` bucket, else the first
   * slot of that bucket.
   */
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
  /** BCP 47 locale for the slot label; the runtime default when omitted. */
  readonly locale?: string;
}

export function timeOfDaySeconds<D>(
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

const GRANULARITY_SECONDS: Readonly<Record<TimePickerGranularity, number>> = {
  hour: 3600,
  minute: 60,
  second: 1,
};

function stepSecondsOf(step: number): number {
  return Math.max(1, Math.round(step)) * 60;
}

/**
 * Time of day, in seconds, of the one slot `value` selects, or `null` when no slot shares its
 * `granularity` bucket. Prefers the slot the value falls in at step resolution, so a step finer
 * than the granularity still marks a single option.
 */
export function selectedSlotSeconds<D>(
  adapter: TimeCapableDateAdapter<D>,
  value: D,
  step: number,
  granularity: TimePickerGranularity,
): number | null {
  const stepSeconds = stepSecondsOf(step);
  const size = GRANULARITY_SECONDS[granularity];
  const valueSeconds = secondsOfDay(adapter, value);
  const bucketStart = Math.floor(valueSeconds / size) * size;
  const floored = Math.floor(valueSeconds / stepSeconds) * stepSeconds;
  if (floored >= bucketStart) {
    return floored;
  }
  const first = Math.ceil(bucketStart / stepSeconds) * stepSeconds;
  return first < bucketStart + size ? first : null;
}

/**
 * Generates the full-day slot list for a {@link ForTimePicker}.
 *
 * Slots span the full 24-hour day (00:00:00 up to but not past 24:00). Each slot's
 * `disabled` flag is `true` when its time-of-day falls outside `[minTime, maxTime]`
 * — slots are never omitted, following the WAI-ARIA option convention for disabled
 * items.
 *
 * Every slot value is anchored to a fixed DST-stable sentinel date so wall-clock
 * times never collide on a spring-forward day; the consumer grafts the picked
 * time onto the real selected date at commit.
 *
 * Pure function: no signals, no DOM, no side effects.
 */
export function buildTimeSlots<D>(config: BuildTimeSlotsConfig<D>): readonly ForTimeSlot<D>[] {
  const { adapter, selected, minTime, maxTime, step, granularity, formatOptions, locale } = config;
  const anchor = timeSentinel(adapter);
  const stepSeconds = stepSecondsOf(step);
  const selectedSec =
    selected !== null ? selectedSlotSeconds(adapter, selected, step, granularity) : null;
  const minSec = minTime !== null ? timeOfDaySeconds(adapter, minTime, 'second') : null;
  const maxSec = maxTime !== null ? timeOfDaySeconds(adapter, maxTime, 'second') : null;

  const slots: ForTimeSlot<D>[] = [];
  for (let t = 0; t < 86400; t += stepSeconds) {
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    const value = adapter.setTime(anchor, h, m, s);
    const label = adapter.format(value, formatOptions, locale);
    const disabled = (minSec !== null && t < minSec) || (maxSec !== null && t > maxSec);
    slots.push({ id: `slot-${t}`, value, label, selected: t === selectedSec, disabled });
  }
  return slots;
}
