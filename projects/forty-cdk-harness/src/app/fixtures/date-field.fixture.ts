import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { provideNativeDateAdapter } from 'forty-cdk/calendar';
import { ForDateField, ForDateFieldLiteral, ForDateFieldSegment } from 'forty-cdk/date-field';

import { queryFlag } from './_query-flag';

@Component({
  selector: 'app-date-field-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForDateField, ForDateFieldSegment, ForDateFieldLiteral],
  providers: [...provideNativeDateAdapter()],
  template: `
    <input data-testid="before" placeholder="before-date-field" />

    <div
      forDateField
      data-testid="field"
      [(value)]="value"
      [dir]="dir"
      [granularity]="granularity"
      [hourCycle]="24"
      [locale]="'en-US'"
      [ariaLabel]="'Date of birth'"
      #field="forDateField"
    >
      @for (seg of field.segments(); track seg.id) {
        @if (seg.isLiteral) {
          <span forDateFieldLiteral>{{ seg.text }}</span>
        } @else {
          <span forDateFieldSegment [segment]="seg.type!" [attr.data-testid]="seg.type">{{
            seg.text
          }}</span>
        }
      }
    </div>

    <output data-testid="value">{{ readout() }}</output>

    <input data-testid="after" placeholder="after-date-field" />
  `,
})
export class DateFieldFixture {
  protected readonly granularity: 'day' | 'minute' = queryFlag('datetime') ? 'minute' : 'day';
  protected readonly value = signal<Date | null>(
    queryFlag('preset')
      ? this.granularity === 'minute'
        ? new Date(2026, 5, 15, 14, 30)
        : new Date(2026, 5, 15)
      : null,
  );
  protected readonly dir: 'ltr' | 'rtl' = queryFlag('rtl') ? 'rtl' : 'ltr';

  protected readonly readout = computed(() => {
    const date = this.value();
    if (date === null) {
      return 'empty';
    }
    const year = String(date.getFullYear()).padStart(4, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const base = `${year}-${month}-${day}`;
    if (this.granularity !== 'minute') {
      return base;
    }
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${base} ${hour}:${minute}`;
  });
}
