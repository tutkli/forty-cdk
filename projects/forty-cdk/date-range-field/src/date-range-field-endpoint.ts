import { computed, Directive, inject, input, type Signal } from '@angular/core';

import { type FieldSegment, type WritingDirection } from 'forty-cdk/core';
import {
  type DateRangeFieldEndpoint,
  FOR_DATE_RANGE_FIELD_CONTEXT,
  FOR_DATE_RANGE_FIELD_SEGMENT_CONTEXT,
  injectDateRangeFieldContext,
} from './date-range-field-context';

/**
 * Shared base for the two endpoint groups of a `[forDateRangeField]`. Each
 * endpoint is a labelled `role="group"` owning one tab stop (its own roving
 * tabindex) and one segment engine on the root. The base reads the root
 * coordination surface and exposes the endpoint's rendered `segments` (for the
 * consumer's `@for`), accessible label, and disabled / read-only / direction
 * for its host bindings. The concrete `[forDateRangeFieldStart]` /
 * `[forDateRangeFieldEnd]` subclasses bind the matching start / end engine and
 * provide the per-endpoint `SegmentEditorContext` their segments inject.
 */
@Directive({
  host: {
    role: 'group',
    '[attr.dir]': 'dir()',
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.aria-readonly]': 'readonly() ? "true" : null',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-readonly]': 'readonly() ? "" : null',
  },
})
export abstract class ForDateRangeFieldEndpointBase {
  /** Which endpoint this group edits. */
  protected abstract readonly which: DateRangeFieldEndpoint;

  protected readonly root = injectDateRangeFieldContext('ForDateRangeField endpoint');

  /**
   * Accessible name for this endpoint group. Falls back to the scope default
   * (`'Start date'` / `'End date'` via `provideForDateRangeFieldDefaults`).
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
  readonly segments: Signal<readonly FieldSegment[]> = computed(() =>
    this.root.endpointSegments(this.which)(),
  );

  /** Resolved accessible name for this endpoint group (explicit input or scope default). */
  protected readonly label: Signal<string | null> = computed(
    () => this.ariaLabel() ?? this.root.endpointLabel(this.which)(),
  );
}

/**
 * The start endpoint group of a `[forDateRangeField]`. Render its
 * `segments()` with `[forDateRangeFieldSegment]` / `[forDateRangeFieldLiteral]`
 * children; entry composes the range's inclusive start.
 *
 * @example
 * ```html
 * <div forDateRangeFieldStart #start="forDateRangeFieldStart">
 *   @for (seg of start.segments(); track seg.id) {
 *     @if (seg.isLiteral) {
 *       <span forDateRangeFieldLiteral>{{ seg.text }}</span>
 *     } @else {
 *       <span forDateRangeFieldSegment [segment]="seg.type!">{{ seg.text }}</span>
 *     }
 *   }
 * </div>
 * ```
 */
@Directive({
  selector: '[forDateRangeFieldStart]',
  exportAs: 'forDateRangeFieldStart',
  providers: [
    {
      provide: FOR_DATE_RANGE_FIELD_SEGMENT_CONTEXT,
      useFactory: () => inject(FOR_DATE_RANGE_FIELD_CONTEXT).endpointContext('start'),
    },
  ],
})
export class ForDateRangeFieldStart extends ForDateRangeFieldEndpointBase {
  protected readonly which = 'start' as const;
}

/**
 * The end endpoint group of a `[forDateRangeField]`. Render its `segments()`
 * with `[forDateRangeFieldSegment]` / `[forDateRangeFieldLiteral]` children;
 * entry composes the range's inclusive end.
 */
@Directive({
  selector: '[forDateRangeFieldEnd]',
  exportAs: 'forDateRangeFieldEnd',
  providers: [
    {
      provide: FOR_DATE_RANGE_FIELD_SEGMENT_CONTEXT,
      useFactory: () => inject(FOR_DATE_RANGE_FIELD_CONTEXT).endpointContext('end'),
    },
  ],
})
export class ForDateRangeFieldEnd extends ForDateRangeFieldEndpointBase {
  protected readonly which = 'end' as const;
}
