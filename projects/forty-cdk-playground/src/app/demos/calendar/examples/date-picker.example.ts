import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { type CalendarDate, getLocalTimeZone, today } from '@internationalized/date';

import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';
import { CalendarView } from './calendar-view';

@Component({
  selector: 'app-calendar-date-picker-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, CalendarView, ControlSwitch],
  template: `
    <playground-demo
      title="Date picker"
      subtitle="A single-date grid implementing the APG Grid pattern. One Tab stop enters the grid on the focused day, then arrows roam day by day and week by week, PageUp / PageDown page the month (Shift pages the year) and re-draw the grid, Home / End hit the week bounds, and Enter / Space select. The aria-live heading announces each new month."
      sourcePath="projects/forty-cdk-playground/src/app/demos/calendar/examples/date-picker.example.ts"
    >
      <div demo>
        <app-calendar-view [(value)]="value" [disabled]="disabled()" [readonly]="readonly()" />
      </div>

      <div controls class="pg-controls">
        <app-control-switch label="disabled" [(checked)]="disabled" />
        <app-control-switch
          label="readonly"
          hint="Days stay focusable and the grid still pages, but clicking or pressing Enter no longer changes the selection."
          [(checked)]="readonly"
        />

        <div class="pg-btn-row">
          <button type="button" class="pg-btn pg-btn--primary" (click)="goToday()">
            Go to today
          </button>
          <button type="button" class="pg-btn" (click)="clear()">Clear</button>
        </div>

        <p class="pg-state">
          selected: <b>{{ selectedLabel() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
})
export class CalendarDatePickerExample {
  protected readonly value = signal<CalendarDate | null>(today(getLocalTimeZone()));
  protected readonly disabled = signal(false);
  protected readonly readonly = signal(false);

  protected readonly selectedLabel = computed(() => this.value()?.toString() ?? '—');

  protected goToday(): void {
    this.value.set(today(getLocalTimeZone()));
  }

  protected clear(): void {
    this.value.set(null);
  }
}
