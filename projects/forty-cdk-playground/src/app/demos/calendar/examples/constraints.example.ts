import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  type CalendarDate,
  getDayOfWeek,
  getLocalTimeZone,
  today,
} from '@internationalized/date';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { DemoLayout } from '../../../ui/demo-layout';
import { CalendarView } from './calendar-view';

@Component({
  selector: 'app-calendar-constraints-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, CalendarView, ControlSelect],
  template: `
    <playground-demo
      title="Constraints & week start"
      subtitle="min disables past dates and isDateUnavailable blocks weekends — both reflect aria-disabled and refuse selection, while arrows still move across them so navigation is never trapped. firstDayOfWeek switches the week to start on Sunday or Monday and shifts the whole column layout."
      sourcePath="projects/forty-cdk-playground/src/app/demos/calendar/examples/constraints.example.ts"
    >
      <div demo>
        <app-calendar-view
          [(value)]="value"
          [min]="min"
          [firstDayOfWeek]="firstDayOfWeek()"
          [isDateUnavailable]="isWeekendUnavailable"
        />
      </div>

      <div controls class="pg-controls">
        <app-control-select
          label="firstDayOfWeek"
          hint="First column of the week: 0 = Sunday, 1 = Monday. Defaults to the adapter value when unset."
          [options]="weekStartOptions"
          [(value)]="weekStart"
        />

        <p class="pg-hint">
          Dates before today and any weekend are unavailable — they show aria-disabled and block
          selection, but the arrow keys still pass over them.
        </p>
        <p class="pg-state">selected: <b>{{ selectedLabel() }}</b></p>
      </div>
    </playground-demo>
  `,
})
export class CalendarConstraintsExample {
  protected readonly value = signal<CalendarDate | null>(null);
  protected readonly min = today(getLocalTimeZone());

  protected readonly weekStartOptions: readonly ControlOption<'0' | '1'>[] = [
    { value: '0', label: 'Sunday' },
    { value: '1', label: 'Monday' },
  ];
  protected readonly weekStart = signal<'0' | '1'>('1');
  protected readonly firstDayOfWeek = computed(() => Number(this.weekStart()));

  protected readonly selectedLabel = computed(() => this.value()?.toString() ?? '—');

  protected readonly isWeekendUnavailable = (date: CalendarDate): boolean => {
    const dayOfWeek = getDayOfWeek(date, 'en-US');
    return dayOfWeek === 0 || dayOfWeek === 6;
  };
}
