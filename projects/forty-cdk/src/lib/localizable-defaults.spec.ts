import { Component, Injectable, inject, signal, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEachOverlayCleanup, installObserverPolyfills, renderHost } from '../test-utils';

import { ForBreadcrumbs, provideForBreadcrumbsDefaults } from 'forty-cdk/breadcrumbs';
import {
  ForCalendar,
  ForCalendarCell,
  ForCalendarGrid,
  provideForCalendarDefaults,
  provideNativeDateAdapter,
} from 'forty-cdk/calendar';
import {
  ForCarousel,
  ForCarouselIndicator,
  ForCarouselIndicators,
  ForCarouselRotationControl,
  ForCarouselSlide,
  ForCarouselTrack,
  ForCarouselViewport,
  provideForCarouselDefaults,
} from 'forty-cdk/carousel';
import {
  ForCombobox,
  ForComboboxChip,
  ForComboboxChipRemove,
  ForComboboxChips,
  ForComboboxClear,
  ForComboboxInput,
  provideForComboboxDefaults,
} from 'forty-cdk/combobox';
import {
  ForDateField,
  ForDateFieldSegment,
  ForDateRangeField,
  ForDateRangeFieldEnd,
  ForDateRangeFieldSegment,
  ForDateRangeFieldStart,
  provideForDateFieldDefaults,
  provideForDateRangeFieldDefaults,
} from 'forty-cdk/date-field';
import { ForDraggable, ForDropList, provideForDragDropDefaults } from 'forty-cdk/drag-drop';
import { ForProgress, provideForProgressDefaults } from 'forty-cdk/progress';
import {
  ForSearch,
  ForSearchClear,
  ForSearchGroup,
  provideForSearchDefaults,
} from 'forty-cdk/search';
import {
  ForStepper,
  ForStepperItem,
  ForStepperList,
  ForStepperProgress,
  ForStepperTrigger,
  provideForStepperDefaults,
} from 'forty-cdk/stepper';
import {
  ForTimeField,
  ForTimeFieldSegment,
  ForTimeRangeField,
  ForTimeRangeFieldEnd,
  ForTimeRangeFieldSegment,
  ForTimeRangeFieldStart,
  provideForTimeFieldDefaults,
  provideForTimeRangeFieldDefaults,
} from 'forty-cdk/time-field';
import {
  ForToast,
  ForToastClose,
  ForToastViewport,
  provideForToastDefaults,
} from 'forty-cdk/toast';
import { LiveAnnouncer } from 'forty-cdk/visually-hidden';

@Injectable({ providedIn: 'root' })
class Lang {
  readonly current = signal<'en' | 'es'>('en');

  pick(en: string, es: string): string {
    return this.current() === 'en' ? en : es;
  }
}

@Component({
  imports: [ForBreadcrumbs],
  providers: [
    provideForBreadcrumbsDefaults(() => {
      const lang = inject(Lang);
      return { label: () => lang.pick('Trail', 'Ruta') };
    }),
  ],
  template: `<nav forBreadcrumbs></nav>`,
})
class BreadcrumbsHost {}

@Component({
  imports: [
    ForCombobox,
    ForComboboxInput,
    ForComboboxChips,
    ForComboboxChip,
    ForComboboxChipRemove,
    ForComboboxClear,
  ],
  providers: [
    provideForComboboxDefaults(() => {
      const lang = inject(Lang);
      return {
        chipsAriaLabel: () => lang.pick('Chosen', 'Elegidos'),
        clearAriaLabel: () => lang.pick('Reset', 'Borrar'),
        chipRemoveLabel: (label) => lang.pick(`Drop ${label}`, `Quitar ${label}`),
      };
    }),
  ],
  template: `
    <div forCombobox multiple [(value)]="value">
      <div forComboboxChips>
        @for (v of value(); track v) {
          <span forComboboxChip [value]="v">
            {{ v }}
            <button forComboboxChipRemove>×</button>
          </span>
        }
        <input forComboboxInput />
      </div>
      <button forComboboxClear>×</button>
    </div>
  `,
})
class ComboboxHost {
  readonly value = signal<readonly string[]>(['Apple']);
}

@Component({
  imports: [ForSearchGroup, ForSearch, ForSearchClear],
  providers: [
    provideForSearchDefaults(() => {
      const lang = inject(Lang);
      return { clearAriaLabel: () => lang.pick('Reset', 'Borrar') };
    }),
  ],
  template: `
    <div forSearchGroup>
      <input forSearch />
      <button forSearchClear>×</button>
    </div>
  `,
})
class SearchHost {}

@Component({
  imports: [ForToastViewport, ForToast, ForToastClose],
  providers: [
    provideForToastDefaults(() => {
      const lang = inject(Lang);
      return {
        viewportAriaLabel: () => lang.pick('Alerts', 'Avisos'),
        closeAriaLabel: () => lang.pick('Dismiss', 'Cerrar'),
      };
    }),
  ],
  template: `
    <div forToastViewport></div>
    <div forToast>
      <button forToastClose>×</button>
    </div>
  `,
})
class ToastHost {}

@Component({
  imports: [
    ForCarousel,
    ForCarouselRotationControl,
    ForCarouselViewport,
    ForCarouselTrack,
    ForCarouselSlide,
    ForCarouselIndicators,
    ForCarouselIndicator,
  ],
  providers: [
    provideForCarouselDefaults(() => {
      const lang = inject(Lang);
      return {
        rotationStartLabel: () => lang.pick('Play', 'Reproducir'),
        roleDescription: () => lang.pick('slideshow', 'carrusel'),
        slideRoleDescription: () => lang.pick('page', 'diapositiva'),
        slideLabel: (position, total) =>
          lang.pick(`${position}/${total}`, `${position} de ${total}`),
        indicatorLabel: (position) => lang.pick(`Show ${position}`, `Mostrar ${position}`),
      };
    }),
  ],
  template: `
    <div forCarousel>
      <button forCarouselRotationControl></button>
      <div forCarouselViewport>
        <div forCarouselTrack>
          <div forCarouselSlide>One</div>
          <div forCarouselSlide>Two</div>
        </div>
      </div>
      <div forCarouselIndicators>
        <button forCarouselIndicator></button>
        <button forCarouselIndicator></button>
      </div>
    </div>
  `,
})
class CarouselHost {}

@Component({
  imports: [ForDateField, ForDateFieldSegment],
  providers: [
    ...provideNativeDateAdapter(),
    provideForDateFieldDefaults(() => {
      const lang = inject(Lang);
      return {
        emptySegmentText: () => lang.pick('Blank', 'Vacío'),
        segmentLabels: { day: () => lang.pick('date', 'día') },
        placeholder: {
          year: () => lang.pick('yyyy', 'aaaa'),
          month: () => lang.pick('mo', 'me'),
        },
      };
    }),
  ],
  template: `
    <div forDateField [locale]="'en-US'" [placeholder]="{ month: 'MM' }" #field="forDateField">
      @for (s of field.segments(); track s.id) {
        @if (!s.isLiteral) {
          <span forDateFieldSegment [segment]="s.type!" [attr.data-part]="s.type">{{
            s.text
          }}</span>
        }
      }
    </div>
  `,
})
class DateFieldHost {}

@Component({
  imports: [
    ForDateRangeField,
    ForDateRangeFieldStart,
    ForDateRangeFieldEnd,
    ForDateRangeFieldSegment,
  ],
  providers: [
    ...provideNativeDateAdapter(),
    provideForDateRangeFieldDefaults(() => {
      const lang = inject(Lang);
      return {
        emptySegmentText: () => lang.pick('Blank', 'Vacío'),
        segmentLabels: { day: () => lang.pick('date', 'día') },
        placeholder: {
          year: () => lang.pick('yyyy', 'aaaa'),
          month: () => lang.pick('mo', 'me'),
        },
        startLabel: () => lang.pick('From', 'Desde'),
        endLabel: () => lang.pick('Until', 'Hasta'),
      };
    }),
  ],
  template: `
    <div forDateRangeField [locale]="'en-US'" [placeholder]="{ month: 'MM' }">
      <div forDateRangeFieldStart #start="forDateRangeFieldStart">
        @for (s of start.segments(); track s.id) {
          @if (!s.isLiteral) {
            <span forDateRangeFieldSegment [segment]="s.type!" [attr.data-part]="s.type">{{
              s.text
            }}</span>
          }
        }
      </div>
      <div forDateRangeFieldEnd #end="forDateRangeFieldEnd">
        @for (s of end.segments(); track s.id) {
          @if (!s.isLiteral) {
            <span forDateRangeFieldSegment [segment]="s.type!">{{ s.text }}</span>
          }
        }
      </div>
    </div>
  `,
})
class DateRangeFieldHost {}

@Component({
  imports: [ForTimeField, ForTimeFieldSegment],
  providers: [
    ...provideNativeDateAdapter(),
    provideForTimeFieldDefaults(() => {
      const lang = inject(Lang);
      return {
        emptySegmentText: () => lang.pick('Blank', 'Vacío'),
        segmentLabels: { hour: () => lang.pick('hours', 'hora') },
        placeholder: {
          hour: () => lang.pick('HH', 'hh'),
          minute: () => lang.pick('mi', 'mn'),
        },
      };
    }),
  ],
  template: `
    <div forTimeField [locale]="'en-US'" [placeholder]="{ minute: 'MM' }" #field="forTimeField">
      @for (s of field.segments(); track s.id) {
        @if (!s.isLiteral) {
          <span forTimeFieldSegment [segment]="s.type!" [attr.data-part]="s.type">{{
            s.text
          }}</span>
        }
      }
    </div>
  `,
})
class TimeFieldHost {}

@Component({
  imports: [
    ForTimeRangeField,
    ForTimeRangeFieldStart,
    ForTimeRangeFieldEnd,
    ForTimeRangeFieldSegment,
  ],
  providers: [
    ...provideNativeDateAdapter(),
    provideForTimeRangeFieldDefaults(() => {
      const lang = inject(Lang);
      return {
        emptySegmentText: () => lang.pick('Blank', 'Vacío'),
        segmentLabels: { hour: () => lang.pick('hours', 'hora') },
        placeholder: {
          hour: () => lang.pick('HH', 'hh'),
          minute: () => lang.pick('mi', 'mn'),
        },
        startLabel: () => lang.pick('From', 'Desde'),
        endLabel: () => lang.pick('Until', 'Hasta'),
      };
    }),
  ],
  template: `
    <div forTimeRangeField [locale]="'en-US'" [placeholder]="{ minute: 'MM' }">
      <div forTimeRangeFieldStart #start="forTimeRangeFieldStart">
        @for (s of start.segments(); track s.id) {
          @if (!s.isLiteral) {
            <span forTimeRangeFieldSegment [segment]="s.type!" [attr.data-part]="s.type">{{
              s.text
            }}</span>
          }
        }
      </div>
      <div forTimeRangeFieldEnd #end="forTimeRangeFieldEnd">
        @for (s of end.segments(); track s.id) {
          @if (!s.isLiteral) {
            <span forTimeRangeFieldSegment [segment]="s.type!">{{ s.text }}</span>
          }
        }
      </div>
    </div>
  `,
})
class TimeRangeFieldHost {}

@Component({
  imports: [ForDropList, ForDraggable],
  providers: [
    provideForDragDropDefaults(() => {
      const lang = inject(Lang);
      return { itemRoleDescription: () => lang.pick('movable', 'movible') };
    }),
  ],
  template: `
    <ul forDropList>
      <li forDraggable [dragData]="'apple'">Apple</li>
    </ul>
  `,
})
class DragDropHost {}

@Component({
  imports: [ForStepper, ForStepperList, ForStepperItem, ForStepperTrigger, ForStepperProgress],
  providers: [
    provideForStepperDefaults(() => {
      const lang = inject(Lang);
      return {
        stepValueText: (current, total) =>
          lang.pick(`Stage ${current}/${total}`, `Paso ${current} de ${total}`),
      };
    }),
  ],
  template: `
    <div forStepper>
      <div forStepperProgress></div>
      <ol forStepperList ariaLabel="Steps">
        <li forStepperItem><button type="button" forStepperTrigger>A</button></li>
        <li forStepperItem><button type="button" forStepperTrigger>B</button></li>
      </ol>
    </div>
  `,
})
class StepperHost {}

@Component({
  imports: [ForCalendar, ForCalendarGrid, ForCalendarCell],
  providers: [
    ...provideNativeDateAdapter(),
    provideForCalendarDefaults(() => {
      const lang = inject(Lang);
      return {
        outsideMonthLabel: (date) => lang.pick(`${date} (other month)`, `${date} (fuera del mes)`),
      };
    }),
  ],
  template: `
    <div forCalendar [value]="value">
      <table forCalendarGrid #grid="forCalendarGrid">
        <tbody>
          @for (week of grid.weeks(); track week.key) {
            <tr>
              @for (cell of week.days; track cell.key) {
                <td forCalendarCell [date]="cell.date"></td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
class CalendarHost {
  readonly value = new Date(2026, 5, 15);
}

@Component({
  imports: [ForProgress],
  providers: [
    provideForProgressDefaults(() => {
      const lang = inject(Lang);
      return {
        announceCompletion: true,
        completeAnnouncement: () => lang.pick('Finished', 'Terminado'),
      };
    }),
  ],
  template: `<div forProgress [value]="value()"></div>`,
})
class ProgressHost {
  readonly value = signal(50);
}

const inDocument = (selector: string) => document.querySelector<HTMLElement>(selector)!;
const attribute = (selector: string, name: string) => () => inDocument(selector).getAttribute(name);
const text = (selector: string) => () => inDocument(selector).textContent!.trim();

const TEXT_KEYS: readonly {
  readonly key: string;
  readonly host: Type<unknown>;
  readonly read: () => string | null;
  readonly en: string;
  readonly es: string;
}[] = [
  {
    key: 'ForBreadcrumbsDefaults.label',
    host: BreadcrumbsHost,
    read: attribute('[forBreadcrumbs]', 'aria-label'),
    en: 'Trail',
    es: 'Ruta',
  },
  {
    key: 'ForComboboxDefaults.chipsAriaLabel',
    host: ComboboxHost,
    read: attribute('[forComboboxChips]', 'aria-label'),
    en: 'Chosen',
    es: 'Elegidos',
  },
  {
    key: 'ForComboboxDefaults.clearAriaLabel',
    host: ComboboxHost,
    read: attribute('[forComboboxClear]', 'aria-label'),
    en: 'Reset',
    es: 'Borrar',
  },
  {
    key: 'ForComboboxDefaults.chipRemoveLabel',
    host: ComboboxHost,
    read: attribute('[forComboboxChipRemove]', 'aria-label'),
    en: 'Drop Apple',
    es: 'Quitar Apple',
  },
  {
    key: 'ForSearchDefaults.clearAriaLabel',
    host: SearchHost,
    read: attribute('[forSearchClear]', 'aria-label'),
    en: 'Reset',
    es: 'Borrar',
  },
  {
    key: 'ForToastDefaults.viewportAriaLabel',
    host: ToastHost,
    read: attribute('[forToastViewport]', 'aria-label'),
    en: 'Alerts',
    es: 'Avisos',
  },
  {
    key: 'ForToastDefaults.closeAriaLabel',
    host: ToastHost,
    read: attribute('[forToastClose]', 'aria-label'),
    en: 'Dismiss',
    es: 'Cerrar',
  },
  {
    key: 'ForCarouselDefaults.rotationStartLabel',
    host: CarouselHost,
    read: attribute('[forCarouselRotationControl]', 'aria-label'),
    en: 'Play',
    es: 'Reproducir',
  },
  {
    key: 'ForCarouselDefaults.roleDescription',
    host: CarouselHost,
    read: attribute('[forCarousel]', 'aria-roledescription'),
    en: 'slideshow',
    es: 'carrusel',
  },
  {
    key: 'ForCarouselDefaults.slideRoleDescription',
    host: CarouselHost,
    read: attribute('[forCarouselSlide]', 'aria-roledescription'),
    en: 'page',
    es: 'diapositiva',
  },
  {
    key: 'ForCarouselDefaults.slideLabel',
    host: CarouselHost,
    read: attribute('[forCarouselSlide]', 'aria-label'),
    en: '1/2',
    es: '1 de 2',
  },
  {
    key: 'ForCarouselDefaults.indicatorLabel',
    host: CarouselHost,
    read: attribute('[forCarouselIndicator]', 'aria-label'),
    en: 'Show 1',
    es: 'Mostrar 1',
  },
  {
    key: 'ForDateFieldDefaults.emptySegmentText',
    host: DateFieldHost,
    read: attribute('[data-part="day"]', 'aria-valuetext'),
    en: 'Blank',
    es: 'Vacío',
  },
  {
    key: 'ForDateFieldDefaults.segmentLabels',
    host: DateFieldHost,
    read: attribute('[data-part="day"]', 'aria-label'),
    en: 'date',
    es: 'día',
  },
  {
    key: 'ForDateFieldDefaults.placeholder',
    host: DateFieldHost,
    read: text('[data-part="year"]'),
    en: 'yyyy',
    es: 'aaaa',
  },
  {
    key: 'ForDateRangeFieldDefaults.emptySegmentText',
    host: DateRangeFieldHost,
    read: attribute('[data-part="day"]', 'aria-valuetext'),
    en: 'Blank',
    es: 'Vacío',
  },
  {
    key: 'ForDateRangeFieldDefaults.segmentLabels',
    host: DateRangeFieldHost,
    read: attribute('[data-part="day"]', 'aria-label'),
    en: 'date',
    es: 'día',
  },
  {
    key: 'ForDateRangeFieldDefaults.placeholder',
    host: DateRangeFieldHost,
    read: text('[data-part="year"]'),
    en: 'yyyy',
    es: 'aaaa',
  },
  {
    key: 'ForDateRangeFieldDefaults.startLabel',
    host: DateRangeFieldHost,
    read: attribute('[forDateRangeFieldStart]', 'aria-label'),
    en: 'From',
    es: 'Desde',
  },
  {
    key: 'ForDateRangeFieldDefaults.endLabel',
    host: DateRangeFieldHost,
    read: attribute('[forDateRangeFieldEnd]', 'aria-label'),
    en: 'Until',
    es: 'Hasta',
  },
  {
    key: 'ForTimeFieldDefaults.emptySegmentText',
    host: TimeFieldHost,
    read: attribute('[data-part="hour"]', 'aria-valuetext'),
    en: 'Blank',
    es: 'Vacío',
  },
  {
    key: 'ForTimeFieldDefaults.segmentLabels',
    host: TimeFieldHost,
    read: attribute('[data-part="hour"]', 'aria-label'),
    en: 'hours',
    es: 'hora',
  },
  {
    key: 'ForTimeFieldDefaults.placeholder',
    host: TimeFieldHost,
    read: text('[data-part="hour"]'),
    en: 'HH',
    es: 'hh',
  },
  {
    key: 'ForTimeRangeFieldDefaults.emptySegmentText',
    host: TimeRangeFieldHost,
    read: attribute('[data-part="hour"]', 'aria-valuetext'),
    en: 'Blank',
    es: 'Vacío',
  },
  {
    key: 'ForTimeRangeFieldDefaults.segmentLabels',
    host: TimeRangeFieldHost,
    read: attribute('[data-part="hour"]', 'aria-label'),
    en: 'hours',
    es: 'hora',
  },
  {
    key: 'ForTimeRangeFieldDefaults.placeholder',
    host: TimeRangeFieldHost,
    read: text('[data-part="hour"]'),
    en: 'HH',
    es: 'hh',
  },
  {
    key: 'ForTimeRangeFieldDefaults.startLabel',
    host: TimeRangeFieldHost,
    read: attribute('[forTimeRangeFieldStart]', 'aria-label'),
    en: 'From',
    es: 'Desde',
  },
  {
    key: 'ForTimeRangeFieldDefaults.endLabel',
    host: TimeRangeFieldHost,
    read: attribute('[forTimeRangeFieldEnd]', 'aria-label'),
    en: 'Until',
    es: 'Hasta',
  },
  {
    key: 'ForDragDropDefaults.itemRoleDescription',
    host: DragDropHost,
    read: attribute('[forDraggable]', 'aria-roledescription'),
    en: 'movable',
    es: 'movible',
  },
  {
    key: 'ForStepperDefaults.stepValueText',
    host: StepperHost,
    read: attribute('[forStepperProgress]', 'aria-valuetext'),
    en: 'Stage 1/2',
    es: 'Paso 1 de 2',
  },
  {
    key: 'ForCalendarDefaults.outsideMonthLabel',
    host: CalendarHost,
    read: () => {
      const label = attribute('[data-outside-month]', 'aria-label')()!;
      return label.slice(label.indexOf(' ('));
    },
    en: ' (other month)',
    es: ' (fuera del mes)',
  },
];

const PLACEHOLDER_PRECEDENCE: readonly {
  readonly root: string;
  readonly host: Type<unknown>;
  readonly own: string;
}[] = [
  { root: '[forDateField]', host: DateFieldHost, own: '[data-part="month"]' },
  { root: '[forDateRangeField]', host: DateRangeFieldHost, own: '[data-part="month"]' },
  { root: '[forTimeField]', host: TimeFieldHost, own: '[data-part="minute"]' },
  { root: '[forTimeRangeField]', host: TimeRangeFieldHost, own: '[data-part="minute"]' },
];

describe('localizable defaults follow a runtime language change', () => {
  let restoreObservers: () => void;
  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());
  afterEachOverlayCleanup();

  for (const { key, host, read, en, es } of TEXT_KEYS) {
    it(`${key}: a function built by a factory that injects re-renders when its signal changes`, async () => {
      const r = renderHost(host);
      await r.flush();
      expect(read()).toBe(en);

      TestBed.inject(Lang).current.set('es');
      await r.flush();

      expect(read()).toBe(es);
    });
  }

  for (const { root, host, own } of PLACEHOLDER_PRECEDENCE) {
    it(`${root}: its own [placeholder] wins over the scope key for the parts it names`, async () => {
      const r = renderHost(host);
      await r.flush();
      expect(text(own)()).toBe('MM');

      TestBed.inject(Lang).current.set('es');
      await r.flush();

      expect(text(own)()).toBe('MM');
    });
  }

  it('ForProgressDefaults.completeAnnouncement: the announcement reads the language current when it fires', async () => {
    const r = renderHost(ProgressHost);
    await r.flush();
    const announce = vi.spyOn(TestBed.inject(LiveAnnouncer), 'announce');

    TestBed.inject(Lang).current.set('es');
    await r.flush();
    r.instance.value.set(100);
    await r.flush();

    expect(announce).toHaveBeenCalledExactlyOnceWith('Terminado', 'polite');
  });
});

@Component({
  imports: [
    ForBreadcrumbs,
    ForCombobox,
    ForComboboxChips,
    ForComboboxClear,
    ForComboboxInput,
    ForSearchGroup,
    ForSearch,
    ForSearchClear,
    ForToastViewport,
    ForToast,
    ForToastClose,
    ForCarousel,
    ForCarouselRotationControl,
    ForCarouselViewport,
    ForCarouselTrack,
    ForCarouselSlide,
  ],
  providers: [
    provideForBreadcrumbsDefaults(() => {
      const lang = inject(Lang);
      return { label: () => lang.pick('Trail', 'Ruta') };
    }),
    provideForComboboxDefaults(() => {
      const lang = inject(Lang);
      return {
        chipsAriaLabel: () => lang.pick('Chosen', 'Elegidos'),
        clearAriaLabel: () => lang.pick('Reset', 'Borrar'),
      };
    }),
    provideForSearchDefaults(() => {
      const lang = inject(Lang);
      return { clearAriaLabel: () => lang.pick('Reset', 'Borrar') };
    }),
    provideForToastDefaults(() => {
      const lang = inject(Lang);
      return {
        viewportAriaLabel: () => lang.pick('Alerts', 'Avisos'),
        closeAriaLabel: () => lang.pick('Dismiss', 'Cerrar'),
      };
    }),
    provideForCarouselDefaults(() => {
      const lang = inject(Lang);
      return { rotationStartLabel: () => lang.pick('Play', 'Reproducir') };
    }),
  ],
  template: `
    <nav forBreadcrumbs [ariaLabel]="label()"></nav>
    <div forCombobox multiple>
      <div forComboboxChips [ariaLabel]="label()"><input forComboboxInput /></div>
      <button forComboboxClear [ariaLabel]="label()">×</button>
    </div>
    <div forSearchGroup>
      <input forSearch />
      <button forSearchClear [ariaLabel]="label()">×</button>
    </div>
    <div forToastViewport [ariaLabel]="label()"></div>
    <div forToast>
      <button forToastClose [ariaLabel]="label()">×</button>
    </div>
    <div forCarousel>
      <button forCarouselRotationControl [startLabel]="label()"></button>
      <div forCarouselViewport>
        <div forCarouselTrack><div forCarouselSlide>One</div></div>
      </div>
    </div>
  `,
})
class InstanceLabelHost {
  readonly label = signal<string | null | undefined>(undefined);
}

const INSTANCE_LABELS: readonly {
  readonly piece: string;
  readonly en: string;
  readonly es: string;
}[] = [
  { piece: '[forBreadcrumbs]', en: 'Trail', es: 'Ruta' },
  { piece: '[forComboboxChips]', en: 'Chosen', es: 'Elegidos' },
  { piece: '[forComboboxClear]', en: 'Reset', es: 'Borrar' },
  { piece: '[forSearchClear]', en: 'Reset', es: 'Borrar' },
  { piece: '[forToastViewport]', en: 'Alerts', es: 'Avisos' },
  { piece: '[forToastClose]', en: 'Dismiss', es: 'Cerrar' },
  { piece: '[forCarouselRotationControl]', en: 'Play', es: 'Reproducir' },
];

describe('a per-instance label over a function-valued scope key', () => {
  let restoreObservers: () => void;
  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());
  afterEachOverlayCleanup();

  for (const { piece, en, es } of INSTANCE_LABELS) {
    it(`${piece}: an unbound input follows the key, a string wins over it, and null drops the attribute`, async () => {
      const r = renderHost(InstanceLabelHost);
      await r.flush();
      const name = () => inDocument(piece).getAttribute('aria-label');
      expect(name()).toBe(en);

      TestBed.inject(Lang).current.set('es');
      await r.flush();
      expect(name()).toBe(es);

      r.instance.label.set('Own');
      await r.flush();
      expect(name()).toBe('Own');

      TestBed.inject(Lang).current.set('en');
      await r.flush();
      expect(name()).toBe('Own');

      r.instance.label.set(null);
      await r.flush();
      expect(inDocument(piece).hasAttribute('aria-label')).toBe(false);
    });
  }
});
