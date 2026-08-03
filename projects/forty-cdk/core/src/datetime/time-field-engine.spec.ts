import { signal, type WritableSignal } from '@angular/core';
import { NativeDateAdapter } from 'forty-cdk/calendar';

import { type TimeCapableDateAdapter } from '../date-adapter/date-adapter';
import { RovingTabindex } from '../roving-tabindex/roving-tabindex';
import { type SegmentType } from './segment-editor';
import { type TimeSegmentType } from './segment-types';
import { TimeFieldEngine } from './time-field-engine';
import { type TimeGranularity } from './time-segments';

const adapter = new NativeDateAdapter() as TimeCapableDateAdapter<Date>;

const timeAt = (hour: number, minute = 0, second = 0): Date =>
  adapter.setTime(adapter.createDate(2000, 1, 1), hour, minute, second);

interface Options {
  locale?: string | null;
  granularity?: TimeGranularity;
  hourCycle?: 12 | 24 | null;
  value?: Date | null;
  minTime?: Date | null;
  maxTime?: Date | null;
  emptySegmentText?: string;
}

interface Harness {
  engine: TimeFieldEngine<Date>;
  value: WritableSignal<Date | null>;
  disabled: WritableSignal<boolean>;
  readonly: WritableSignal<boolean>;
  granularity: WritableSignal<TimeGranularity>;
  hourCycle: WritableSignal<12 | 24 | null>;
  locale: WritableSignal<string | null>;
  minTime: WritableSignal<Date | null>;
  maxTime: WritableSignal<Date | null>;
}

function setup(options: Options = {}): Harness {
  const value = signal<Date | null>(options.value ?? null);
  const disabled = signal(false);
  const readonly = signal(false);
  const granularity = signal<TimeGranularity>(options.granularity ?? 'minute');
  const hourCycle = signal<12 | 24 | null>(options.hourCycle ?? null);
  const locale = signal<string | null>(options.locale ?? 'en-US');
  const minTime = signal<Date | null>(options.minTime ?? null);
  const maxTime = signal<Date | null>(options.maxTime ?? null);
  const placeholder = signal<Partial<Record<TimeSegmentType, string>>>({});
  const emptySegmentText = signal(options.emptySegmentText ?? 'Empty');
  const engine = new TimeFieldEngine<Date>({
    adapter,
    disabled,
    readonly,
    roving: new RovingTabindex(),
    granularity,
    hourCycle,
    locale,
    placeholder,
    emptySegmentText,
    minTime,
    maxTime,
    source: value,
    onCommit: (v) => value.set(v),
  });
  return {
    engine,
    value,
    disabled,
    readonly,
    granularity,
    hourCycle,
    locale,
    minTime,
    maxTime,
  };
}

function editableTypes(engine: TimeFieldEngine<Date>): TimeSegmentType[] {
  return engine.segments().flatMap((segment) => (segment.type ? [segment.type] : []));
}

function type(engine: TimeFieldEngine<Date>, segment: SegmentType, digits: string): void {
  for (const digit of digits) {
    engine.typeDigit(segment, Number(digit));
  }
}

describe('TimeFieldEngine locale segment order (current)', () => {
  it('orders hour / minute / second with a dayPeriod for a 12-hour locale', () => {
    const { engine } = setup({ locale: 'en-US', granularity: 'second', hourCycle: 12 });
    expect(editableTypes(engine)).toEqual(['hour', 'minute', 'second', 'dayPeriod']);
  });

  it('omits the dayPeriod segment in a 24-hour cycle', () => {
    const { engine } = setup({ locale: 'en-US', granularity: 'second', hourCycle: 24 });
    expect(editableTypes(engine)).toEqual(['hour', 'minute', 'second']);
  });
});

describe('TimeFieldEngine typeDigit compose (current)', () => {
  it('composes the value through setTime once the segments are filled', () => {
    const { engine, value } = setup({ granularity: 'minute', hourCycle: 24 });
    type(engine, 'hour', '09');
    type(engine, 'minute', '30');
    const committed = value();
    expect(committed).not.toBeNull();
    expect(adapter.getHours(committed as Date)).toBe(9);
    expect(adapter.getMinutes(committed as Date)).toBe(30);
  });
});

describe('TimeFieldEngine sentinel anchor (current)', () => {
  it('anchors a composed value to the 2000-01-01 sentinel when the source is null', () => {
    const { engine, value } = setup({ granularity: 'minute', hourCycle: 24 });
    type(engine, 'hour', '09');
    type(engine, 'minute', '30');
    const committed = value();
    expect(committed).not.toBeNull();
    expect(adapter.getYear(committed as Date)).toBe(2000);
    expect(adapter.getMonth(committed as Date)).toBe(1);
    expect(adapter.getDate(committed as Date)).toBe(1);
  });
});

describe('TimeFieldEngine transient vs settled (commit-on-settle contract)', () => {
  it('does not emit a mid-typing (transient) keystroke through onCommit', () => {
    const { engine, value } = setup({
      granularity: 'minute',
      hourCycle: 24,
      value: timeAt(10, 30, 0),
    });
    const before = value();
    engine.typeDigit('minute', 1);
    expect(value()).toBe(before);
  });

  it('always clamps composed() to the bounds, even mid-typing', () => {
    const { engine } = setup({
      granularity: 'minute',
      hourCycle: 24,
      minTime: timeAt(9, 0, 0),
    });
    type(engine, 'hour', '08');
    engine.typeDigit('minute', 0);
    const composed = engine.composed();
    expect(composed).not.toBeNull();
    expect(adapter.getHours(composed as Date)).toBe(9);
  });

  it('clamps a settled complete composition to the bounds', () => {
    const { engine, value } = setup({
      granularity: 'minute',
      hourCycle: 24,
      minTime: timeAt(9, 0, 0),
    });
    type(engine, 'hour', '08');
    type(engine, 'minute', '00');
    const committed = value();
    expect(committed).not.toBeNull();
    expect(adapter.getHours(committed as Date)).toBe(9);
    expect(adapter.getMinutes(committed as Date)).toBe(0);
  });
});

describe('TimeFieldEngine dayPeriod derivation (current)', () => {
  it('rehydrates the stored dayPeriod from a loaded value', () => {
    const { engine } = setup({ granularity: 'minute', hourCycle: 12, value: timeAt(13, 0, 0) });
    expect(engine.segmentValue('dayPeriod')).toBe(1);
    expect(engine.segmentValueText('dayPeriod')).toBe('PM');
  });

  it('reads AM from a morning value', () => {
    const { engine } = setup({ granularity: 'minute', hourCycle: 12, value: timeAt(9, 0, 0) });
    expect(engine.segmentValue('dayPeriod')).toBe(0);
    expect(engine.segmentValueText('dayPeriod')).toBe('AM');
  });

  it('shifts the internal hour when the dayPeriod is toggled', () => {
    const { engine } = setup({ granularity: 'minute', hourCycle: 12, value: timeAt(9, 0, 0) });
    engine.setDayPeriod('pm');
    expect(engine.segmentValue('dayPeriod')).toBe(1);
    expect(engine.segmentValue('hour')).toBe(9);
  });

  it('stores a chosen period without inventing an hour', () => {
    const { engine, value } = setup({ granularity: 'minute', hourCycle: 12 });
    engine.setDayPeriod('pm');
    expect(engine.segmentValue('dayPeriod')).toBe(1);
    expect(engine.isSegmentEmpty('hour')).toBe(true);
    expect(value()).toBeNull();
  });

  it('resolves a later typed hour against a period chosen while empty', () => {
    const { engine, value } = setup({ granularity: 'minute', hourCycle: 12 });
    engine.setDayPeriod('pm');
    type(engine, 'hour', '8');
    type(engine, 'minute', '30');
    const committed = value();
    expect(committed).not.toBeNull();
    expect(adapter.getHours(committed as Date)).toBe(20);
  });
});

describe('TimeFieldEngine seed (current)', () => {
  it('seeds an empty hour from its minimum and minute / second from zero', () => {
    const { engine } = setup({ granularity: 'second', hourCycle: 12 });
    engine.step('hour', 1);
    expect(engine.segmentValue('hour')).toBe(1);
    engine.step('minute', 1);
    expect(engine.segmentValue('minute')).toBe(0);
    engine.step('second', 1);
    expect(engine.segmentValue('second')).toBe(0);
  });

  it('seeds an empty hour from zero in a 24-hour cycle', () => {
    const { engine } = setup({ granularity: 'hour', hourCycle: 24 });
    engine.step('hour', 1);
    expect(engine.segmentValue('hour')).toBe(0);
  });
});

describe('TimeFieldEngine granularity completeness gating (current)', () => {
  it('composes at hour granularity from the hour alone', () => {
    const { engine, value } = setup({ granularity: 'hour', hourCycle: 24 });
    type(engine, 'hour', '09');
    const committed = value();
    expect(committed).not.toBeNull();
    expect(adapter.getHours(committed as Date)).toBe(9);
  });

  it('stays incomplete at second granularity until the second is filled', () => {
    const { engine, value } = setup({ granularity: 'second', hourCycle: 24 });
    type(engine, 'hour', '09');
    type(engine, 'minute', '30');
    expect(value()).toBeNull();
    type(engine, 'second', '15');
    const committed = value();
    expect(committed).not.toBeNull();
    expect(adapter.getSeconds(committed as Date)).toBe(15);
  });
});

describe('TimeFieldEngine null transitions (current)', () => {
  it('preserves the remaining segments on an internal clear', () => {
    const { engine, value } = setup({ granularity: 'second', value: timeAt(9, 30, 45) });
    engine.clear('hour');
    expect(value()).toBeNull();
    expect(engine.segmentValue('minute')).toBe(30);
    expect(engine.segmentValue('second')).toBe(45);
    expect(engine.segmentValue('hour')).toBeNull();
  });

  it('clears every segment on an external null reset of a complete value', () => {
    const { engine, value } = setup({ granularity: 'second', value: timeAt(9, 30, 45) });
    expect(engine.segmentValue('hour')).toBe(9);
    value.set(null);
    expect(engine.segmentValue('hour')).toBeNull();
    expect(engine.segmentValue('minute')).toBeNull();
    expect(engine.segmentValue('second')).toBeNull();
  });
});

describe('TimeFieldEngine signal reactivity', () => {
  it('recomputes the segment list on an hour-cycle change', () => {
    const { engine, hourCycle } = setup({ granularity: 'minute', hourCycle: 12 });
    expect(editableTypes(engine)).toContain('dayPeriod');
    hourCycle.set(24);
    expect(editableTypes(engine)).not.toContain('dayPeriod');
  });
});
