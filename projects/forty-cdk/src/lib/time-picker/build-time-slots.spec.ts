import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { NativeDateAdapter } from '../calendar/native-date-adapter';
import { buildTimeSlots, type BuildTimeSlotsConfig } from './build-time-slots';

describe('buildTimeSlots', () => {
  let adapter: NativeDateAdapter;
  const anchor = new Date(2026, 5, 15);

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    adapter = new NativeDateAdapter();
  });

  function cfg(overrides: Partial<BuildTimeSlotsConfig<Date>> = {}): BuildTimeSlotsConfig<Date> {
    return {
      adapter,
      anchor,
      selected: null,
      minTime: null,
      maxTime: null,
      step: 30,
      granularity: 'minute',
      formatOptions: { hour: '2-digit', minute: '2-digit', hour12: false },
      ...overrides,
    };
  }

  it('generates 48 slots for step=30', () => {
    const slots = buildTimeSlots(cfg({ step: 30 }));
    expect(slots.length).toBe(48);
  });

  it('generates 24 slots for step=60', () => {
    const slots = buildTimeSlots(cfg({ step: 60 }));
    expect(slots.length).toBe(24);
  });

  it('generates 96 slots for step=15', () => {
    const slots = buildTimeSlots(cfg({ step: 15 }));
    expect(slots.length).toBe(96);
  });

  it('first slot is 00:00 on the anchor date', () => {
    const slots = buildTimeSlots(cfg());
    const first = slots[0]!;
    expect(adapter.getHours(first.value)).toBe(0);
    expect(adapter.getMinutes(first.value)).toBe(0);
    expect(adapter.getSeconds(first.value)).toBe(0);
    expect(adapter.getYear(first.value)).toBe(2026);
    expect(adapter.getMonth(first.value)).toBe(6);
    expect(adapter.getDate(first.value)).toBe(15);
  });

  it('slot value preserves the anchor date', () => {
    const slots = buildTimeSlots(cfg({ step: 60 }));
    for (const slot of slots) {
      expect(adapter.getYear(slot.value)).toBe(2026);
      expect(adapter.getMonth(slot.value)).toBe(6);
      expect(adapter.getDate(slot.value)).toBe(15);
    }
  });

  it('slot ids are stable strings based on total seconds', () => {
    const slots = buildTimeSlots(cfg({ step: 30 }));
    expect(slots[0]!.id).toBe('slot-0');
    expect(slots[1]!.id).toBe('slot-1800');
    expect(slots[2]!.id).toBe('slot-3600');
  });

  it('selected is true for matching slot at minute granularity', () => {
    const selected = new Date(2026, 5, 15, 9, 0, 0);
    const slots = buildTimeSlots(cfg({ selected, granularity: 'minute' }));
    const nineOClock = slots.find(
      (s) => adapter.getHours(s.value) === 9 && adapter.getMinutes(s.value) === 0,
    );
    expect(nineOClock?.selected).toBe(true);
    const eightThirty = slots.find(
      (s) => adapter.getHours(s.value) === 8 && adapter.getMinutes(s.value) === 30,
    );
    expect(eightThirty?.selected).toBe(false);
  });

  it('selected is false for all slots when selected is null', () => {
    const slots = buildTimeSlots(cfg({ selected: null }));
    expect(slots.every((s) => !s.selected)).toBe(true);
  });

  it('marks slots disabled when outside [minTime, maxTime]', () => {
    const minTime = new Date(2026, 5, 15, 9, 0, 0);
    const maxTime = new Date(2026, 5, 15, 17, 0, 0);
    const slots = buildTimeSlots(cfg({ minTime, maxTime }));
    const midnight = slots[0]!;
    expect(midnight.disabled).toBe(true);
    const nineAm = slots.find(
      (s) => adapter.getHours(s.value) === 9 && adapter.getMinutes(s.value) === 0,
    );
    expect(nineAm?.disabled).toBe(false);
    const noon = slots.find(
      (s) => adapter.getHours(s.value) === 12 && adapter.getMinutes(s.value) === 0,
    );
    expect(noon?.disabled).toBe(false);
    const elevenPm = slots.find(
      (s) => adapter.getHours(s.value) === 23 && adapter.getMinutes(s.value) === 0,
    );
    expect(elevenPm?.disabled).toBe(true);
  });

  it('no slots disabled when minTime and maxTime are null', () => {
    const slots = buildTimeSlots(cfg());
    expect(slots.every((s) => !s.disabled)).toBe(true);
  });

  it('step <= 0 is clamped to 1 minute (yields 1440 slots)', () => {
    const slots = buildTimeSlots(cfg({ step: 0 }));
    expect(slots.length).toBe(1440);
  });

  it('granularity hour: two slots at same hour compare as selected', () => {
    const selected = new Date(2026, 5, 15, 9, 0, 0);
    const slots = buildTimeSlots(cfg({ selected, granularity: 'hour', step: 60 }));
    const nineAm = slots.find((s) => adapter.getHours(s.value) === 9);
    expect(nineAm?.selected).toBe(true);
  });
});
