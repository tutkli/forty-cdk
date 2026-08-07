import { computed, Directive, inject, input, type Signal } from '@angular/core';

import {
  type FieldSegment,
  type TimeSegmentType,
  type WritingDirection,
  hostAriaLabel,
} from 'forty-cdk/core';
import {
  FOR_TIME_RANGE_FIELD_CONTEXT,
  FOR_TIME_RANGE_FIELD_SEGMENT_CONTEXT,
  injectTimeRangeFieldContext,
  type TimeRangeFieldEndpoint,
} from './time-range-field-context';

/**
 * Shared base for the two endpoint groups of a `[forTimeRangeField]`. Each
 * endpoint is a labelled `role="group"` owning one tab stop (its own roving
 * tabindex) and one time engine on the root. The base reads the root
 * coordination surface and exposes the endpoint's rendered `segments` (for the
 * consumer's `@for`), accessible label, and disabled / read-only / direction
 * for its host bindings. The concrete `[forTimeRangeFieldStart]` /
 * `[forTimeRangeFieldEnd]` subclasses bind the matching start / end engine and
 * provide the per-endpoint `SegmentEditorContext` their segments inject.
 *
 * A read-only field is reflected on the endpoint group as the boolean
 * `data-readonly` styling hook only. `aria-readonly` is not a supported
 * property of `role="group"`, so the ARIA announcement lives on each
 * `[forTimeRangeFieldSegment]` — `role="spinbutton"` does support it.
 */
@Directive({
  host: {
    role: 'group',
    '[attr.dir]': 'dir()',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-readonly]': 'readonly() ? "" : null',
  },
})
export abstract class ForTimeRangeFieldEndpointBase {
  /** Which endpoint this group edits. */
  protected abstract readonly which: TimeRangeFieldEndpoint;

  protected readonly root = injectTimeRangeFieldContext('ForTimeRangeField endpoint');

  /**
   * Accessible name for this endpoint group. Falls back to the scope default
   * (`'Start time'` / `'End time'` via `provideForTimeRangeFieldDefaults`).
   * Emits no `aria-label` while both are `null`.
   */
  readonly ariaLabel = input<string | null>(null);

  /** The field's effective disabled, reflected on the group. */
  readonly effectiveDisabled: Signal<boolean> = this.root.effectiveDisabled;

  /** Whether the field is read-only, reflected on the group. */
  readonly readonly: Signal<boolean> = this.root.readonly;

  /** Resolved writing direction, reflected on the group. */
  readonly dir: Signal<WritingDirection> = this.root.dir;

  /**
   * The ordered, locale-derived segments (editable + literals) of this
   * endpoint to render. Each entry carries the text to display: the formatted
   * value when filled, the placeholder while empty, or the literal separator.
   */
  readonly segments: Signal<readonly FieldSegment<TimeSegmentType>[]> = computed(() =>
    this.root.endpointSegments(this.which)(),
  );

  /** Resolved accessible name for this endpoint group (explicit input or scope default). */
  protected readonly label: Signal<string | null> = computed(
    () => this.ariaLabel() ?? this.root.endpointLabel(this.which)(),
  );

  /**
   * Emitted `aria-label`: a consumer-set static value on the endpoint group
   * when present, else {@link label}.
   */
  protected readonly resolvedAriaLabel = hostAriaLabel(() => this.label() || null);
}

/**
 * The start endpoint group of a `[forTimeRangeField]`. Render its
 * `segments()` with `[forTimeRangeFieldSegment]` / `[forTimeRangeFieldLiteral]`
 * children; entry composes the range's inclusive start.
 *
 * @example
 * ```html
 * <div forTimeRangeFieldStart #start="forTimeRangeFieldStart">
 *   @for (seg of start.segments(); track seg.id) {
 *     @if (seg.isLiteral) {
 *       <span forTimeRangeFieldLiteral>{{ seg.text }}</span>
 *     } @else {
 *       <span forTimeRangeFieldSegment [segment]="seg.type!">{{ seg.text }}</span>
 *     }
 *   }
 * </div>
 * ```
 */
@Directive({
  selector: '[forTimeRangeFieldStart]',
  exportAs: 'forTimeRangeFieldStart',
  providers: [
    {
      provide: FOR_TIME_RANGE_FIELD_SEGMENT_CONTEXT,
      useFactory: () => inject(FOR_TIME_RANGE_FIELD_CONTEXT).endpointContext('start'),
    },
  ],
})
export class ForTimeRangeFieldStart extends ForTimeRangeFieldEndpointBase {
  protected readonly which = 'start' as const;
}

/**
 * The end endpoint group of a `[forTimeRangeField]`. Render its `segments()`
 * with `[forTimeRangeFieldSegment]` / `[forTimeRangeFieldLiteral]` children;
 * entry composes the range's inclusive end.
 */
@Directive({
  selector: '[forTimeRangeFieldEnd]',
  exportAs: 'forTimeRangeFieldEnd',
  providers: [
    {
      provide: FOR_TIME_RANGE_FIELD_SEGMENT_CONTEXT,
      useFactory: () => inject(FOR_TIME_RANGE_FIELD_CONTEXT).endpointContext('end'),
    },
  ],
})
export class ForTimeRangeFieldEnd extends ForTimeRangeFieldEndpointBase {
  protected readonly which = 'end' as const;
}
