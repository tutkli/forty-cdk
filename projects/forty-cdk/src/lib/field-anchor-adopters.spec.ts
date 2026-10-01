import {
  ChangeDetectionStrategy,
  Component,
  signal,
  type Type,
  type WritableSignal,
} from '@angular/core';

import type { MockInstance } from 'vitest';

import {
  afterEachOverlayCleanup,
  flushPositioning,
  type RenderResult,
  renderHost,
} from '../test-utils';

import { provideNativeDateAdapter } from 'forty-cdk/shared';
import {
  ForCombobox,
  ForComboboxAnchor,
  ForComboboxContent,
  ForComboboxInput,
} from 'forty-cdk/combobox';
import {
  ForDatePicker,
  ForDatePickerAnchor,
  ForDatePickerContent,
  ForDatePickerTrigger,
} from 'forty-cdk/date-picker';
import { ForField, ForFieldAnchor, ForFieldBoundary, ForLabel } from 'forty-cdk/field';
import { ForPopover, ForPopoverContent, ForPopoverTrigger } from 'forty-cdk/popover';
import { ForSelect, ForSelectAnchor, ForSelectContent, ForSelectTrigger } from 'forty-cdk/select';
import {
  ForTimePicker,
  ForTimePickerAnchor,
  ForTimePickerContent,
  ForTimePickerTrigger,
} from 'forty-cdk/time-picker';

type Mode = 'field-anchor' | 'own-anchor' | 'no-field-anchor' | 'boundary';

const CANDIDATES = ['box', 'own', 'control'] as const;

@Component({
  selector: 'test-form-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [ForField],
  imports: [ForFieldAnchor],
  template: `
    <ng-content select="[forLabel]" />
    <div forFieldAnchor data-test-id="box">
      <ng-content />
    </div>
  `,
})
class TestFormField {}

interface AnchorHost {
  readonly mode: WritableSignal<Mode>;
  readonly open: WritableSignal<boolean>;
}

@Component({
  imports: [
    TestFormField,
    ForField,
    ForLabel,
    ForFieldBoundary,
    ForSelect,
    ForSelectAnchor,
    ForSelectTrigger,
    ForSelectContent,
  ],
  template: `
    @switch (mode()) {
      @case ('field-anchor') {
        <test-form-field>
          <span forLabel>Fruit</span>
          <div forSelect [(open)]="open">
            <button forSelectTrigger data-test-id="control">Pick</button>
            @if (open()) {
              <div forSelectContent data-test-id="content"></div>
            }
          </div>
        </test-form-field>
      }
      @case ('own-anchor') {
        <test-form-field>
          <div forSelect [(open)]="open">
            <div forSelectAnchor data-test-id="own">
              <button forSelectTrigger data-test-id="control">Pick</button>
            </div>
            @if (open()) {
              <div forSelectContent data-test-id="content"></div>
            }
          </div>
        </test-form-field>
      }
      @case ('no-field-anchor') {
        <div forField>
          <div forSelect [(open)]="open">
            <button forSelectTrigger data-test-id="control">Pick</button>
            @if (open()) {
              <div forSelectContent data-test-id="content"></div>
            }
          </div>
        </div>
      }
      @case ('boundary') {
        <test-form-field>
          <div forSelect forFieldBoundary [(open)]="open">
            <button forSelectTrigger data-test-id="control">Pick</button>
            @if (open()) {
              <div forSelectContent data-test-id="content"></div>
            }
          </div>
        </test-form-field>
      }
    }
  `,
})
class SelectHost implements AnchorHost {
  readonly mode = signal<Mode>('field-anchor');
  readonly open = signal(false);
}

@Component({
  imports: [
    TestFormField,
    ForField,
    ForLabel,
    ForFieldBoundary,
    ForCombobox,
    ForComboboxAnchor,
    ForComboboxInput,
    ForComboboxContent,
  ],
  template: `
    @switch (mode()) {
      @case ('field-anchor') {
        <test-form-field>
          <span forLabel>Fruit</span>
          <div forCombobox [(open)]="open">
            <input forComboboxInput data-test-id="control" />
            @if (open()) {
              <div forComboboxContent data-test-id="content"></div>
            }
          </div>
        </test-form-field>
      }
      @case ('own-anchor') {
        <test-form-field>
          <div forCombobox [(open)]="open">
            <div forComboboxAnchor data-test-id="own">
              <input forComboboxInput data-test-id="control" />
            </div>
            @if (open()) {
              <div forComboboxContent data-test-id="content"></div>
            }
          </div>
        </test-form-field>
      }
      @case ('no-field-anchor') {
        <div forField>
          <div forCombobox [(open)]="open">
            <input forComboboxInput data-test-id="control" />
            @if (open()) {
              <div forComboboxContent data-test-id="content"></div>
            }
          </div>
        </div>
      }
      @case ('boundary') {
        <test-form-field>
          <div forCombobox forFieldBoundary [(open)]="open">
            <input forComboboxInput data-test-id="control" />
            @if (open()) {
              <div forComboboxContent data-test-id="content"></div>
            }
          </div>
        </test-form-field>
      }
    }
  `,
})
class ComboboxHost implements AnchorHost {
  readonly mode = signal<Mode>('field-anchor');
  readonly open = signal(false);
}

@Component({
  imports: [
    TestFormField,
    ForField,
    ForLabel,
    ForFieldBoundary,
    ForDatePicker,
    ForDatePickerAnchor,
    ForDatePickerTrigger,
    ForDatePickerContent,
  ],
  providers: [...provideNativeDateAdapter()],
  template: `
    @switch (mode()) {
      @case ('field-anchor') {
        <test-form-field>
          <span forLabel>Date</span>
          <div forDatePicker [(open)]="open">
            <button forDatePickerTrigger data-test-id="control">Pick</button>
            @if (open()) {
              <div forDatePickerContent data-test-id="content"></div>
            }
          </div>
        </test-form-field>
      }
      @case ('own-anchor') {
        <test-form-field>
          <div forDatePicker [(open)]="open">
            <div forDatePickerAnchor data-test-id="own">
              <button forDatePickerTrigger data-test-id="control">Pick</button>
            </div>
            @if (open()) {
              <div forDatePickerContent data-test-id="content"></div>
            }
          </div>
        </test-form-field>
      }
      @case ('no-field-anchor') {
        <div forField>
          <div forDatePicker [(open)]="open">
            <button forDatePickerTrigger data-test-id="control">Pick</button>
            @if (open()) {
              <div forDatePickerContent data-test-id="content"></div>
            }
          </div>
        </div>
      }
      @case ('boundary') {
        <test-form-field>
          <div forDatePicker forFieldBoundary [(open)]="open">
            <button forDatePickerTrigger data-test-id="control">Pick</button>
            @if (open()) {
              <div forDatePickerContent data-test-id="content"></div>
            }
          </div>
        </test-form-field>
      }
    }
  `,
})
class DatePickerHost implements AnchorHost {
  readonly mode = signal<Mode>('field-anchor');
  readonly open = signal(false);
}

@Component({
  imports: [
    TestFormField,
    ForField,
    ForLabel,
    ForFieldBoundary,
    ForTimePicker,
    ForTimePickerAnchor,
    ForTimePickerTrigger,
    ForTimePickerContent,
  ],
  providers: [...provideNativeDateAdapter()],
  template: `
    @switch (mode()) {
      @case ('field-anchor') {
        <test-form-field>
          <span forLabel>Time</span>
          <div forTimePicker [(open)]="open">
            <button forTimePickerTrigger data-test-id="control">Pick</button>
            @if (open()) {
              <div forTimePickerContent data-test-id="content"></div>
            }
          </div>
        </test-form-field>
      }
      @case ('own-anchor') {
        <test-form-field>
          <div forTimePicker [(open)]="open">
            <div forTimePickerAnchor data-test-id="own">
              <button forTimePickerTrigger data-test-id="control">Pick</button>
            </div>
            @if (open()) {
              <div forTimePickerContent data-test-id="content"></div>
            }
          </div>
        </test-form-field>
      }
      @case ('no-field-anchor') {
        <div forField>
          <div forTimePicker [(open)]="open">
            <button forTimePickerTrigger data-test-id="control">Pick</button>
            @if (open()) {
              <div forTimePickerContent data-test-id="content"></div>
            }
          </div>
        </div>
      }
      @case ('boundary') {
        <test-form-field>
          <div forTimePicker forFieldBoundary [(open)]="open">
            <button forTimePickerTrigger data-test-id="control">Pick</button>
            @if (open()) {
              <div forTimePickerContent data-test-id="content"></div>
            }
          </div>
        </test-form-field>
      }
    }
  `,
})
class TimePickerHost implements AnchorHost {
  readonly mode = signal<Mode>('field-anchor');
  readonly open = signal(false);
}

@Component({
  imports: [
    TestFormField,
    ForPopover,
    ForPopoverTrigger,
    ForPopoverContent,
    ForSelect,
    ForSelectTrigger,
    ForSelectContent,
  ],
  template: `
    <test-form-field>
      <div forPopover [(open)]="popoverOpen">
        <button forPopoverTrigger>More</button>
        @if (popoverOpen()) {
          <div forPopoverContent>
            <div forSelect [(open)]="open">
              <button forSelectTrigger data-test-id="control">Pick</button>
              @if (open()) {
                <div forSelectContent data-test-id="content"></div>
              }
            </div>
          </div>
        }
      </div>
    </test-form-field>
  `,
})
class OverlaySurfaceHost {
  readonly popoverOpen = signal(true);
  readonly open = signal(false);
}

@Component({
  imports: [ForField, ForFieldAnchor, ForSelect, ForSelectTrigger, ForSelectContent],
  template: `
    <div forField>
      @if (anchored()) {
        <div forFieldAnchor data-test-id="box"></div>
      }
      @if (showControl()) {
        <div forSelect [(open)]="open">
          <button forSelectTrigger data-test-id="control">Pick</button>
          @if (open()) {
            <div forSelectContent data-test-id="content"></div>
          }
        </div>
      }
    </div>
  `,
})
class TeardownHost {
  readonly anchored = signal(true);
  readonly showControl = signal(true);
  readonly open = signal(false);
}

const ROOTS: readonly (readonly [string, Type<AnchorHost>])[] = [
  ['[forSelect]', SelectHost],
  ['[forCombobox]', ComboboxHost],
  ['[forDatePicker]', DatePickerHost],
  ['[forTimePicker]', TimePickerHost],
];

type Candidate = (typeof CANDIDATES)[number];

function watchReferenceReads(): () => readonly Candidate[] {
  const spies: [Candidate, MockInstance][] = [];
  for (const id of CANDIDATES) {
    const el = document.querySelector<HTMLElement>(`[data-test-id="${id}"]`);
    if (el) {
      spies.push([id, vi.spyOn(el, 'getBoundingClientRect')]);
    }
  }
  return () => spies.filter(([, spy]) => spy.mock.calls.length > 0).map(([id]) => id);
}

async function openAndReadReference(
  r: RenderResult<{ readonly open: WritableSignal<boolean> }>,
): Promise<readonly Candidate[]> {
  const reads = watchReferenceReads();
  r.instance.open.set(true);
  await flushPositioning(r.fixture);
  expect(document.querySelector('[data-test-id="content"]')).not.toBeNull();
  return reads();
}

describe('[forFieldAnchor] adopters', () => {
  afterEachOverlayCleanup();

  describe.each(ROOTS)('%s', (_, host) => {
    async function referenceIn(mode: Mode): Promise<readonly Candidate[]> {
      const r = renderHost(host);
      r.instance.mode.set(mode);
      await r.flush();
      return openAndReadReference(r);
    }

    it('positions the panel against the [forFieldAnchor] of the field it is projected into', async () => {
      expect(await referenceIn('field-anchor')).toEqual(['box']);
    });

    it('lets its own anchor win over the field anchor', async () => {
      expect(await referenceIn('own-anchor')).toEqual(['own']);
    });

    it('keeps positioning against its trigger or input when the field has no [forFieldAnchor]', async () => {
      expect(await referenceIn('no-field-anchor')).toEqual(['control']);
    });

    it('still aligns to the field anchor behind a [forFieldBoundary]', async () => {
      expect(await referenceIn('boundary')).toEqual(['box']);
    });
  });

  it('ignores the field anchor from inside an overlay surface', async () => {
    const r = renderHost(OverlaySurfaceHost);
    await flushPositioning(r.fixture);

    expect(await openAndReadReference(r)).toEqual(['control']);
  });

  it('falls back to the trigger once the anchor element is destroyed', async () => {
    const r = renderHost(TeardownHost);
    expect(await openAndReadReference(r)).toEqual(['box']);

    r.instance.open.set(false);
    r.instance.anchored.set(false);
    await r.flush();

    expect(await openAndReadReference(r)).toEqual(['control']);
  });

  it('anchors a remounted control to the same field box after the first one is destroyed', async () => {
    const r = renderHost(TeardownHost);
    r.instance.showControl.set(false);
    await r.flush();
    r.instance.showControl.set(true);
    await r.flush();

    expect(await openAndReadReference(r)).toEqual(['box']);
  });
});
