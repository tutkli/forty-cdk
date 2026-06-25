import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { type CalendarDate, getLocalTimeZone, today } from '@internationalized/date';
import { type CalendarDateRange } from 'forty-cdk/calendar';
import {
  ForDateRangeField,
  ForDateRangeFieldEnd,
  ForDateRangeFieldLiteral,
  ForDateRangeFieldSegment,
  ForDateRangeFieldStart,
} from 'forty-cdk/date-range-field';
import { provideInternationalizedDateAdapter } from 'forty-cdk/internationalized-date';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-date-range-field-range-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ControlSelect,
    ControlSwitch,
    ForDateRangeField,
    ForDateRangeFieldStart,
    ForDateRangeFieldEnd,
    ForDateRangeFieldSegment,
    ForDateRangeFieldLiteral,
  ],
  providers: [...provideInternationalizedDateAdapter()],
  template: `
    <playground-demo
      title="Date range"
      subtitle="Two labelled role=group endpoints, each a row of spinbutton segments — the same keyboard editing as Date Field, twice. Tab steps start → end; arrows move between segments within an endpoint. value() stays null until both endpoints are filled and ordered; type an end earlier than the start to watch data-range-error light the field red while value() holds at null."
      sourcePath="projects/forty-cdk-playground/src/app/demos/date-range-field/examples/range.example.ts"
    >
      <div demo>
        <div
          forDateRangeField
          class="pg-range-field"
          [(value)]="value"
          [locale]="locale()"
          [disabled]="disabled()"
          [readonly]="readonly()"
          ariaLabel="Trip dates"
        >
          <div forDateRangeFieldStart class="pg-range-endpoint" #start="forDateRangeFieldStart">
            @for (seg of start.segments(); track seg.id) {
              @if (seg.isLiteral) {
                <span forDateRangeFieldLiteral class="pg-seg-literal">{{ seg.text }}</span>
              } @else {
                <span forDateRangeFieldSegment class="pg-seg" [segment]="seg.type!">{{
                  seg.text
                }}</span>
              }
            }
          </div>
          <span aria-hidden="true" class="pg-range-sep">–</span>
          <div forDateRangeFieldEnd class="pg-range-endpoint" #end="forDateRangeFieldEnd">
            @for (seg of end.segments(); track seg.id) {
              @if (seg.isLiteral) {
                <span forDateRangeFieldLiteral class="pg-seg-literal">{{ seg.text }}</span>
              } @else {
                <span forDateRangeFieldSegment class="pg-seg" [segment]="seg.type!">{{
                  seg.text
                }}</span>
              }
            }
          </div>
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-select
          label="locale"
          hint="Re-orders the segments and switches separators (M/D/Y vs D.M.Y vs Y/M/D) on both endpoints."
          [options]="localeOptions"
          [(value)]="locale"
        />
        <app-control-switch label="disabled" [(checked)]="disabled" />
        <app-control-switch label="readonly" [(checked)]="readonly" />
        <div class="pg-btn-row">
          <button type="button" class="pg-btn" (click)="value.set(null)">Clear</button>
        </div>
        <p class="pg-state">
          start: <b>{{ value()?.start?.toString() ?? 'null' }}</b
          ><br />
          end: <b>{{ value()?.end?.toString() ?? 'null' }}</b
          ><br />
          value: <b>{{ committed() }}</b>
        </p>
        <p class="pg-hint">
          value() is the committed CalendarDateRange — null whenever an endpoint is empty or the two
          are out of order.
        </p>
      </div>
    </playground-demo>
  `,
})
export class DateRangeFieldRangeExample {
  protected readonly value = signal<CalendarDateRange<CalendarDate> | null>({
    start: today(getLocalTimeZone()),
    end: today(getLocalTimeZone()).add({ days: 5 }),
  });
  protected readonly locale = signal('en-US');
  protected readonly disabled = signal(false);
  protected readonly readonly = signal(false);

  protected readonly committed = computed(() => (this.value() ? 'range' : 'null'));

  protected readonly localeOptions: readonly ControlOption[] = [
    { value: 'en-US', label: 'en-US (M/D/Y)' },
    { value: 'en-GB', label: 'en-GB (D/M/Y)' },
    { value: 'de-DE', label: 'de-DE (D.M.Y)' },
    { value: 'ja-JP', label: 'ja-JP (Y/M/D)' },
  ];
}
