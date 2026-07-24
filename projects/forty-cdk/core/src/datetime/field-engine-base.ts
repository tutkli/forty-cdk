import { computed, type Signal, type WritableSignal } from '@angular/core';

import type { RovingTabindex } from '../roving-tabindex/roving-tabindex';
import { dayPeriodNames, resolveHourCycle } from './hour-cycle';
import {
  type FieldSegment,
  type FieldSpec,
  SegmentEditor,
  type SegmentHandle,
  type SegmentParts,
  type SegmentType,
} from './segment-editor';

/**
 * The reactive configuration shared by every segmented date / time field engine:
 * the disabled / read-only flags, the roving tracker, the hour-cycle / locale
 * inputs that drive the resolved cycle, the empty-segment text, the
 * authoritative `source` value, and the `onCommit` sink. Each concrete engine's
 * config extends this with its adapter, granularity, placeholder, and bounds.
 *
 * @typeParam D The adapter's immutable date (or date-time) type.
 */
export interface BaseFieldEngineConfig<D> {
  /** Whether editing is disabled (the field's effective disabled). */
  readonly disabled: Signal<boolean>;
  /** Whether editing is read-only. */
  readonly readonly: Signal<boolean>;
  /** Shared roving-tabindex tracker for this field's segments. */
  readonly roving: RovingTabindex;
  /** 12- / 24-hour override, or `null` to derive from the locale. */
  readonly hourCycle: Signal<12 | 24 | null>;
  /** BCP 47 locale driving segment order, separators, and AM/PM names. */
  readonly locale: Signal<string | null>;
  /** Accessible `aria-valuetext` announced for an empty editable segment. */
  readonly emptySegmentText: Signal<string>;
  /** Authoritative current value the entered parts rehydrate from. */
  readonly source: Signal<D | null>;
  /** Sink called with the composed value (or `null` while incomplete) on every edit. */
  readonly onCommit: (value: D | null) => void;
}

/**
 * The shared base backing `DateFieldEngine` and `TimeFieldEngine`. It owns
 * everything the two engines duplicated on top of the generic
 * {@link SegmentEditor}: the resolved hour cycle, the editable-order / period-name
 * derivations, the rendered `segments` / `empty` / `composed` signals, the editor
 * wiring, the segment-behavior forwarding, and the settle-vs-transient commit
 * skeleton. Each concrete engine supplies only what differs between a date field
 * and a time field: the locale-ordered `specs`, the entered `parts`, the
 * per-segment bounds / seed / placeholder / `aria-valuetext`, and how a parts
 * record composes into the value.
 *
 * Constructed by the concrete subclass, which must assign {@link specs} and
 * {@link parts} and then call {@link initEditor} at the end of its constructor:
 * the editor captures `specs` / `parts`, so building it in a base field
 * initializer (which runs before the subclass assigns them) would capture
 * `undefined`.
 *
 * @typeParam D The adapter's immutable date (or date-time) type.
 * @typeParam P The engine's parts shape (a subtype of {@link SegmentParts}).
 * @typeParam T The segment-type union the owning field renders.
 */
export abstract class DateTimeFieldEngineBase<
  D,
  P extends SegmentParts,
  T extends SegmentType = SegmentType,
> {
  protected readonly config: BaseFieldEngineConfig<D>;

  protected readonly cycle = computed(() =>
    resolveHourCycle(this.config.locale() ?? undefined, this.config.hourCycle()),
  );

  /** The ordered, locale-derived spec list (editable + literals). */
  protected abstract readonly specs: Signal<readonly FieldSpec[]>;

  /** The entered parts, rehydrated from `source` and updated on every commit. */
  protected abstract readonly parts: WritableSignal<P>;

  protected readonly editableOrder = computed<readonly SegmentType[]>(() =>
    this.specs()
      .filter((spec): spec is Extract<FieldSpec, { kind: 'editable' }> => spec.kind === 'editable')
      .map((spec) => spec.type),
  );

  protected readonly periodNames = computed(() =>
    dayPeriodNames(this.config.locale() ?? undefined),
  );

  protected editor!: SegmentEditor<P, T>;

  /**
   * The ordered, locale-derived segments (editable + literals) to render. Each
   * entry carries the text to display: the formatted value when filled, the
   * placeholder while empty, or the literal separator.
   */
  readonly segments: Signal<readonly FieldSegment<T>[]> = computed(() => this.editor.segments());

  /** `true` while every editable segment is empty — no digits are entered. */
  readonly empty: Signal<boolean> = computed(() => this.editor.empty());

  /** The composed value of the entered parts, or `null` while any segment is empty. */
  readonly composed = computed<D | null>(() => this.composeFrom(this.parts()));

  constructor(config: BaseFieldEngineConfig<D>) {
    this.config = config;
  }

  /**
   * Builds the shared {@link SegmentEditor} and wires it to this engine's specs,
   * parts, bounds, and commit. The concrete subclass calls this at the very end
   * of its constructor, after it has assigned {@link specs} and {@link parts}.
   */
  protected initEditor(): void {
    this.editor = new SegmentEditor<P, T>({
      disabled: this.config.disabled,
      readonly: this.config.readonly,
      roving: this.config.roving,
      cycle: this.cycle,
      specs: this.specs,
      editableOrder: this.editableOrder,
      periodNames: this.periodNames,
      parts: () => this.parts(),
      segmentMin: (type) => this.segmentMin(type),
      segmentMax: (type) => this.segmentMax(type),
      seed: (type) => this.seed(type),
      placeholderFor: (type) => this.placeholderFor(type),
      valueText: (type) => this.valueText(type),
      commit: (next, transient) => this.commitParts(next, transient),
    });
  }

  segmentValue(type: SegmentType): number | null {
    return this.editor.segmentValue(type);
  }

  segmentValueText(type: SegmentType): string | null {
    return this.editor.segmentValueText(type);
  }

  segmentDisplayText(type: SegmentType): string {
    return this.editor.segmentDisplayText(type);
  }

  isSegmentEmpty(type: SegmentType): boolean {
    return this.editor.isSegmentEmpty(type);
  }

  isFirstSegmentType(type: SegmentType): boolean {
    return this.editor.isFirstSegmentType(type);
  }

  registerSegment(handle: SegmentHandle): void {
    this.editor.registerSegment(handle);
  }

  unregisterSegment(handle: SegmentHandle): void {
    this.editor.unregisterSegment(handle);
  }

  focusSegment(type: SegmentType): void {
    this.editor.focusSegment(type);
  }

  /** Move focus to the first editable segment — the field's focus-on-error target. */
  focusFirstSegment(options?: FocusOptions): void {
    this.editor.focusFirstSegment(options);
  }

  typeDigit(type: SegmentType, digit: number): void {
    this.editor.typeDigit(type, digit);
  }

  step(type: SegmentType, delta: number): void {
    this.editor.step(type, delta);
  }

  goToBound(type: SegmentType, bound: 'min' | 'max'): void {
    this.editor.goToBound(type, bound);
  }

  setDayPeriod(period: 'am' | 'pm'): void {
    this.editor.setDayPeriod(period);
  }

  setDayPeriodFromKey(key: string): boolean {
    return this.editor.setDayPeriodFromKey(key);
  }

  clear(type: SegmentType): void {
    this.editor.clear(type);
  }

  backspace(type: SegmentType): void {
    this.editor.backspace(type);
  }

  focusSibling(type: SegmentType, step: -1 | 1): void {
    this.editor.focusSibling(type, step);
  }

  endTyping(): void {
    this.editor.endTyping();
  }

  /** Lowest accepted display value for `type`. */
  abstract segmentMin(type: SegmentType): number;

  /** Highest accepted display value for `type`. */
  abstract segmentMax(type: SegmentType): number;

  /** Base value for stepping an empty `type` on first step. */
  protected abstract seed(type: SegmentType): number;

  /** Placeholder shown while `type` is empty. */
  protected abstract placeholderFor(type: SegmentType): string;

  /** Field-specific `aria-valuetext` for `type`, or `null` for the numeric reading. */
  protected abstract valueText(type: SegmentType): string | null;

  /** Composes a parts record into the value, clamped to the bounds, or `null` while incomplete. */
  protected abstract composeFrom(parts: P): D | null;

  /**
   * Finalizes the parts recorded by a commit before they are stored. The default
   * is the identity; the date engine overrides it to re-clamp the day on a
   * settled commit.
   */
  protected finalizeCommitParts(next: P, _transient: boolean): P {
    return next;
  }

  protected commitParts(rawNext: P, transient: boolean): void {
    const next = this.finalizeCommitParts(rawNext, transient);
    this.parts.set(next);
    if (transient) {
      return;
    }
    this.config.onCommit(this.composeFrom(next));
  }
}
