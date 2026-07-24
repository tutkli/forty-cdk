import { computed, linkedSignal, type Signal, signal, type WritableSignal } from '@angular/core';

import { type DateRange } from '../date-range/date-range';
import type { WritingDirection } from '../keyboard-navigation/keyboard-navigation';
import { RovingTabindex } from '../roving-tabindex/roving-tabindex';
import { type SegmentEditorDelegate } from './segment-editor';
import { type SegmentEditorContext } from './segment-directive';

/** Which endpoint of a range field — the composer keys its two sources on this. */
export type RangeFieldEndpoint = 'start' | 'end';

/**
 * The date / time field engine surface the composer provides as an endpoint's
 * {@link SegmentEditorContext} delegate: the per-segment accessors and behavior
 * methods. Both `DateFieldEngine` and `TimeFieldEngine` satisfy it structurally,
 * so one composer coordinates either flavour of endpoint. Alias of
 * {@link SegmentEditorDelegate}.
 */
export type RangeFieldEndpointEngine = SegmentEditorDelegate;

/** The committed range paired with the generation of its last internal write. */
interface CommittedRange<D> {
  range: DateRange<D> | null;
  generation: number;
}

/**
 * The reactive configuration a range field root supplies to its
 * {@link RangeFieldComposer}. The shared `value` model plus the field-level
 * `effectiveDisabled` / `readonly` / `dir` signals wire the endpoint contexts;
 * the `composedStart` / `composedEnd` thunks read each engine's composed value
 * (lazy, so the engines can be built *after* the composer); and the `compose` /
 * `disordered` / `normalizeEndpointSource` policies are the only behaviour that
 * differs between a date range and a time range.
 *
 * @typeParam D The adapter's immutable date (or date-time) type.
 */
export interface RangeFieldComposerConfig<D> {
  /** The field's committed range model — the composer's sole write target. */
  readonly value: WritableSignal<DateRange<D> | null>;
  /** The field's effective disabled (own input OR a surrounding disabled `[forFieldset]`). */
  readonly effectiveDisabled: Signal<boolean>;
  /** Whether the field is read-only. */
  readonly readonly: Signal<boolean>;
  /** Resolved writing direction, mirrored onto each endpoint context. */
  readonly dir: Signal<WritingDirection>;
  /** Reads the start endpoint's composed value (or `null` while incomplete). */
  readonly composedStart: () => D | null;
  /** Reads the end endpoint's composed value (or `null` while incomplete). */
  readonly composedEnd: () => D | null;
  /**
   * Builds the committed range from two complete, non-null endpoints, or returns
   * `null` when they cannot form a valid range. A date range commits `{ start,
   * end }` only when ordered; a time range additionally maps a `start > end`
   * entry to a midnight-crossing range under `allowOvernight`.
   */
  readonly compose: (start: D, end: D) => DateRange<D> | null;
  /**
   * Whether two complete, non-null endpoints are an unorderable, error range
   * (reflected as `aria-invalid`). Distinct from {@link compose} because a time
   * range in overnight mode composes a `start > end` entry into a valid range
   * yet is never flagged.
   */
  readonly disordered: (start: D, end: D) => boolean;
  /**
   * Normalizes an endpoint pulled from a committed range before it seeds the
   * engine's source. Omitted (identity) for a date range; a time range in
   * overnight mode re-anchors each endpoint on the DST-stable sentinel so the
   * engine composes purely on time-of-day.
   */
  readonly normalizeEndpointSource?: (value: D) => D;
}

/**
 * The shared range-composition core backing `ForDateRangeField` and
 * `ForTimeRangeField`. It owns everything the two roots duplicated line for
 * line: the per-endpoint roving trackers, the generation-tagged committed value,
 * the two rehydration sources (with the internal-vs-external `null`
 * disambiguation), the `disordered` signal, the `recompose` commit, and the
 * per-endpoint {@link SegmentEditorContext} construction. The field-specific
 * ordering / overnight / sentinel policies enter through
 * {@link RangeFieldComposerConfig}.
 *
 * Constructed directly (`new RangeFieldComposer(config)`); it holds no injection
 * context, mirroring how `DateFieldEngine` / `TimeFieldEngine` and
 * `SegmentEditor` are lifted out of their roots. The `composedStart` /
 * `composedEnd` config thunks are read lazily, so a root can build its engines
 * from {@link startSource} / {@link endSource} *after* constructing the composer.
 *
 * @typeParam D The adapter's immutable date (or date-time) type.
 */
export class RangeFieldComposer<D> {
  readonly #config: RangeFieldComposerConfig<D>;

  /** Shared roving-tabindex tracker for the start endpoint's segments. */
  readonly startRoving = new RovingTabindex();
  /** Shared roving-tabindex tracker for the end endpoint's segments. */
  readonly endRoving = new RovingTabindex();

  /**
   * Monotonic generation bumped by {@link recompose} on every value it writes.
   * It tags each *internal* commit so an endpoint source can tell a `null` the
   * field itself produced (one endpoint mid-edit or the two out of order) from a
   * `null` an external reset wrote — the two are indistinguishable by the
   * `value` alone, since `null === null`.
   */
  readonly #commitGeneration = signal(0);

  readonly #committedValue = computed<CommittedRange<D>>(() => ({
    range: this.#config.value(),
    generation: this.#commitGeneration(),
  }));

  /**
   * The start endpoint's rehydration source. A `linkedSignal` keyed on the
   * committed range tagged with the commit generation: a non-null `value`
   * (external write or our own commit) drives the endpoint from `range.start`; a
   * `null` `value` is disambiguated by the generation — an **internal** null
   * (the generation advanced since the last computation, because *either*
   * endpoint is mid-edit or the two are out of order) **preserves** the prior
   * endpoint value so a complete endpoint isn't wiped while its sibling is
   * incomplete; an **external** null (a Signal Forms reset or a consumer
   * `[(value)]="null"`, where the generation is unchanged) **clears** the
   * endpoint. Each endpoint reads its own `previous`, so there is no
   * cross-endpoint race.
   */
  readonly startSource = linkedSignal<CommittedRange<D>, D | null>({
    source: this.#committedValue,
    computation: (committed, previous) => this.#rehydrate(committed, previous, 'start'),
  });
  /** The end endpoint's rehydration source; mirror of {@link startSource} for `range.end`. */
  readonly endSource = linkedSignal<CommittedRange<D>, D | null>({
    source: this.#committedValue,
    computation: (committed, previous) => this.#rehydrate(committed, previous, 'end'),
  });

  /**
   * Both endpoints complete but they cannot form a valid range — reflected as
   * `aria-invalid` by the root. `false` whenever either endpoint is still
   * incomplete, then delegated to the config's {@link RangeFieldComposerConfig.disordered}
   * policy.
   */
  readonly disordered = computed(() => {
    const start = this.#config.composedStart();
    const end = this.#config.composedEnd();
    if (start === null || end === null) {
      return false;
    }
    return this.#config.disordered(start, end);
  });

  constructor(config: RangeFieldComposerConfig<D>) {
    this.#config = config;
  }

  /**
   * Re-assembles the committed range from both endpoints' composed values and
   * writes it to `value`. Emits the config's composed range when both endpoints
   * are complete, otherwise clears to `null` while preserving each endpoint's
   * typed segments (their parts survive an internal `null` value). Every write
   * bumps the commit generation so the endpoint sources mark the resulting
   * `null` as internal.
   */
  recompose(): void {
    const start = this.#config.composedStart();
    const end = this.#config.composedEnd();
    this.#commitGeneration.update((generation) => generation + 1);
    if (start === null || end === null) {
      this.#config.value.set(null);
      return;
    }
    this.#config.value.set(this.#config.compose(start, end));
  }

  /**
   * Builds the {@link SegmentEditorContext} an endpoint group provides to its
   * segment / literal children: the field-level `effectiveDisabled` / `readonly`
   * / `dir` plus that endpoint's roving tracker, with `engine` as the
   * per-segment accessor / behavior delegate.
   *
   * @param engine The endpoint's date / time field engine.
   * @param which Which endpoint, selecting its roving tracker.
   */
  makeEndpointContext(
    engine: RangeFieldEndpointEngine,
    which: RangeFieldEndpoint,
  ): SegmentEditorContext {
    return {
      effectiveDisabled: this.#config.effectiveDisabled,
      readonly: this.#config.readonly,
      dir: this.#config.dir,
      roving: which === 'start' ? this.startRoving : this.endRoving,
      delegate: engine,
    };
  }

  #rehydrate(
    committed: CommittedRange<D>,
    previous: { source: CommittedRange<D>; value: D | null } | undefined,
    which: RangeFieldEndpoint,
  ): D | null {
    if (committed.range !== null) {
      const endpoint = committed.range[which];
      return this.#config.normalizeEndpointSource
        ? this.#config.normalizeEndpointSource(endpoint)
        : endpoint;
    }
    if (previous && committed.generation !== previous.source.generation) {
      return previous.value;
    }
    return null;
  }
}
