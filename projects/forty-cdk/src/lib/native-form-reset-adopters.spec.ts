import { Component, signal, type Type } from '@angular/core';

import { ForCheckbox } from 'forty-cdk/checkbox';
import { ForCombobox, ForComboboxInput } from 'forty-cdk/combobox';
import {
  ForDateField,
  ForDateFieldLiteral,
  ForDateFieldSegment,
  ForDateRangeField,
  ForDateRangeFieldEnd,
  ForDateRangeFieldLiteral,
  ForDateRangeFieldSegment,
  ForDateRangeFieldStart,
} from 'forty-cdk/date-field';
import { ForDatePicker, ForDatePickerTrigger, ForDateRangePicker } from 'forty-cdk/date-picker';
import { ForInput, ForTextarea } from 'forty-cdk/input';
import { ForListbox, ForListboxOption } from 'forty-cdk/listbox';
import { ForNumberInput } from 'forty-cdk/number-input';
import { ForOtpInput } from 'forty-cdk/otp-input';
import { ForRadio, ForRadioGroup } from 'forty-cdk/radio-group';
import { ForSearch } from 'forty-cdk/search';
import { ForSelect, ForSelectTrigger } from 'forty-cdk/select';
import { type DateRange, provideNativeDateAdapter } from 'forty-cdk/shared';
import { ForSlider, ForSliderThumb } from 'forty-cdk/slider';
import { ForSwitch } from 'forty-cdk/switch';
import { pressKey } from 'forty-cdk/testing';
import {
  ForTimeField,
  ForTimeFieldLiteral,
  ForTimeFieldSegment,
  ForTimeRangeField,
  ForTimeRangeFieldEnd,
  ForTimeRangeFieldLiteral,
  ForTimeRangeFieldSegment,
  ForTimeRangeFieldStart,
} from 'forty-cdk/time-field';
import { ForTimePicker, ForTimePickerTrigger } from 'forty-cdk/time-picker';
import { ForToggle, ForToggleGroup, ForToggleGroupItem } from 'forty-cdk/toggle';

import { renderHost, type RenderResult } from '../test-utils/render';
import { LIBRARY_CODE } from '../test-utils/source-scan';

interface SweepHost {
  change(): void;
  current(): unknown;
}

@Component({
  imports: [ForCheckbox],
  template: `<form>
    <button forCheckbox name="agree" [(checked)]="checked" [(indeterminate)]="mixed">A</button>
  </form>`,
})
class CheckboxHost implements SweepHost {
  readonly checked = signal(true);
  readonly mixed = signal(false);
  change(): void {
    this.checked.set(false);
    this.mixed.set(true);
  }
  current(): unknown {
    return [this.checked(), this.mixed()];
  }
}

@Component({
  imports: [ForSwitch],
  template: `<form><button forSwitch name="wifi" [(checked)]="checked">W</button></form>`,
})
class SwitchHost implements SweepHost {
  readonly checked = signal(true);
  change(): void {
    this.checked.set(false);
  }
  current(): unknown {
    return this.checked();
  }
}

@Component({
  imports: [ForToggle],
  template: `<form><button forToggle name="bold" [(checked)]="checked">B</button></form>`,
})
class ToggleHost implements SweepHost {
  readonly checked = signal(true);
  change(): void {
    this.checked.set(false);
  }
  current(): unknown {
    return this.checked();
  }
}

@Component({
  imports: [ForToggleGroup, ForToggleGroupItem],
  template: `<form>
    <div forToggleGroup name="align" [(value)]="value">
      <button forToggleGroupItem value="left">L</button>
      <button forToggleGroupItem value="right">R</button>
    </div>
  </form>`,
})
class ToggleGroupHost implements SweepHost {
  readonly value = signal<readonly string[]>(['left']);
  change(): void {
    this.value.set(['right']);
  }
  current(): unknown {
    return this.value();
  }
}

@Component({
  imports: [ForRadioGroup, ForRadio],
  template: `<form>
    <div forRadioGroup name="size" [(value)]="value">
      <button forRadio value="s">S</button>
      <button forRadio value="m">M</button>
    </div>
  </form>`,
})
class RadioGroupHost implements SweepHost {
  readonly value = signal<string | null>('s');
  change(): void {
    this.value.set('m');
  }
  current(): unknown {
    return this.value();
  }
}

@Component({
  imports: [ForSlider, ForSliderThumb],
  template: `<form>
    <div forSlider name="volume" [(value)]="value">
      <span forSliderThumb [index]="0" ariaLabel="Volume"></span>
    </div>
  </form>`,
})
class SliderHost implements SweepHost {
  readonly value = signal<readonly number[]>([50]);
  change(): void {
    this.value.set([20]);
  }
  current(): unknown {
    return this.value();
  }
}

@Component({
  imports: [ForListbox, ForListboxOption],
  template: `<form>
    <div forListbox name="fruit" [(value)]="value" ariaLabel="Fruit">
      <button type="button" forListboxOption value="apple">Apple</button>
      <button type="button" forListboxOption value="pear">Pear</button>
    </div>
  </form>`,
})
class ListboxHost implements SweepHost {
  readonly value = signal<readonly string[]>(['apple']);
  change(): void {
    this.value.set(['pear']);
  }
  current(): unknown {
    return this.value();
  }
}

@Component({
  imports: [ForSelect, ForSelectTrigger],
  template: `<form>
    <div forSelect name="fruit" [(value)]="value">
      <button forSelectTrigger>Fruit</button>
    </div>
  </form>`,
})
class SelectHost implements SweepHost {
  readonly value = signal<readonly string[]>(['apple']);
  change(): void {
    this.value.set(['pear']);
  }
  current(): unknown {
    return this.value();
  }
}

@Component({
  imports: [ForCombobox, ForComboboxInput],
  template: `<form>
    <div forCombobox name="fruit" [(value)]="value" [(query)]="query">
      <input forComboboxInput aria-label="Fruit" />
    </div>
  </form>`,
})
class ComboboxHost implements SweepHost {
  readonly value = signal<readonly string[]>(['apple']);
  readonly query = signal('Apple');
  change(): void {
    this.value.set(['pear']);
    this.query.set('Pea');
  }
  current(): unknown {
    return [this.value(), this.query()];
  }
}

@Component({
  imports: [ForDateField, ForDateFieldSegment, ForDateFieldLiteral],
  providers: [...provideNativeDateAdapter()],
  template: `<form>
    <div forDateField name="when" [(value)]="value" ariaLabel="When" #field="forDateField">
      @for (seg of field.segments(); track seg.id) {
        @if (seg.isLiteral) {
          <span forDateFieldLiteral>{{ seg.text }}</span>
        } @else {
          <span forDateFieldSegment [segment]="seg.type!">{{ seg.text }}</span>
        }
      }
    </div>
  </form>`,
})
class DateFieldHost implements SweepHost {
  readonly value = signal<Date | null>(new Date(2026, 0, 15));
  change(): void {
    this.value.set(new Date(2027, 5, 1));
  }
  current(): unknown {
    return this.value();
  }
}

@Component({
  imports: [ForTimeField, ForTimeFieldSegment, ForTimeFieldLiteral],
  providers: [...provideNativeDateAdapter()],
  template: `<form>
    <div forTimeField name="at" [(value)]="value" ariaLabel="At" #field="forTimeField">
      @for (seg of field.segments(); track seg.id) {
        @if (seg.isLiteral) {
          <span forTimeFieldLiteral>{{ seg.text }}</span>
        } @else {
          <span forTimeFieldSegment [segment]="seg.type!">{{ seg.text }}</span>
        }
      }
    </div>
  </form>`,
})
class TimeFieldHost implements SweepHost {
  readonly value = signal<Date | null>(new Date(2026, 0, 15, 9, 30));
  change(): void {
    this.value.set(new Date(2026, 0, 15, 17, 45));
  }
  current(): unknown {
    return this.value();
  }
}

@Component({
  imports: [ForDateRangeField, ForDateRangeFieldStart, ForDateRangeFieldEnd],
  providers: [...provideNativeDateAdapter()],
  template: `<form>
    <div forDateRangeField name="stay" [(value)]="value" ariaLabel="Stay">
      <div forDateRangeFieldStart></div>
      <div forDateRangeFieldEnd></div>
    </div>
  </form>`,
})
class DateRangeFieldHost implements SweepHost {
  readonly value = signal<DateRange<Date> | null>({
    start: new Date(2026, 0, 15),
    end: new Date(2026, 0, 20),
  });
  change(): void {
    this.value.set({ start: new Date(2026, 2, 1), end: new Date(2026, 2, 9) });
  }
  current(): unknown {
    return this.value();
  }
}

@Component({
  imports: [ForTimeRangeField, ForTimeRangeFieldStart, ForTimeRangeFieldEnd],
  providers: [...provideNativeDateAdapter()],
  template: `<form>
    <div forTimeRangeField name="hours" [(value)]="value" ariaLabel="Hours">
      <div forTimeRangeFieldStart></div>
      <div forTimeRangeFieldEnd></div>
    </div>
  </form>`,
})
class TimeRangeFieldHost implements SweepHost {
  readonly value = signal<DateRange<Date> | null>({
    start: new Date(2026, 0, 15, 9, 0),
    end: new Date(2026, 0, 15, 17, 0),
  });
  change(): void {
    this.value.set({ start: new Date(2026, 0, 15, 10, 0), end: new Date(2026, 0, 15, 12, 0) });
  }
  current(): unknown {
    return this.value();
  }
}

@Component({
  imports: [ForDatePicker, ForDatePickerTrigger],
  providers: [...provideNativeDateAdapter()],
  template: `<form>
    <div forDatePicker name="when" [(value)]="value" ariaLabel="When">
      <button forDatePickerTrigger>Pick</button>
    </div>
  </form>`,
})
class DatePickerHost implements SweepHost {
  readonly value = signal<Date | null>(new Date(2026, 0, 15));
  change(): void {
    this.value.set(new Date(2027, 5, 1));
  }
  current(): unknown {
    return this.value();
  }
}

@Component({
  imports: [ForDateRangePicker, ForDatePickerTrigger],
  providers: [...provideNativeDateAdapter()],
  template: `<form>
    <div forDateRangePicker name="stay" [(value)]="value" ariaLabel="Stay">
      <button forDatePickerTrigger>Pick</button>
    </div>
  </form>`,
})
class DateRangePickerHost implements SweepHost {
  readonly value = signal<DateRange<Date> | null>({
    start: new Date(2026, 0, 15),
    end: new Date(2026, 0, 20),
  });
  change(): void {
    this.value.set({ start: new Date(2026, 2, 1), end: new Date(2026, 2, 9) });
  }
  current(): unknown {
    return this.value();
  }
}

@Component({
  imports: [ForTimePicker, ForTimePickerTrigger],
  providers: [...provideNativeDateAdapter()],
  template: `<form>
    <div forTimePicker name="at" [(value)]="value">
      <button forTimePickerTrigger>Pick</button>
    </div>
  </form>`,
})
class TimePickerHost implements SweepHost {
  readonly value = signal<Date | null>(new Date(2026, 0, 15, 9, 30));
  change(): void {
    this.value.set(new Date(2026, 0, 15, 17, 45));
  }
  current(): unknown {
    return this.value();
  }
}

const SWEEP: ReadonlyArray<{ readonly name: string; readonly host: Type<SweepHost> }> = [
  { name: 'ForCheckbox', host: CheckboxHost },
  { name: 'ForSwitch', host: SwitchHost },
  { name: 'ForToggle', host: ToggleHost },
  { name: 'ForToggleGroup', host: ToggleGroupHost },
  { name: 'ForRadioGroup', host: RadioGroupHost },
  { name: 'ForSlider', host: SliderHost },
  { name: 'ForListbox', host: ListboxHost },
  { name: 'ForSelect', host: SelectHost },
  { name: 'ForCombobox', host: ComboboxHost },
  { name: 'ForDateField', host: DateFieldHost },
  { name: 'ForTimeField', host: TimeFieldHost },
  { name: 'ForDateRangeField', host: DateRangeFieldHost },
  { name: 'ForTimeRangeField', host: TimeRangeFieldHost },
  { name: 'ForDatePicker', host: DatePickerHost },
  { name: 'ForDateRangePicker', host: DateRangePickerHost },
  { name: 'ForTimePicker', host: TimePickerHost },
];

function submitted(form: HTMLFormElement): Array<[string, FormDataEntryValue]> {
  return [...new FormData(form).entries()];
}

describe('native form reset (#2432)', () => {
  describe('controls that submit through a hidden input', () => {
    it.each(SWEEP)(
      '$name returns to its first-render value and submits it again',
      async ({ host }) => {
        const r = renderHost(host);
        await r.flush();
        const form = r.el.querySelector('form')!;
        const initialValue = r.instance.current();
        const initialSubmission = submitted(form);
        expect(initialSubmission.length).toBeGreaterThan(0);

        r.instance.change();
        await r.flush();
        expect(submitted(form)).not.toEqual(initialSubmission);

        form.reset();
        await r.flush();
        expect(r.instance.current()).toEqual(initialValue);
        expect(submitted(form)).toEqual(initialSubmission);
      },
    );

    it.each(SWEEP)(
      '$name keeps its value through a reset another listener cancels',
      async ({ host }) => {
        const r = renderHost(host);
        await r.flush();
        const form = r.el.querySelector('form')!;
        r.instance.change();
        await r.flush();
        const changedValue = r.instance.current();
        const changedSubmission = submitted(form);

        form.addEventListener('reset', (event) => event.preventDefault(), { once: true });
        form.reset();
        await r.flush();
        expect(r.instance.current()).toEqual(changedValue);
        expect(submitted(form)).toEqual(changedSubmission);
      },
    );

    it('restores the combobox input text with its query', async () => {
      const r = renderHost(ComboboxHost);
      await r.flush();
      const input = r.el.querySelector('input')!;
      expect(input.value).toBe('Apple');

      r.instance.change();
      await r.flush();
      expect(input.value).toBe('Pea');

      r.el.querySelector('form')!.reset();
      await r.flush();
      expect(input.value).toBe('Apple');
      expect(r.instance.query()).toBe('Apple');
    });
  });

  describe('segmented date and time drafts', () => {
    @Component({
      imports: [ForDateField, ForDateFieldSegment, ForDateFieldLiteral],
      providers: [...provideNativeDateAdapter()],
      template: `<form>
        <div
          forDateField
          name="when"
          [(value)]="value"
          [locale]="'en-US'"
          data-testid="group"
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
      </form>`,
    })
    class DateDraftHost {
      readonly value = signal<Date | null>(null);
    }

    @Component({
      imports: [ForTimeField, ForTimeFieldSegment, ForTimeFieldLiteral],
      providers: [...provideNativeDateAdapter()],
      template: `<form>
        <div
          forTimeField
          name="at"
          [(value)]="value"
          [hourCycle]="24"
          data-testid="group"
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
      </form>`,
    })
    class TimeDraftHost {
      readonly value = signal<Date | null>(null);
    }

    @Component({
      imports: [
        ForDateRangeField,
        ForDateRangeFieldStart,
        ForDateRangeFieldEnd,
        ForDateRangeFieldSegment,
        ForDateRangeFieldLiteral,
      ],
      providers: [...provideNativeDateAdapter()],
      template: `<form>
        <div forDateRangeField name="stay" [(value)]="value" [locale]="'en-US'" ariaLabel="Stay">
          <div forDateRangeFieldStart #start="forDateRangeFieldStart">
            @for (seg of start.segments(); track seg.id) {
              @if (seg.isLiteral) {
                <span forDateRangeFieldLiteral>{{ seg.text }}</span>
              } @else {
                <span
                  forDateRangeFieldSegment
                  [segment]="seg.type!"
                  [attr.data-testid]="'start-' + seg.type"
                  >{{ seg.text }}</span
                >
              }
            }
          </div>
          <div forDateRangeFieldEnd #end="forDateRangeFieldEnd">
            @for (seg of end.segments(); track seg.id) {
              @if (seg.isLiteral) {
                <span forDateRangeFieldLiteral>{{ seg.text }}</span>
              } @else {
                <span
                  forDateRangeFieldSegment
                  [segment]="seg.type!"
                  [attr.data-testid]="'end-' + seg.type"
                  >{{ seg.text }}</span
                >
              }
            }
          </div>
        </div>
      </form>`,
    })
    class DateRangeDraftHost {
      readonly value = signal<DateRange<Date> | null>(null);
    }

    @Component({
      imports: [
        ForTimeRangeField,
        ForTimeRangeFieldStart,
        ForTimeRangeFieldEnd,
        ForTimeRangeFieldSegment,
        ForTimeRangeFieldLiteral,
      ],
      providers: [...provideNativeDateAdapter()],
      template: `<form>
        <div forTimeRangeField name="hours" [(value)]="value" [hourCycle]="24" ariaLabel="Hours">
          <div forTimeRangeFieldStart #start="forTimeRangeFieldStart">
            @for (seg of start.segments(); track seg.id) {
              @if (seg.isLiteral) {
                <span forTimeRangeFieldLiteral>{{ seg.text }}</span>
              } @else {
                <span
                  forTimeRangeFieldSegment
                  [segment]="seg.type!"
                  [attr.data-testid]="'start-' + seg.type"
                  >{{ seg.text }}</span
                >
              }
            }
          </div>
          <div forTimeRangeFieldEnd #end="forTimeRangeFieldEnd">
            @for (seg of end.segments(); track seg.id) {
              @if (seg.isLiteral) {
                <span forTimeRangeFieldLiteral>{{ seg.text }}</span>
              } @else {
                <span
                  forTimeRangeFieldSegment
                  [segment]="seg.type!"
                  [attr.data-testid]="'end-' + seg.type"
                  >{{ seg.text }}</span
                >
              }
            }
          </div>
        </div>
      </form>`,
    })
    class TimeRangeDraftHost {
      readonly value = signal<DateRange<Date> | null>(null);
    }

    @Component({
      imports: [ForDatePicker, ForDateField, ForDateFieldSegment, ForDateFieldLiteral],
      providers: [...provideNativeDateAdapter()],
      template: `<form>
        <div forDatePicker anatomy="field" name="when" [(value)]="value" [locale]="'en-US'">
          <div forDateField data-testid="group" #field="forDateField">
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
        </div>
      </form>`,
    })
    class DatePickerDraftHost {
      readonly value = signal<Date | null>(new Date(2026, 0, 15));
    }

    @Component({
      imports: [ForTimePicker, ForTimeField, ForTimeFieldSegment, ForTimeFieldLiteral],
      providers: [...provideNativeDateAdapter()],
      template: `<form>
        <div forTimePicker anatomy="field" name="at" [(value)]="value" [hourCycle]="24">
          <div forTimeField data-testid="group" #field="forTimeField">
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
        </div>
      </form>`,
    })
    class TimePickerDraftHost {
      readonly value = signal<Date | null>(null);
    }

    const at = <T>(r: RenderResult<T>, id: string) =>
      r.query<HTMLElement>(`[data-testid="${id}"]`)!;
    const text = <T>(r: RenderResult<T>, id: string) => at(r, id).textContent?.trim();

    async function typeInto<T>(r: RenderResult<T>, segment: string, digits: string): Promise<void> {
      for (const digit of digits) {
        pressKey(at(r, segment), digit);
      }
      await r.flush();
    }

    async function reset<T>(r: RenderResult<T>): Promise<void> {
      r.el.querySelector('form')!.reset();
      await r.flush();
    }

    it('empties a date field typed after an empty first render, and stops submitting it', async () => {
      const r = renderHost(DateDraftHost);
      await r.flush();
      await typeInto(r, 'month', '06');
      await typeInto(r, 'day', '15');
      await typeInto(r, 'year', '2026');
      const form = r.el.querySelector('form')!;
      expect(r.instance.value()?.getTime()).toBe(new Date(2026, 5, 15).getTime());
      expect(new FormData(form).get('when')).toBe('2026-06-15');

      await reset(r);
      expect(r.instance.value()).toBeNull();
      expect(text(r, 'month')).toBe('mm');
      expect(text(r, 'day')).toBe('dd');
      expect(text(r, 'year')).toBe('yyyy');
      expect(new FormData(form).get('when')).toBeNull();
    });

    it('drops a partly typed date', async () => {
      const r = renderHost(DateDraftHost);
      await r.flush();
      await typeInto(r, 'month', '06');
      expect(r.instance.value()).toBeNull();
      expect(text(r, 'month')).toBe('06');

      await reset(r);
      expect(text(r, 'month')).toBe('mm');
      expect(at(r, 'group').getAttribute('data-empty')).toBe('');
    });

    it('drops a partly typed time', async () => {
      const r = renderHost(TimeDraftHost);
      await r.flush();
      await typeInto(r, 'hour', '09');
      expect(r.instance.value()).toBeNull();
      expect(text(r, 'hour')).toBe('09');

      await reset(r);
      expect(text(r, 'hour')).toBe('hh');
      expect(at(r, 'group').getAttribute('data-empty')).toBe('');
    });

    it('drops a half-entered date range', async () => {
      const r = renderHost(DateRangeDraftHost);
      await r.flush();
      await typeInto(r, 'start-month', '06');
      await typeInto(r, 'start-day', '15');
      await typeInto(r, 'start-year', '2026');
      expect(r.instance.value()).toBeNull();
      expect(text(r, 'start-year')).toBe('2026');

      await reset(r);
      expect(text(r, 'start-month')).toBe('mm');
      expect(text(r, 'start-day')).toBe('dd');
      expect(text(r, 'start-year')).toBe('yyyy');
    });

    it('drops a half-entered time range', async () => {
      const r = renderHost(TimeRangeDraftHost);
      await r.flush();
      await typeInto(r, 'start-hour', '09');
      await typeInto(r, 'start-minute', '30');
      expect(r.instance.value()).toBeNull();
      expect(text(r, 'start-minute')).toBe('30');

      await reset(r);
      expect(text(r, 'start-hour')).toBe('hh');
      expect(text(r, 'start-minute')).toBe('mm');
    });

    it('returns a field-anatomy date picker to its first-render date over a partly typed edit', async () => {
      const r = renderHost(DatePickerDraftHost);
      await r.flush();
      r.instance.value.set(null);
      await r.flush();
      await typeInto(r, 'month', '06');
      expect(text(r, 'month')).toBe('06');

      await reset(r);
      expect(r.instance.value()?.getTime()).toBe(new Date(2026, 0, 15).getTime());
      expect(text(r, 'month')).toBe('01');
      expect(text(r, 'day')).toBe('15');
      expect(text(r, 'year')).toBe('2026');
      expect(new FormData(r.el.querySelector('form')!).get('when')).toBe('2026-01-15');
    });

    it('drops a partly typed time in a field-anatomy time picker', async () => {
      const r = renderHost(TimePickerDraftHost);
      await r.flush();
      await typeInto(r, 'hour', '09');
      expect(text(r, 'hour')).toBe('09');

      await reset(r);
      expect(r.instance.value()).toBeNull();
      expect(text(r, 'hour')).toBe('hh');
      expect(at(r, 'group').getAttribute('data-empty')).toBe('');
    });
  });

  describe('controls that edit a native input', () => {
    @Component({
      imports: [ForInput, ForTextarea, ForSearch, ForNumberInput, ForOtpInput],
      template: `<form>
        <input forInput name="name" [(value)]="name" data-testid="input" />
        <textarea forTextarea name="bio" [(value)]="bio" data-testid="textarea"></textarea>
        <input forSearch name="q" [(value)]="query" data-testid="search" />
        <input forNumberInput name="qty" [(value)]="qty" data-testid="number" />
        <div forOtpInput name="code" [(value)]="code" [length]="4"></div>
      </form>`,
    })
    class TextHost {
      readonly name = signal('Ada');
      readonly bio = signal('Mathematician');
      readonly query = signal('engines');
      readonly qty = signal<number | null>(5);
      readonly code = signal('12');
    }

    it('returns each one to the value it showed at its first render', async () => {
      const r = renderHost(TextHost);
      await r.flush();
      await r.flush();
      const form = r.el.querySelector('form')!;
      const initialSubmission = submitted(form);

      r.instance.name.set('Grace');
      r.instance.bio.set('Admiral');
      r.instance.query.set('compilers');
      r.instance.qty.set(9);
      r.instance.code.set('9876');
      await r.flush();
      expect(submitted(form)).not.toEqual(initialSubmission);

      form.reset();
      await r.flush();
      expect(r.instance.name()).toBe('Ada');
      expect(r.instance.bio()).toBe('Mathematician');
      expect(r.instance.query()).toBe('engines');
      expect(r.instance.qty()).toBe(5);
      expect(r.instance.code()).toBe('12');
      expect(r.query<HTMLInputElement>('[data-testid="input"]')!.value).toBe('Ada');
      expect(r.query<HTMLInputElement>('[data-testid="number"]')!.value).toBe('5');
      expect(submitted(form)).toEqual(initialSubmission);
    });

    it('puts the first-render text back through a reset that changes no value', async () => {
      const r = renderHost(TextHost);
      await r.flush();
      await r.flush();

      r.el.querySelector('form')!.reset();
      await r.flush();
      expect(r.query<HTMLInputElement>('[data-testid="input"]')!.value).toBe('Ada');
      expect(r.query<HTMLTextAreaElement>('[data-testid="textarea"]')!.value).toBe('Mathematician');
      expect(r.query<HTMLInputElement>('[data-testid="search"]')!.value).toBe('engines');
      expect(r.query<HTMLInputElement>('[data-testid="number"]')!.value).toBe('5');
      expect(r.el.querySelector<HTMLInputElement>('[forOtpInput] input')!.value).toBe('12');
    });
  });

  describe('the value attribute (#2465)', () => {
    @Component({
      imports: [ForInput, ForNumberInput, ForOtpInput, ForCombobox, ForComboboxInput],
      template: `<form>
        @if (shown()) {
          <input
            forInput
            type="password"
            name="password"
            [(value)]="password"
            data-testid="password"
          />
          <input forNumberInput name="qty" [(value)]="qty" data-testid="number" />
          <div forOtpInput name="code" [(value)]="code" [length]="4" mask></div>
          <div forCombobox name="fruit" [(value)]="fruit" [(query)]="query">
            <input forComboboxInput aria-label="Fruit" data-testid="combobox" />
          </div>
        }
      </form>`,
    })
    class RemountHost {
      readonly shown = signal(true);
      readonly password = signal('');
      readonly qty = signal<number | null>(null);
      readonly code = signal('');
      readonly fruit = signal<readonly string[]>([]);
      readonly query = signal('');
    }

    function visibleValueAttributes(r: RenderResult<RemountHost>): Array<string | null> {
      return [...r.el.querySelectorAll('input')]
        .filter((input) => input.type !== 'hidden')
        .map((input) => input.getAttribute('value'));
    }

    it('never writes what a control holds at its first render into the value attribute', async () => {
      const r = renderHost(RemountHost);
      await r.flush();
      await r.flush();
      expect(visibleValueAttributes(r)).toEqual([null, null, null, null]);

      r.instance.password.set('secret-password-123');
      r.instance.qty.set(42);
      r.instance.code.set('1234');
      r.instance.query.set('Pea');
      await r.flush();
      expect(visibleValueAttributes(r)).toEqual([null, null, null, null]);

      r.instance.shown.set(false);
      await r.flush();
      r.instance.shown.set(true);
      await r.flush();
      await r.flush();
      const password = r.query<HTMLInputElement>('[data-testid="password"]')!;
      expect(password.value).toBe('secret-password-123');
      expect(r.el.querySelector<HTMLInputElement>('[forOtpInput] input')!.value).toBe('1234');
      expect(visibleValueAttributes(r)).toEqual([null, null, null, null]);

      r.el.querySelector('form')!.reset();
      await r.flush();
      expect(password.value).toBe('secret-password-123');
      expect(r.instance.password()).toBe('secret-password-123');
      expect(r.query<HTMLInputElement>('[data-testid="number"]')!.value).toBe('42');
      expect(r.el.querySelector<HTMLInputElement>('[forOtpInput] input')!.value).toBe('1234');
      expect(r.query<HTMLInputElement>('[data-testid="combobox"]')!.value).toBe('Pea');
      expect(visibleValueAttributes(r)).toEqual([null, null, null, null]);
    });
  });

  describe('adoption (meta-guard)', () => {
    const HIDDEN_INPUT = /\binjectHiddenInput\s*(?:<[^>]*>)?\(/;
    const NATIVE_FORM_RESET = /\binjectNativeFormReset(?:ToInitial)?\(/;
    const DRAFT_HOLDER =
      /\bnew\s+(?:DateFieldEngine|TimeFieldEngine|RangeFieldComposer)\b|\bprovide:\s*FOR_(?:DATE|TIME)_FIELD_HOST\b/;
    const DRAFT_RESET =
      /\binjectNativeFormResetToInitial\(\s*this\.value,\s*\(\)\s*=>\s*this\.reset\(\)/;

    const submittingControls = () =>
      [...LIBRARY_CODE]
        .filter(
          ([path, code]) =>
            !path.startsWith('core/src/form-ui-control/') && HIDDEN_INPUT.test(code),
        )
        .map(([path]) => path)
        .sort();

    it('finds the controls that submit through a hidden input', () => {
      expect(submittingControls()).toEqual(
        expect.arrayContaining([
          'checkbox/src/checkbox.ts',
          'date-field/src/date-field.ts',
          'select/src/select.ts',
          'time-picker/src/time-picker.ts',
        ]),
      );
    });

    it('hands every one of them a native form reset', () => {
      const missing = submittingControls().filter(
        (path) => !NATIVE_FORM_RESET.test(LIBRARY_CODE.get(path)!),
      );
      expect(missing).toEqual([]);
    });

    it('drops the draft after the reset in every control that can hold one', () => {
      const holders = submittingControls().filter((path) =>
        DRAFT_HOLDER.test(LIBRARY_CODE.get(path)!),
      );
      expect(holders.length).toBeGreaterThanOrEqual(6);
      const missing = holders.filter((path) => !DRAFT_RESET.test(LIBRARY_CODE.get(path)!));
      expect(missing).toEqual([]);
    });
  });
});
