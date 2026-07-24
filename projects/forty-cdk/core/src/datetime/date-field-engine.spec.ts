import { signal, type WritableSignal } from '@angular/core';
import { NativeDateAdapter } from 'forty-cdk/calendar';

import { RovingTabindex } from '../roving-tabindex/roving-tabindex';
import { type FieldGranularity } from './date-segments';
import { DateFieldEngine } from './date-field-engine';
import { type SegmentType } from './segment-editor';

const adapter = new NativeDateAdapter();

interface Options {
  locale?: string | null;
  granularity?: FieldGranularity;
  hourCycle?: 12 | 24 | null;
  value?: Date | null;
  minDate?: Date | null;
  maxDate?: Date | null;
  emptySegmentText?: string;
}

interface Harness {
  engine: DateFieldEngine<Date>;
  value: WritableSignal<Date | null>;
  disabled: WritableSignal<boolean>;
  readonly: WritableSignal<boolean>;
  granularity: WritableSignal<FieldGranularity>;
  hourCycle: WritableSignal<12 | 24 | null>;
  locale: WritableSignal<string | null>;
  minDate: WritableSignal<Date | null>;
  maxDate: WritableSignal<Date | null>;
  emptySegmentText: WritableSignal<string>;
}

function setup(options: Options = {}): Harness {
  const value = signal<Date | null>(options.value ?? null);
  const disabled = signal(false);
  const readonly = signal(false);
  const granularity = signal<FieldGranularity>(options.granularity ?? 'day');
  const hourCycle = signal<12 | 24 | null>(options.hourCycle ?? null);
  const locale = signal<string | null>(options.locale ?? 'en-US');
  const minDate = signal<Date | null>(options.minDate ?? null);
  const maxDate = signal<Date | null>(options.maxDate ?? null);
  const placeholder = signal<Partial<Record<SegmentType, string>>>({});
  const emptySegmentText = signal(options.emptySegmentText ?? 'Empty');
  const engine = new DateFieldEngine<Date>({
    adapter,
    disabled,
    readonly,
    roving: new RovingTabindex(),
    granularity,
    hourCycle,
    locale,
    placeholder,
    emptySegmentText,
    minDate,
    maxDate,
    source: value,
    onCommit: (v) => value.set(v),
    piece: 'ForDateField',
  });
  return {
    engine,
    value,
    disabled,
    readonly,
    granularity,
    hourCycle,
    locale,
    minDate,
    maxDate,
    emptySegmentText,
  };
}

function editableTypes(engine: DateFieldEngine<Date>): SegmentType[] {
  return engine.segments().flatMap((segment) => (segment.type ? [segment.type] : []));
}

function type(engine: DateFieldEngine<Date>, segment: SegmentType, digits: string): void {
  for (const digit of digits) {
    engine.typeDigit(segment, Number(digit));
  }
}

describe('DateFieldEngine locale segment order (current)', () => {
  it('orders month / day / year for en-US', () => {
    const { engine } = setup({ locale: 'en-US' });
    expect(editableTypes(engine)).toEqual(['month', 'day', 'year']);
  });

  it('orders day / month / year for de-DE', () => {
    const { engine } = setup({ locale: 'de-DE' });
    expect(editableTypes(engine)).toEqual(['day', 'month', 'year']);
  });

  it('orders year / month / day for ja-JP', () => {
    const { engine } = setup({ locale: 'ja-JP' });
    expect(editableTypes(engine)).toEqual(['year', 'month', 'day']);
  });
});

describe('DateFieldEngine typeDigit accumulation and compose (current)', () => {
  it('accumulates digits within a segment', () => {
    const { engine } = setup();
    engine.typeDigit('year', 2);
    expect(engine.segmentValue('year')).toBe(2);
    engine.typeDigit('year', 0);
    expect(engine.segmentValue('year')).toBe(20);
    engine.typeDigit('year', 2);
    expect(engine.segmentValue('year')).toBe(202);
    engine.typeDigit('year', 6);
    expect(engine.segmentValue('year')).toBe(2026);
  });

  it('keeps partially typed segments while the value stays incomplete', () => {
    const { engine, value } = setup();
    type(engine, 'month', '6');
    expect(engine.segmentValue('month')).toBe(6);
    expect(value()).toBeNull();
  });

  it('composes and commits the value once every segment is filled', () => {
    const { engine, value } = setup();
    type(engine, 'month', '6');
    type(engine, 'day', '15');
    type(engine, 'year', '2026');
    const committed = value();
    expect(committed).not.toBeNull();
    expect(adapter.getYear(committed as Date)).toBe(2026);
    expect(adapter.getMonth(committed as Date)).toBe(6);
    expect(adapter.getDate(committed as Date)).toBe(15);
  });
});

describe('DateFieldEngine transient vs settled (commit-on-settle contract)', () => {
  it('does not emit a mid-typing (transient) keystroke through onCommit', () => {
    const { engine, value } = setup({ value: adapter.createDate(2026, 3, 15) });
    const before = value();
    engine.typeDigit('year', 2);
    expect(value()).toBe(before);
  });

  it('always clamps composed() to the bounds, even mid-typing', () => {
    const { engine } = setup({ minDate: adapter.createDate(2020, 6, 15) });
    type(engine, 'month', '01');
    type(engine, 'day', '01');
    engine.typeDigit('year', 2);
    const composed = engine.composed();
    expect(composed).not.toBeNull();
    expect(adapter.getYear(composed as Date)).toBe(2020);
  });

  it('preserves the other typed segments across a transient year keystroke', () => {
    const { engine } = setup();
    type(engine, 'month', '6');
    type(engine, 'day', '15');
    engine.typeDigit('year', 2);
    expect(engine.segmentValue('month')).toBe(6);
    expect(engine.segmentValue('day')).toBe(15);
  });

  it('clamps a settled complete composition to the bounds', () => {
    const { engine, value } = setup({ minDate: adapter.createDate(2020, 6, 15) });
    type(engine, 'month', '01');
    type(engine, 'day', '01');
    type(engine, 'year', '0001');
    const committed = value();
    expect(committed).not.toBeNull();
    expect(adapter.getYear(committed as Date)).toBe(2020);
    expect(adapter.getMonth(committed as Date)).toBe(6);
    expect(adapter.getDate(committed as Date)).toBe(15);
  });
});

describe('DateFieldEngine dayPeriod derivation (current)', () => {
  it('rehydrates the stored dayPeriod from a loaded value', () => {
    const { engine } = setup({
      granularity: 'minute',
      hourCycle: 12,
      value: adapter.setTime(adapter.createDate(2026, 6, 15), 13, 0, 0),
    });
    expect(engine.segmentValue('dayPeriod')).toBe(1);
    expect(engine.segmentValueText('dayPeriod')).toBe('PM');
  });

  it('reads AM from a morning value', () => {
    const { engine } = setup({
      granularity: 'minute',
      hourCycle: 12,
      value: adapter.setTime(adapter.createDate(2026, 6, 15), 9, 0, 0),
    });
    expect(engine.segmentValue('dayPeriod')).toBe(0);
    expect(engine.segmentValueText('dayPeriod')).toBe('AM');
  });

  it('shifts the internal hour when the dayPeriod is toggled', () => {
    const { engine } = setup({
      granularity: 'minute',
      hourCycle: 12,
      value: adapter.setTime(adapter.createDate(2026, 6, 15), 9, 0, 0),
    });
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
    type(engine, 'month', '6');
    type(engine, 'day', '15');
    type(engine, 'year', '2026');
    type(engine, 'hour', '8');
    type(engine, 'minute', '30');
    const committed = value();
    expect(committed).not.toBeNull();
    expect(adapter.getHours(committed as Date)).toBe(20);
  });
});

describe('DateFieldEngine Feb-29 leap resolver (current)', () => {
  it('admits day 29 for February while the year is empty', () => {
    const { engine } = setup();
    type(engine, 'month', '2');
    expect(engine.segmentMax('day')).toBe(29);
    type(engine, 'day', '29');
    expect(engine.segmentValue('day')).toBe(29);
  });

  it('re-clamps the day to 28 once a non-leap year is committed', () => {
    const { engine, value } = setup();
    type(engine, 'month', '2');
    type(engine, 'day', '29');
    type(engine, 'year', '2023');
    expect(engine.segmentValue('day')).toBe(28);
    expect(engine.segmentMax('day')).toBe(28);
    const committed = value();
    expect(committed).not.toBeNull();
    expect(adapter.getYear(committed as Date)).toBe(2023);
    expect(adapter.getMonth(committed as Date)).toBe(2);
    expect(adapter.getDate(committed as Date)).toBe(28);
  });
});

describe('DateFieldEngine day re-clamp on month step (current)', () => {
  it('shrinks day 31 to 28 when stepping into a non-leap February', () => {
    const { engine, value } = setup({ value: adapter.createDate(2023, 1, 31) });
    engine.step('month', 1);
    const committed = value();
    expect(committed).not.toBeNull();
    expect(adapter.getMonth(committed as Date)).toBe(2);
    expect(adapter.getDate(committed as Date)).toBe(28);
  });
});

describe('DateFieldEngine segmentMax("day") probe (current)', () => {
  it('reports 29 for February of a leap year', () => {
    const { engine } = setup({ value: adapter.createDate(2024, 2, 10) });
    expect(engine.segmentMax('day')).toBe(29);
  });

  it('reports 28 for February of a non-leap year', () => {
    const { engine } = setup({ value: adapter.createDate(2023, 2, 10) });
    expect(engine.segmentMax('day')).toBe(28);
  });

  it('reports 30 for a 30-day month', () => {
    const { engine } = setup({ value: adapter.createDate(2024, 4, 10) });
    expect(engine.segmentMax('day')).toBe(30);
  });
});

describe('DateFieldEngine valueText (current)', () => {
  it('reads a filled month as its localized long name', () => {
    const { engine } = setup({ locale: 'en-US' });
    type(engine, 'month', '6');
    expect(engine.segmentValueText('month')).toBe('June');
  });

  it('reads an empty segment as the empty-segment text', () => {
    const { engine } = setup({ emptySegmentText: 'Empty' });
    expect(engine.segmentValueText('day')).toBe('Empty');
  });
});

describe('DateFieldEngine seed from today (current)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 2, 15));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('seeds an empty date segment from today on first step', () => {
    const { engine } = setup();
    engine.step('day', 1);
    expect(engine.segmentValue('day')).toBe(15);
    engine.step('month', 1);
    expect(engine.segmentValue('month')).toBe(3);
    engine.step('year', 1);
    expect(engine.segmentValue('year')).toBe(2024);
  });
});

describe('DateFieldEngine time-segment append (current)', () => {
  it('appends hour / minute and a dayPeriod at minute granularity in a 12-hour locale', () => {
    const { engine } = setup({ locale: 'en-US', granularity: 'minute', hourCycle: 12 });
    const types = editableTypes(engine);
    expect(types).toContain('hour');
    expect(types).toContain('minute');
    expect(types).toContain('dayPeriod');
    expect(types).not.toContain('second');
  });

  it('omits the dayPeriod segment in a 24-hour cycle', () => {
    const { engine } = setup({ locale: 'en-US', granularity: 'minute', hourCycle: 24 });
    const types = editableTypes(engine);
    expect(types).toContain('hour');
    expect(types).toContain('minute');
    expect(types).not.toContain('dayPeriod');
  });
});

describe('DateFieldEngine null transitions (current)', () => {
  it('preserves the remaining segments on an internal clear', () => {
    const { engine, value } = setup({ value: adapter.createDate(2026, 6, 15) });
    engine.clear('day');
    expect(value()).toBeNull();
    expect(engine.segmentValue('month')).toBe(6);
    expect(engine.segmentValue('year')).toBe(2026);
    expect(engine.segmentValue('day')).toBeNull();
  });

  it('clears every segment on an external null reset of a complete value', () => {
    const { engine, value } = setup({ value: adapter.createDate(2026, 6, 15) });
    expect(engine.segmentValue('month')).toBe(6);
    value.set(null);
    expect(engine.segmentValue('month')).toBeNull();
    expect(engine.segmentValue('day')).toBeNull();
    expect(engine.segmentValue('year')).toBeNull();
  });
});

describe('DateFieldEngine signal reactivity (zoneless)', () => {
  it('recomputes the segment list on an hour-cycle change without Zone.js', () => {
    const { engine, hourCycle } = setup({ granularity: 'minute', hourCycle: 12 });
    expect(editableTypes(engine)).toContain('dayPeriod');
    hourCycle.set(24);
    expect(editableTypes(engine)).not.toContain('dayPeriod');
  });
});
