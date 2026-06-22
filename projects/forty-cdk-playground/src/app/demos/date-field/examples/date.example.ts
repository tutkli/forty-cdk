import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { type CalendarDate, getLocalTimeZone, today } from '@internationalized/date';
import { ForDateField, ForDateFieldLiteral, ForDateFieldSegment } from 'forty-cdk/date-field';
import { provideInternationalizedDateAdapter } from 'forty-cdk/internationalized-date';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-date-field-date-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ControlSelect,
    ControlSwitch,
    ForDateField,
    ForDateFieldSegment,
    ForDateFieldLiteral,
  ],
  providers: [...provideInternationalizedDateAdapter()],
  template: `
    <playground-demo
      title="Date segments"
      subtitle="Each part is a role=spinbutton: type to fill it and auto-advance, ↑ / ↓ step the focused segment, ← / → move between them, and Backspace clears. The locale drives segment order, separators and month names. value() stays null until every segment is filled; turn on constraints to watch out-of-range dates clamp."
      sourcePath="projects/forty-cdk-playground/src/app/demos/date-field/examples/date.example.ts"
    >
      <div demo>
        <div
          forDateField
          class="pg-seg-field"
          [(value)]="value"
          [locale]="locale()"
          [minDate]="minDate()"
          [maxDate]="maxDate()"
          [disabled]="disabled()"
          [readonly]="readonly()"
          ariaLabel="Date"
          #field="forDateField"
        >
          @for (seg of field.segments(); track seg.id) {
            @if (seg.isLiteral) {
              <span forDateFieldLiteral class="pg-seg-literal">{{ seg.text }}</span>
            } @else {
              <span forDateFieldSegment class="pg-seg" [segment]="seg.type!">{{ seg.text }}</span>
            }
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-select
          label="locale"
          hint="Re-orders the segments and switches separators (M/D/Y vs D.M.Y vs Y/M/D)."
          [options]="localeOptions"
          [(value)]="locale"
        />
        <app-control-switch
          label="constrain to this year"
          hint="Sets minDate to Jan 1 and maxDate to today; a date outside the range is clamped on commit."
          [(checked)]="constrained"
        />
        <app-control-switch label="disabled" [(checked)]="disabled" />
        <app-control-switch label="readonly" [(checked)]="readonly" />
        <p class="pg-state">
          value: <b>{{ value()?.toString() ?? 'null' }}</b
          ><br />
          min: <b>{{ minDate()?.toString() ?? '—' }}</b
          ><br />
          max: <b>{{ maxDate()?.toString() ?? '—' }}</b>
        </p>
      </div>
    </playground-demo>
  `,
})
export class DateFieldDateExample {
  protected readonly value = signal<CalendarDate | null>(null);
  protected readonly locale = signal('en-US');
  protected readonly constrained = signal(false);
  protected readonly disabled = signal(false);
  protected readonly readonly = signal(false);

  protected readonly localeOptions: readonly ControlOption[] = [
    { value: 'en-US', label: 'en-US (M/D/Y)' },
    { value: 'en-GB', label: 'en-GB (D/M/Y)' },
    { value: 'de-DE', label: 'de-DE (D.M.Y)' },
    { value: 'ja-JP', label: 'ja-JP (Y/M/D)' },
  ];

  readonly #today = today(getLocalTimeZone());

  protected readonly minDate = computed(() =>
    this.constrained() ? this.#today.set({ month: 1, day: 1 }) : null,
  );
  protected readonly maxDate = computed(() => (this.constrained() ? this.#today : null));
}
