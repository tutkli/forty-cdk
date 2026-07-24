import { signal, type WritableSignal } from '@angular/core';

import { type DateRange } from '../date-range/date-range';
import { type WritingDirection } from '../keyboard-navigation/keyboard-navigation';
import {
  RangeFieldComposer,
  type RangeFieldComposerConfig,
  type RangeFieldEndpointEngine,
} from './range-field-composer';
import { type SegmentType } from './segment-editor';

type Range = DateRange<number>;

interface Harness {
  composer: RangeFieldComposer<number>;
  value: WritableSignal<Range | null>;
  composedStart: WritableSignal<number | null>;
  composedEnd: WritableSignal<number | null>;
  effectiveDisabled: WritableSignal<boolean>;
  readonly: WritableSignal<boolean>;
  dir: WritableSignal<WritingDirection>;
}

function setup(overrides: Partial<RangeFieldComposerConfig<number>> = {}): Harness {
  const value = signal<Range | null>(null);
  const composedStart = signal<number | null>(null);
  const composedEnd = signal<number | null>(null);
  const effectiveDisabled = signal(false);
  const readonly = signal(false);
  const dir = signal<WritingDirection>('ltr');
  const composer = new RangeFieldComposer<number>({
    value,
    effectiveDisabled,
    readonly,
    dir,
    composedStart: () => composedStart(),
    composedEnd: () => composedEnd(),
    compose: (start, end) => (start <= end ? { start, end } : null),
    disordered: (start, end) => start > end,
    ...overrides,
  });
  return { composer, value, composedStart, composedEnd, effectiveDisabled, readonly, dir };
}

/** A stub endpoint engine whose every forwarded method records its call and returns a sentinel. */
function stubEngine(): RangeFieldEndpointEngine & { calls: Array<[string, unknown[]]> } {
  const calls: Array<[string, unknown[]]> = [];
  const record =
    <R>(name: string, result: R) =>
    (...args: unknown[]): R => {
      calls.push([name, args]);
      return result;
    };
  return {
    calls,
    segmentValue: record('segmentValue', 7),
    segmentMin: record('segmentMin', 1),
    segmentMax: record('segmentMax', 12),
    segmentValueText: record('segmentValueText', 'text'),
    segmentDisplayText: record('segmentDisplayText', 'display'),
    isSegmentEmpty: record('isSegmentEmpty', false),
    isFirstSegmentType: record('isFirstSegmentType', true),
    registerSegment: record('registerSegment', undefined),
    unregisterSegment: record('unregisterSegment', undefined),
    focusSegment: record('focusSegment', undefined),
    typeDigit: record('typeDigit', undefined),
    step: record('step', undefined),
    goToBound: record('goToBound', undefined),
    setDayPeriod: record('setDayPeriod', undefined),
    setDayPeriodFromKey: record('setDayPeriodFromKey', false),
    clear: record('clear', undefined),
    backspace: record('backspace', undefined),
    focusSibling: record('focusSibling', undefined),
    endTyping: record('endTyping', undefined),
  };
}

describe('RangeFieldComposer.recompose', () => {
  it('commits the composed range when both endpoints complete and ordered', () => {
    const { composer, value, composedStart, composedEnd } = setup();
    composedStart.set(10);
    composedEnd.set(20);
    composer.recompose();
    expect(value()).toEqual({ start: 10, end: 20 });
  });

  it('clears to null when either endpoint is incomplete', () => {
    const { composer, value, composedStart, composedEnd } = setup();
    value.set({ start: 10, end: 20 });
    composedStart.set(10);
    composedEnd.set(null);
    composer.recompose();
    expect(value()).toBeNull();
  });

  it('clears to null when the compose policy rejects the pair', () => {
    const { composer, value, composedStart, composedEnd } = setup();
    composedStart.set(30);
    composedEnd.set(10);
    composer.recompose();
    expect(value()).toBeNull();
  });

  it('routes both complete endpoints through the compose policy', () => {
    const { composer, value, composedStart, composedEnd } = setup({
      compose: (start, end) => ({ start, end: start > end ? end + 100 : end }),
    });
    composedStart.set(30);
    composedEnd.set(10);
    composer.recompose();
    expect(value()).toEqual({ start: 30, end: 110 });
  });
});

describe('RangeFieldComposer rehydration sources', () => {
  it('drives both endpoints from an external non-null range', () => {
    const { composer, value } = setup();
    value.set({ start: 10, end: 20 });
    expect(composer.startSource()).toBe(10);
    expect(composer.endSource()).toBe(20);
  });

  it('preserves the still-complete endpoint across an internal null commit', () => {
    const { composer, value, composedStart, composedEnd } = setup();
    value.set({ start: 10, end: 20 });
    expect(composer.startSource()).toBe(10);
    expect(composer.endSource()).toBe(20);
    composedStart.set(10);
    composedEnd.set(null);
    composer.recompose();
    expect(value()).toBeNull();
    expect(composer.startSource()).toBe(10);
    expect(composer.endSource()).toBe(20);
  });

  it('clears both endpoints on an external null reset', () => {
    const { composer, value } = setup();
    value.set({ start: 10, end: 20 });
    expect(composer.startSource()).toBe(10);
    value.set(null);
    expect(composer.startSource()).toBeNull();
    expect(composer.endSource()).toBeNull();
  });

  it('normalizes each endpoint through the configured hook', () => {
    const { composer, value } = setup({ normalizeEndpointSource: (v) => v + 1000 });
    value.set({ start: 10, end: 20 });
    expect(composer.startSource()).toBe(1010);
    expect(composer.endSource()).toBe(1020);
  });
});

describe('RangeFieldComposer.disordered', () => {
  it('is false while either endpoint is incomplete', () => {
    const { composer, composedStart } = setup();
    expect(composer.disordered()).toBe(false);
    composedStart.set(30);
    expect(composer.disordered()).toBe(false);
  });

  it('delegates to the policy once both endpoints are complete', () => {
    const { composer, composedStart, composedEnd } = setup();
    composedStart.set(30);
    composedEnd.set(10);
    expect(composer.disordered()).toBe(true);
    composedEnd.set(40);
    expect(composer.disordered()).toBe(false);
  });
});

describe('RangeFieldComposer.makeEndpointContext', () => {
  it('carries the field signals and the endpoint roving tracker', () => {
    const { composer, effectiveDisabled, readonly, dir } = setup();
    const startCtx = composer.makeEndpointContext(stubEngine(), 'start');
    const endCtx = composer.makeEndpointContext(stubEngine(), 'end');
    expect(startCtx.effectiveDisabled).toBe(effectiveDisabled);
    expect(startCtx.readonly).toBe(readonly);
    expect(startCtx.dir).toBe(dir);
    expect(startCtx.roving).toBe(composer.startRoving);
    expect(endCtx.roving).toBe(composer.endRoving);
  });

  it('exposes the given engine as the endpoint segment delegate', () => {
    const { composer } = setup();
    const engine = stubEngine();
    const ctx = composer.makeEndpointContext(engine, 'start');
    const handle = { host: document.createElement('div'), type: signal<SegmentType>('day') };

    expect(ctx.delegate).toBe(engine);

    expect(ctx.delegate.segmentValue('day')).toBe(7);
    expect(ctx.delegate.segmentMax('day')).toBe(12);
    ctx.delegate.registerSegment(handle);
    ctx.delegate.typeDigit('day', 5);
    ctx.delegate.endTyping();

    expect(engine.calls).toEqual([
      ['segmentValue', ['day']],
      ['segmentMax', ['day']],
      ['registerSegment', [handle]],
      ['typeDigit', ['day', 5]],
      ['endTyping', []],
    ]);
  });

  it('routes each endpoint context to its own roving tracker and engine delegate', () => {
    const { composer } = setup();
    const startEngine = stubEngine();
    const endEngine = stubEngine();
    const startCtx = composer.makeEndpointContext(startEngine, 'start');
    const endCtx = composer.makeEndpointContext(endEngine, 'end');

    expect(startCtx.delegate).toBe(startEngine);
    expect(endCtx.delegate).toBe(endEngine);

    startCtx.delegate.typeDigit('day', 1);
    endCtx.delegate.typeDigit('day', 2);

    expect(startEngine.calls).toEqual([['typeDigit', ['day', 1]]]);
    expect(endEngine.calls).toEqual([['typeDigit', ['day', 2]]]);
  });
});
