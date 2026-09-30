import { Directive } from '@angular/core';

import { FOR_FIELD_CONTEXT } from './field-context';

/**
 * Keeps the controls and field pieces inside it, and a control on its own
 * host, from reaching an ancestor `[forField]`. Put it on an auxiliary control
 * that only writes into the field's control (a picker beside a segmented
 * field), so the field keeps reflecting the control it labels. A `[forField]`
 * inside the boundary still wires the controls inside it.
 *
 * Every overlay surface that can host a control is already a boundary:
 * `[forDatePickerContent]`, `[forTimePickerContent]`, `[forSelectContent]`,
 * `[forComboboxContent]`, `[forPopoverContent]`, `[forDialog]` and
 * `[forDrawer]`.
 *
 * @example
 * ```html
 * <div forField>
 *   <span forLabel>Start time</span>
 *   <div forTimeField [formField]="form.start">…</div>
 *   <div forTimePicker forFieldBoundary [value]="form.start().value()" (valueChange)="commit($event)">
 *     …
 *   </div>
 * </div>
 * ```
 */
@Directive({
  selector: '[forFieldBoundary]',
  exportAs: 'forFieldBoundary',
  providers: [{ provide: FOR_FIELD_CONTEXT, useValue: null }],
})
export class ForFieldBoundary {}
