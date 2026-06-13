import { signal, type Signal, type WritableSignal } from '@angular/core';

import { RovingTabindex } from '../roving-tabindex/roving-tabindex';
import {
  type FieldSpec,
  SegmentEditor,
  type SegmentEditorHost,
  type SegmentHandle,
  type SegmentParts,
  type SegmentType,
} from './segment-editor';

interface Parts extends SegmentParts {
  day?: number | null;
  month?: number | null;
  year?: number | null;
  hour?: number | null;
  minute?: number | null;
  second?: number | null;
}

const DATE_TIME_SPECS: readonly FieldSpec[] = [
  { kind: 'editable', type: 'month', digits: 2 },
  { kind: 'literal', literal: '/' },
  { kind: 'editable', type: 'day', digits: 2 },
  { kind: 'literal', literal: '/' },
  { kind: 'editable', type: 'year', digits: 4 },
  { kind: 'literal', literal: ' ' },
  { kind: 'editable', type: 'hour', digits: 2 },
  { kind: 'literal', literal: ':' },
  { kind: 'editable', type: 'minute', digits: 2 },
  { kind: 'literal', literal: ':' },
  { kind: 'editable', type: 'second', digits: 2 },
  { kind: 'literal', literal: ' ' },
  { kind: 'editable', type: 'dayPeriod', digits: 0 },
];

const EDITABLE_ORDER: readonly SegmentType[] = [
  'month',
  'day',
  'year',
  'hour',
  'minute',
  'second',
  'dayPeriod',
];

const BOUNDS: Record<string, { min: number; max: number; seed: number }> = {
  day: { min: 1, max: 31, seed: 1 },
  month: { min: 1, max: 12, seed: 1 },
  year: { min: 1, max: 9999, seed: 2026 },
  hour: { min: 1, max: 12, seed: 12 },
  minute: { min: 0, max: 59, seed: 0 },
  second: { min: 0, max: 59, seed: 0 },
};

class MockHost implements SegmentEditorHost<Parts> {
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly roving = new RovingTabindex();
  readonly cycle: WritableSignal<12 | 24> = signal<12 | 24>(12);
  readonly specs = signal<readonly FieldSpec[]>(DATE_TIME_SPECS);
  readonly editableOrder = signal<readonly SegmentType[]>(EDITABLE_ORDER);
  readonly periodNames = signal({ am: 'AM', pm: 'PM' });
  readonly #parts = signal<Parts>({});
  readonly committed: Parts[] = [];

  parts(): Parts {
    return this.#parts();
  }

  setParts(next: Parts): void {
    this.#parts.set(next);
  }

  segmentMin(type: SegmentType): number {
    return type === 'hour' && this.cycle() === 24 ? 0 : (BOUNDS[type]?.min ?? 0);
  }

  segmentMax(type: SegmentType): number {
    return type === 'hour' && this.cycle() === 24 ? 23 : (BOUNDS[type]?.max ?? 0);
  }

  seed(type: SegmentType): number {
    return BOUNDS[type]?.seed ?? 0;
  }

  placeholderFor(type: SegmentType): string {
    return type === 'year' ? 'yyyy' : type;
  }

  valueText(): string | null {
    return null;
  }

  commit(next: Parts): void {
    this.committed.push(next);
    this.#parts.set(next);
  }
}

function makeHandle(type: SegmentType): SegmentHandle & { host: HTMLElement; type: Signal<SegmentType> } {
  const host = document.createElement('div');
  host.setAttribute('data-segment', type);
  return { host, type: signal(type) };
}

function setup(): { host: MockHost; editor: SegmentEditor<Parts>; handles: Map<SegmentType, HTMLElement> } {
  const host = new MockHost();
  const editor = new SegmentEditor<Parts>(host);
  const handles = new Map<SegmentType, HTMLElement>();
  for (const type of EDITABLE_ORDER) {
    const handle = makeHandle(type);
    editor.registerSegment(handle);
    handles.set(type, handle.host);
  }
  return { host, editor, handles };
}

describe('SegmentEditor.typeDigit', () => {
  it('accumulates digits within the segment and commits the running value', () => {
    const { host, editor } = setup();
    editor.typeDigit('year', 2);
    expect(host.parts().year).toBe(2);
    editor.typeDigit('year', 0);
    expect(host.parts().year).toBe(20);
    editor.typeDigit('year', 2);
    expect(host.parts().year).toBe(202);
    editor.typeDigit('year', 6);
    expect(host.parts().year).toBe(2026);
  });

  it('resets the buffer when the next digit would exceed the max', () => {
    const { host, editor } = setup();
    editor.typeDigit('month', 5);
    expect(host.parts().month).toBe(5);
    editor.typeDigit('month', 9);
    expect(host.parts().month).toBe(9);
  });

  it('resets the buffer when it grows past the spec digit count', () => {
    const { host, editor } = setup();
    editor.typeDigit('day', 1);
    editor.typeDigit('day', 2);
    expect(host.parts().day).toBe(12);
    editor.typeDigit('day', 3);
    expect(host.parts().day).toBe(3);
  });

  it('auto-advances to the next segment once the value cannot grow further', () => {
    const { host, editor, handles } = setup();
    editor.typeDigit('month', 5);
    expect(host.parts().month).toBe(5);
    expect(host.roving.active()).toBe(handles.get('day'));
  });

  it('does not auto-advance while more digits could still be typed', () => {
    const { host, editor } = setup();
    editor.typeDigit('day', 1);
    expect(host.parts().day).toBe(1);
    expect(host.roving.active()).toBe(null);
  });

  it('does nothing on the dayPeriod segment', () => {
    const { host, editor } = setup();
    editor.typeDigit('dayPeriod', 1);
    expect(host.committed).toEqual([]);
  });

  it('does nothing while disabled', () => {
    const { host, editor } = setup();
    host.disabled.set(true);
    editor.typeDigit('day', 5);
    expect(host.committed).toEqual([]);
  });

  it('does nothing while readonly', () => {
    const { host, editor } = setup();
    host.readonly.set(true);
    editor.typeDigit('day', 5);
    expect(host.committed).toEqual([]);
  });
});

describe('SegmentEditor.step', () => {
  it('seeds an empty segment on first step', () => {
    const { host, editor } = setup();
    editor.step('minute', 1);
    expect(host.parts().minute).toBe(0);
  });

  it('wraps minute past 59 back to 0', () => {
    const { host, editor } = setup();
    host.setParts({ minute: 59 });
    editor.step('minute', 1);
    expect(host.parts().minute).toBe(0);
  });

  it('wraps minute below 0 to 59', () => {
    const { host, editor } = setup();
    host.setParts({ minute: 0 });
    editor.step('minute', -1);
    expect(host.parts().minute).toBe(59);
  });

  it('clamps year at its max instead of wrapping', () => {
    const { host, editor } = setup();
    host.setParts({ year: 9999 });
    editor.step('year', 1);
    expect(host.parts().year).toBe(9999);
  });

  it('clamps year at its min instead of wrapping', () => {
    const { host, editor } = setup();
    host.setParts({ year: 1 });
    editor.step('year', -1);
    expect(host.parts().year).toBe(1);
  });

  it('wraps month from 12 back to 1', () => {
    const { host, editor } = setup();
    host.setParts({ month: 12 });
    editor.step('month', 1);
    expect(host.parts().month).toBe(1);
  });

  it('steps the hour in 12-hour mode keeping the AM/PM period', () => {
    const { host, editor } = setup();
    host.setParts({ hour: 23 });
    editor.step('hour', 1);
    expect(host.parts().hour).toBe(12);
  });

  it('steps the hour in 24-hour mode wrapping 23 to 0', () => {
    const { host, editor } = setup();
    host.cycle.set(24);
    host.setParts({ hour: 23 });
    editor.step('hour', 1);
    expect(host.parts().hour).toBe(0);
  });

  it('routes a dayPeriod step to setDayPeriod', () => {
    const { host, editor } = setup();
    host.setParts({ hour: 9 });
    editor.step('dayPeriod', 1);
    expect(host.parts().hour).toBe(21);
    editor.step('dayPeriod', -1);
    expect(host.parts().hour).toBe(9);
  });

  it('does nothing while disabled', () => {
    const { host, editor } = setup();
    host.disabled.set(true);
    editor.step('minute', 1);
    expect(host.committed).toEqual([]);
  });
});

describe('SegmentEditor.goToBound', () => {
  it('sets a numeric segment to its min', () => {
    const { host, editor } = setup();
    editor.goToBound('day', 'min');
    expect(host.parts().day).toBe(1);
  });

  it('sets a numeric segment to its max', () => {
    const { host, editor } = setup();
    editor.goToBound('day', 'max');
    expect(host.parts().day).toBe(31);
  });

  it('maps the hour bound through the 12-hour internal conversion', () => {
    const { host, editor } = setup();
    host.setParts({ hour: 15 });
    editor.goToBound('hour', 'min');
    expect(host.parts().hour).toBe(13);
  });

  it('sends dayPeriod min to AM and max to PM', () => {
    const { host, editor } = setup();
    host.setParts({ hour: 9 });
    editor.goToBound('dayPeriod', 'max');
    expect(host.parts().hour).toBe(21);
    editor.goToBound('dayPeriod', 'min');
    expect(host.parts().hour).toBe(9);
  });

  it('does nothing while readonly', () => {
    const { host, editor } = setup();
    host.readonly.set(true);
    editor.goToBound('day', 'max');
    expect(host.committed).toEqual([]);
  });
});

describe('SegmentEditor.setDayPeriod', () => {
  it('defaults an empty hour to noon for PM and midnight for AM', () => {
    const { host, editor } = setup();
    editor.setDayPeriod('pm');
    expect(host.parts().hour).toBe(12);

    host.setParts({});
    editor.setDayPeriod('am');
    expect(host.parts().hour).toBe(0);
  });

  it('shifts a morning hour into the afternoon and back', () => {
    const { host, editor } = setup();
    host.setParts({ hour: 9 });
    editor.setDayPeriod('pm');
    expect(host.parts().hour).toBe(21);
    editor.setDayPeriod('am');
    expect(host.parts().hour).toBe(9);
  });

  it('is idempotent when already in the requested period', () => {
    const { host, editor } = setup();
    host.setParts({ hour: 21 });
    editor.setDayPeriod('pm');
    expect(host.parts().hour).toBe(21);
  });
});

describe('SegmentEditor.clear', () => {
  it('clears a numeric segment to null', () => {
    const { host, editor } = setup();
    host.setParts({ day: 15 });
    editor.clear('day');
    expect(host.parts().day).toBe(null);
  });

  it('does not clear the dayPeriod segment', () => {
    const { host, editor } = setup();
    host.setParts({ hour: 9 });
    editor.clear('dayPeriod');
    expect(host.committed).toEqual([]);
  });
});

describe('SegmentEditor.focusSibling', () => {
  it('moves the active element forward to the next editable segment', () => {
    const { host, editor, handles } = setup();
    editor.focusSibling('month', 1);
    expect(host.roving.active()).toBe(handles.get('day'));
  });

  it('moves the active element backward to the previous editable segment', () => {
    const { host, editor, handles } = setup();
    editor.focusSibling('day', -1);
    expect(host.roving.active()).toBe(handles.get('month'));
  });

  it('does nothing past the first segment', () => {
    const { host, editor } = setup();
    editor.focusSibling('month', -1);
    expect(host.roving.active()).toBe(null);
  });

  it('does nothing past the last segment', () => {
    const { host, editor } = setup();
    editor.focusSibling('dayPeriod', 1);
    expect(host.roving.active()).toBe(null);
  });
});

describe('SegmentEditor reactive accessors', () => {
  it('reports a segment empty until it is filled', () => {
    const { host, editor } = setup();
    expect(editor.isSegmentEmpty('day')).toBe(true);
    host.setParts({ day: 5 });
    expect(editor.isSegmentEmpty('day')).toBe(false);
  });

  it('identifies the first editable segment in locale order', () => {
    const { editor } = setup();
    expect(editor.isFirstSegmentType('month')).toBe(true);
    expect(editor.isFirstSegmentType('day')).toBe(false);
  });

  it('converts the stored 24h hour to its 12-hour display value', () => {
    const { host, editor } = setup();
    host.setParts({ hour: 13 });
    expect(editor.segmentValue('hour')).toBe(1);
    host.cycle.set(24);
    expect(editor.segmentValue('hour')).toBe(13);
  });

  it('reports dayPeriod value as 1 for PM and 0 for AM', () => {
    const { host, editor } = setup();
    host.setParts({ hour: 13 });
    expect(editor.segmentValue('dayPeriod')).toBe(1);
    host.setParts({ hour: 9 });
    expect(editor.segmentValue('dayPeriod')).toBe(0);
  });

  it('builds the rendered segment list with literals and pads filled values', () => {
    const { host, editor } = setup();
    host.setParts({ month: 6, day: 13, year: 2026 });
    const segments = editor.segments();
    const month = segments.find((segment) => segment.type === 'month');
    const year = segments.find((segment) => segment.type === 'year');
    const literals = segments.filter((segment) => segment.isLiteral);
    expect(month?.text).toBe('06');
    expect(year?.text).toBe('2026');
    expect(literals.length).toBeGreaterThan(0);
  });

  it('reacts to a cycle change without Zone.js', () => {
    const { host, editor } = setup();
    host.setParts({ hour: 13 });
    expect(editor.segmentValue('hour')).toBe(1);
    host.cycle.set(24);
    expect(editor.segmentValue('hour')).toBe(13);
  });
});
