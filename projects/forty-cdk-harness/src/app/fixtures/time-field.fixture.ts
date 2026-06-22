import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { provideNativeDateAdapter } from 'forty-cdk/calendar';
import { ForTimeField, ForTimeFieldLiteral, ForTimeFieldSegment } from 'forty-cdk/time-field';

import { queryFlag } from './_query-flag';

@Component({
  selector: 'app-time-field-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTimeField, ForTimeFieldSegment, ForTimeFieldLiteral],
  providers: [...provideNativeDateAdapter()],
  template: `
    <input data-testid="before" placeholder="before-time-field" />

    <div
      forTimeField
      data-testid="field"
      [(value)]="value"
      [dir]="dir"
      [hourCycle]="hourCycle"
      [granularity]="granularity"
      [locale]="'en-US'"
      [ariaLabel]="'Appointment time'"
      #field="forTimeField"
    >
      @for (seg of field.segments(); track seg.id) {
        @if (seg.isLiteral) {
          <span forTimeFieldLiteral>{{ seg.text }}</span>
        } @else {
          <span forTimeFieldSegment [segment]="seg.type!" [attr.data-testid]="seg.type">{{
            seg.text
          }}</span>
        }
      }
    </div>

    <output data-testid="value">{{ readout() }}</output>

    <input data-testid="after" placeholder="after-time-field" />
  `,
})
export class TimeFieldFixture {
  protected readonly hourCycle: 12 | 24 = queryFlag('h12') ? 12 : 24;
  protected readonly granularity: 'hour' | 'minute' | 'second' = queryFlag('sec')
    ? 'second'
    : 'minute';
  protected readonly value = signal<Date | null>(
    queryFlag('preset') ? new Date(2026, 5, 15, 13, 45) : null,
  );
  protected readonly dir: 'ltr' | 'rtl' = queryFlag('rtl') ? 'rtl' : 'ltr';

  protected readonly readout = computed(() => {
    const date = this.value();
    if (date === null) {
      return 'empty';
    }
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    if (this.granularity === 'second') {
      const second = String(date.getSeconds()).padStart(2, '0');
      return `${hour}:${minute}:${second}`;
    }
    return `${hour}:${minute}`;
  });
}
