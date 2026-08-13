import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { form, FormField, required } from '@angular/forms/signals';

import { afterEachOverlayCleanup, flush, pressKey, renderHost } from '../../src/test-utils';
import {
  assertDataStateContract,
  assertDismissibleLayerContract,
  assertFormControlContract,
  assertOverlayTriggerAriaContract,
  type DismissibleLayerMountOptions,
  type FormControlMountResult,
} from '../../src/test-utils/contract';
import { type DateAdapter, FOR_DATE_ADAPTER, type VetoableNativeEvent } from 'forty-cdk/core';
import { provideNativeDateAdapter } from 'forty-cdk/calendar';
import {
  ForTimePicker,
  ForTimePickerAnchor,
  ForTimePickerContent,
  ForTimePickerOption,
  ForTimePickerTrigger,
  ForTimePickerValue,
} from './public-api';

const BASE_IMPORTS = [
  ForTimePicker,
  ForTimePickerTrigger,
  ForTimePickerContent,
  ForTimePickerOption,
];

@Component({
  imports: [...BASE_IMPORTS, ForTimePickerValue],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div
      forTimePicker
      [(value)]="value"
      [(open)]="open"
      [step]="step()"
      [granularity]="granularity()"
      [hourCycle]="hourCycle()"
      [minTime]="minTime()"
      [maxTime]="maxTime()"
      [closeOnSelect]="closeOnSelect()"
      [disabled]="disabled()"
      [readonly]="readonly()"
      [loop]="loop()"
      [locale]="locale()"
      #picker="forTimePicker"
    >
      <button data-testid="trigger" forTimePickerTrigger>
        <span forTimePickerValue [placeholder]="placeholder()"></span>
      </button>
      @if (open()) {
        <div data-testid="content" forTimePickerContent>
          @for (slot of picker.slots(); track slot.id) {
            <div
              forTimePickerOption
              [value]="slot.value"
              [disabled]="slot.disabled"
              [attr.data-testid]="'slot-' + slot.id"
            >
              {{ slot.label }}
            </div>
          }
        </div>
      }
    </div>
  `,
})
class TimePickerHost {
  readonly value = signal<Date | null>(null);
  readonly open = signal(false);
  readonly step = signal(30);
  readonly granularity = signal<'hour' | 'minute' | 'second'>('minute');
  readonly hourCycle = signal<12 | 24 | null>(24);
  readonly minTime = signal<Date | null>(null);
  readonly maxTime = signal<Date | null>(null);
  readonly closeOnSelect = signal(true);
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly loop = signal(true);
  readonly placeholder = signal('Pick a time');
  readonly locale = signal<string | null>(null);
}

@Component({
  imports: BASE_IMPORTS,
  providers: [...provideNativeDateAdapter()],
  template: `
    <div
      forTimePicker
      [(open)]="open"
      [step]="60"
      [modal]="modal()"
      [dismissible]="dismissible()"
      (escapeKeyDown)="onEscape($event)"
      (pointerDownOutside)="onPointer($event)"
      (focusOutside)="onFocus($event)"
      (interactOutside)="onInteract($event)"
      #picker="forTimePicker"
    >
      <button forTimePickerTrigger>Open</button>
      @if (open()) {
        <div forTimePickerContent>
          @for (slot of picker.slots(); track slot.id) {
            <div forTimePickerOption [value]="slot.value" [disabled]="slot.disabled">
              {{ slot.label }}
            </div>
          }
        </div>
      }
    </div>
  `,
})
class TimePickerDismissContractHost {
  readonly open = signal(false);
  readonly modal = signal(false);
  readonly dismissible = signal(true);
  escapeVeto = false;
  pointerVeto = false;
  eCount = 0;
  pCount = 0;
  fCount = 0;
  iCount = 0;
  onEscape(event: VetoableNativeEvent<KeyboardEvent>): void {
    this.eCount += 1;
    if (this.escapeVeto) event.preventDefault();
  }
  onPointer(event: VetoableNativeEvent<PointerEvent>): void {
    this.pCount += 1;
    if (this.pointerVeto) event.preventDefault();
  }
  onFocus(_event: VetoableNativeEvent<FocusEvent>): void {
    this.fCount += 1;
  }
  onInteract(_event: VetoableNativeEvent<PointerEvent | FocusEvent>): void {
    this.iCount += 1;
  }
}

function getTrigger(): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>('[forTimePickerTrigger]')!;
}

function getContent(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[forTimePickerContent]');
}

@Component({
  imports: [ForTimePicker, ForTimePickerTrigger],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div
      forTimePicker
      [(value)]="value"
      [disabled]="isDisabled()"
      [readonly]="isReadonly()"
      [required]="isRequired()"
    >
      <button forTimePickerTrigger>Open</button>
    </div>
  `,
})
class TimePickerFormControlHost {
  readonly value = signal<Date | null>(null);
  readonly isDisabled = signal(false);
  readonly isReadonly = signal(false);
  readonly isRequired = signal(false);
}

function getSlot(slotId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-testid="slot-${slotId}"]`);
}

function getSlots(): NodeListOf<HTMLElement> {
  return document.querySelectorAll<HTMLElement>('[forTimePickerOption]');
}

describe('ForTimePicker', () => {
  afterEachOverlayCleanup();

  assertDataStateContract(
    {
      vocabulary: ['closed', 'open'],
      mount: () => {
        const r = renderHost(TimePickerHost);
        return {
          pieces: () => ({
            root: r.query<HTMLElement>('[forTimePicker]'),
            trigger: r.query<HTMLElement>('[forTimePickerTrigger]'),
            content: getContent(),
          }),
          setState: (state) => r.instance.open.set(state === 'open'),
          flush: r.flush,
        };
      },
    },
    { label: 'overlay' },
  );

  assertDataStateContract(
    {
      vocabulary: ['checked', 'unchecked'],
      mount: async () => {
        const r = renderHost(TimePickerHost);
        r.instance.open.set(true);
        await r.flush();
        return {
          pieces: () => ({ option: getSlot('slot-32400') }),
          setState: (state) =>
            r.instance.value.set(new Date(2000, 0, 1, state === 'checked' ? 9 : 0, 0, 0)),
          flush: r.flush,
        };
      },
    },
    { label: 'options' },
  );

  // Two shells, two layers: `[modal]` swaps `injectOverlayShell` for
  // `injectModalShell`, which owns the close decision Escape's consumer channel
  // owns on the anchored path. Nothing asserted the modal one before
  // [#1655](https://github.com/tutkli/forty-cdk/issues/1655) — this spec had no
  // `modal` mention at all.
  const mountDismissContract =
    (modal: boolean) =>
    async (options: DismissibleLayerMountOptions = {}) => {
      const r = renderHost(TimePickerDismissContractHost);
      r.instance.modal.set(modal);
      r.instance.dismissible.set(options.dismissible ?? true);
      r.instance.escapeVeto = options.escapeVeto ?? false;
      r.instance.pointerVeto = options.pointerVeto ?? false;
      r.instance.open.set(true);
      await flush(r.fixture);
      return {
        flush: () => flush(r.fixture),
        isOpen: () => r.instance.open(),
        escapeCount: () => r.instance.eCount,
        pointerOutsideCount: () => r.instance.pCount,
        focusOutsideCount: () => r.instance.fCount,
        interactOutsideCount: () => r.instance.iCount,
      };
    };

  assertDismissibleLayerContract({ mount: mountDismissContract(false) }, { label: 'anchored' });
  assertDismissibleLayerContract({ mount: mountDismissContract(true) }, { label: 'modal' });

  assertFormControlContract(
    () => {
      const r = renderHost(TimePickerFormControlHost);
      const result: FormControlMountResult = {
        control: r.query<HTMLButtonElement>('[forTimePickerTrigger]')!,
        flush: r.flush,
        setFlag: (flag, flagValue) => {
          switch (flag) {
            case 'disabled':
              r.instance.isDisabled.set(flagValue);
              return;
            case 'readonly':
              r.instance.isReadonly.set(flagValue);
              return;
            case 'required':
              r.instance.isRequired.set(flagValue);
              return;
          }
        },
      };
      return result;
    },
    { flags: ['disabled', 'readonly', 'required'] },
  );

  assertOverlayTriggerAriaContract(
    {
      mount: async () => {
        const r = renderHost(TimePickerHost);
        await flush(r.fixture);
        return {
          trigger: getTrigger(),
          flush: () => flush(r.fixture),
          open: () => r.instance.open.set(true),
          surface: () => getContent()!,
        };
      },
    },
    { haspopup: 'listbox' },
  );

  describe('a11y baseline', () => {
    it('gives the trigger the combobox role and the surface the listbox role', async () => {
      const r = renderHost(TimePickerHost);
      expect(getTrigger().getAttribute('role')).toBe('combobox');

      r.instance.open.set(true);
      await flush(r.fixture);

      expect(getContent()!.getAttribute('role')).toBe('listbox');
    });

    it('content is labelled by the trigger id via aria-labelledby', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const trigger = getTrigger();
      const content = getContent()!;
      expect(content.getAttribute('aria-labelledby')).toBe(trigger.id);
    });

    it('options carry role=option + aria-selected', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.value.set(new Date(2000, 0, 1, 9, 0, 0));
      r.instance.open.set(true);
      await flush(r.fixture);

      const nineAm = document.querySelector<HTMLElement>('[data-testid="slot-slot-32400"]');
      const midnight = document.querySelector<HTMLElement>('[data-testid="slot-slot-0"]');
      expect(nineAm?.getAttribute('role')).toBe('option');
      expect(nineAm?.getAttribute('aria-selected')).toBe('true');
      expect(midnight?.getAttribute('aria-selected')).toBe('false');
    });

    it('reflects data-readonly on the root while read-only, and clears it', async () => {
      const r = renderHost(TimePickerHost);
      const root = r.query<HTMLElement>('[forTimePicker]')!;
      expect(root.hasAttribute('data-readonly')).toBe(false);

      r.instance.readonly.set(true);
      await flush(r.fixture);
      expect(root.getAttribute('data-readonly')).toBe('');

      r.instance.readonly.set(false);
      await flush(r.fixture);
      expect(root.hasAttribute('data-readonly')).toBe(false);
    });

    it('portals the listbox content directly under document.body', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const content = getContent()!;
      expect(content.parentElement).toBe(document.body);
    });

    it('aria-orientation defaults to vertical', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const content = getContent()!;
      expect(content.getAttribute('aria-orientation')).toBe('vertical');
    });
  });

  describe('slot generation', () => {
    it('generates 48 slots for step=30', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.step.set(30);
      r.instance.open.set(true);
      await flush(r.fixture);

      expect(getSlots().length).toBe(48);
    });

    it('generates 24 slots for step=60', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.step.set(60);
      r.instance.open.set(true);
      await flush(r.fixture);

      expect(getSlots().length).toBe(24);
    });

    it('generates 96 slots for step=15', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.step.set(15);
      r.instance.open.set(true);
      await flush(r.fixture);

      expect(getSlots().length).toBe(96);
    });

    it('slot labels honour hourCycle=24', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.step.set(60);
      r.instance.hourCycle.set(24);
      r.instance.open.set(true);
      await flush(r.fixture);

      const slots = getSlots();
      const thirteenHour = Array.from(slots).find((s) => s.textContent?.trim().startsWith('13'));
      expect(thirteenHour).not.toBeNull();
    });

    it('formats slot labels and the trigger value through [locale] (#1150)', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.step.set(60);
      r.instance.hourCycle.set(null);
      r.instance.value.set(new Date(2000, 0, 1, 13, 0, 0));
      r.instance.open.set(true);

      r.instance.locale.set('en-US');
      await flush(r.fixture);
      const enValue = document.querySelector('[forTimePickerValue]')!.textContent!.trim();
      const enMidnight = getSlot('slot-0')!.textContent!.trim();

      r.instance.locale.set('fr-FR');
      await flush(r.fixture);
      const frValue = document.querySelector('[forTimePickerValue]')!.textContent!.trim();
      const frMidnight = getSlot('slot-0')!.textContent!.trim();

      expect(enValue).not.toBe(frValue);
      expect(enMidnight).not.toBe(frMidnight);
    });
  });

  describe('selection', () => {
    it('clicking a slot commits the value and closes', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.step.set(60);
      r.instance.open.set(true);
      await flush(r.fixture);

      const nineAm = document.querySelector<HTMLElement>('[data-testid="slot-slot-32400"]');
      nineAm?.click();
      await flush(r.fixture);

      expect(r.instance.value()).not.toBeNull();
      const v = r.instance.value()!;
      expect(v.getHours()).toBe(9);
      expect(v.getMinutes()).toBe(0);
      expect(r.instance.open()).toBe(false);
    });

    it('closeOnSelect=false keeps the picker open after selecting', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.step.set(60);
      r.instance.closeOnSelect.set(false);
      r.instance.open.set(true);
      await flush(r.fixture);

      const nineAm = document.querySelector<HTMLElement>('[data-testid="slot-slot-32400"]');
      nineAm?.click();
      await flush(r.fixture);

      expect(r.instance.value()).not.toBeNull();
      expect(r.instance.open()).toBe(true);
    });

    it('selecting when readonly is a no-op', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.step.set(60);
      r.instance.readonly.set(true);
      r.instance.open.set(true);
      await flush(r.fixture);

      const nineAm = document.querySelector<HTMLElement>('[data-testid="slot-slot-32400"]');
      nineAm?.click();
      await flush(r.fixture);

      expect(r.instance.value()).toBeNull();
    });

    it('minute granularity drops seconds when reflecting aria-selected', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.step.set(60);
      r.instance.granularity.set('minute');
      r.instance.value.set(new Date(2026, 5, 15, 9, 0, 30));
      r.instance.open.set(true);
      await flush(r.fixture);

      expect(getSlot('slot-32400')!.getAttribute('aria-selected')).toBe('true');
    });

    it('second granularity keeps seconds when reflecting aria-selected', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.step.set(60);
      r.instance.granularity.set('second');
      r.instance.value.set(new Date(2026, 5, 15, 9, 0, 30));
      r.instance.open.set(true);
      await flush(r.fixture);

      expect(getSlot('slot-32400')!.getAttribute('aria-selected')).toBe('false');
    });

    it('hour granularity compares only the hour when reflecting aria-selected', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.step.set(60);
      r.instance.granularity.set('hour');
      r.instance.value.set(new Date(2026, 5, 15, 9, 30, 0));
      r.instance.open.set(true);
      await flush(r.fixture);

      expect(getSlot('slot-32400')!.getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('DST-stable slots / date preservation', () => {
    it('produces no duplicate slot labels and exactly one selected slot on a DST day', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.step.set(30);
      r.instance.value.set(new Date(2026, 2, 8, 3, 30));
      r.instance.open.set(true);
      await flush(r.fixture);

      const labels = Array.from(getSlots()).map((s) => s.textContent!.trim());
      expect(new Set(labels).size).toBe(labels.length);
      expect(document.querySelectorAll('[aria-selected="true"]').length).toBe(1);
    });

    it('activating a slot grafts the picked time onto the real value date', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.step.set(60);
      r.instance.value.set(new Date(2026, 2, 8, 10, 0));
      r.instance.open.set(true);
      await flush(r.fixture);

      getSlot('slot-50400')!.click();
      await flush(r.fixture);

      const v = r.instance.value()!;
      expect(v.getFullYear()).toBe(2026);
      expect(v.getMonth()).toBe(2);
      expect(v.getDate()).toBe(8);
      expect(v.getHours()).toBe(14);
    });

    it('activating a slot with no committed date lands on the DST-stable sentinel', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.step.set(60);
      r.instance.value.set(null);
      r.instance.open.set(true);
      await flush(r.fixture);

      getSlot('slot-32400')!.click();
      await flush(r.fixture);

      const v = r.instance.value()!;
      expect(v.getFullYear()).toBe(2000);
      expect(v.getHours()).toBe(9);
    });
  });

  describe('minTime / maxTime disabling', () => {
    it('slots outside [minTime, maxTime] carry aria-disabled and data-disabled', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.step.set(60);
      r.instance.minTime.set(new Date(2000, 0, 1, 9, 0, 0));
      r.instance.maxTime.set(new Date(2000, 0, 1, 17, 0, 0));
      r.instance.open.set(true);
      await flush(r.fixture);

      const midnight = document.querySelector<HTMLElement>('[data-testid="slot-slot-0"]');
      expect(midnight?.getAttribute('aria-disabled')).toBe('true');
      expect(midnight?.getAttribute('data-disabled')).toBe('');

      const nineAm = document.querySelector<HTMLElement>('[data-testid="slot-slot-32400"]');
      expect(nineAm?.hasAttribute('aria-disabled')).toBe(false);
    });

    it('clicking a disabled slot does not commit the value', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.step.set(60);
      r.instance.minTime.set(new Date(2000, 0, 1, 9, 0, 0));
      r.instance.open.set(true);
      await flush(r.fixture);

      const midnight = document.querySelector<HTMLElement>('[data-testid="slot-slot-0"]');
      midnight?.click();
      await flush(r.fixture);

      expect(r.instance.value()).toBeNull();
    });
  });

  describe('trigger interaction', () => {
    it('opens on click', async () => {
      const r = renderHost(TimePickerHost);
      getTrigger().click();
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
    });

    it('opens on ArrowDown and focuses first enabled option', async () => {
      const r = renderHost(TimePickerHost);
      pressKey(getTrigger(), 'ArrowDown');
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
    });

    it('opens on ArrowUp', async () => {
      const r = renderHost(TimePickerHost);
      pressKey(getTrigger(), 'ArrowUp');
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
    });

    it('does nothing when disabled', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.disabled.set(true);
      await flush(r.fixture);

      getTrigger().click();
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);

      pressKey(getTrigger(), 'ArrowDown');
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);
    });

    it('reflects data-disabled on trigger when root is disabled', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.disabled.set(true);
      await flush(r.fixture);

      expect(getTrigger().getAttribute('data-disabled')).toBe('');
      expect(getTrigger().hasAttribute('disabled')).toBe(true);
      expect(getTrigger().hasAttribute('aria-disabled')).toBe(false);
    });
  });

  describe('keyboard navigation', () => {
    it('Escape closes the picker', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.step.set(60);
      r.instance.open.set(true);
      await flush(r.fixture);

      const firstSlot = getSlots()[0]!;
      firstSlot.focus();
      pressKey(firstSlot, 'Escape');
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
    });

    it('Enter on focused slot activates it', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.step.set(60);
      r.instance.open.set(true);
      await flush(r.fixture);

      const nineAm = document.querySelector<HTMLElement>('[data-testid="slot-slot-32400"]')!;
      nineAm.focus();
      pressKey(nineAm, 'Enter');
      await flush(r.fixture);

      expect(r.instance.value()).not.toBeNull();
      expect(r.instance.value()!.getHours()).toBe(9);
    });

    it('Space on focused slot activates it', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.step.set(60);
      r.instance.open.set(true);
      await flush(r.fixture);

      const nineAm = document.querySelector<HTMLElement>('[data-testid="slot-slot-32400"]')!;
      nineAm.focus();
      pressKey(nineAm, ' ');
      await flush(r.fixture);

      expect(r.instance.value()).not.toBeNull();
    });

    it('ArrowDown moves focus to the next slot', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.step.set(60);
      r.instance.open.set(true);
      await flush(r.fixture);

      const slots = Array.from(getSlots());
      slots[0]!.focus();
      pressKey(slots[0]!, 'ArrowDown');
      await flush(r.fixture);

      expect(document.activeElement).toBe(slots[1]);
    });

    it('ArrowUp moves focus to the previous slot', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.step.set(60);
      r.instance.open.set(true);
      await flush(r.fixture);

      const slots = Array.from(getSlots());
      slots[2]!.focus();
      pressKey(slots[2]!, 'ArrowUp');
      await flush(r.fixture);

      expect(document.activeElement).toBe(slots[1]);
    });

    it('Home moves focus to the first enabled slot', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.step.set(60);
      r.instance.open.set(true);
      await flush(r.fixture);

      const slots = Array.from(getSlots());
      slots[5]!.focus();
      pressKey(slots[5]!, 'Home');
      await flush(r.fixture);

      expect(document.activeElement).toBe(slots[0]);
    });

    it('End moves focus to the last enabled slot', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.step.set(60);
      r.instance.open.set(true);
      await flush(r.fixture);

      const slots = Array.from(getSlots());
      slots[0]!.focus();
      pressKey(slots[0]!, 'End');
      await flush(r.fixture);

      expect(document.activeElement).toBe(slots[slots.length - 1]);
    });
  });

  describe('data-highlighted', () => {
    it('focused option gains data-highlighted', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.step.set(60);
      r.instance.open.set(true);
      await flush(r.fixture);

      const firstSlot = getSlots()[0]!;
      firstSlot.focus();
      await flush(r.fixture);

      expect(firstSlot.hasAttribute('data-highlighted')).toBe(true);
    });

    it('data-highlighted is removed on blur', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.step.set(60);
      r.instance.open.set(true);
      await flush(r.fixture);

      const slots = Array.from(getSlots());
      slots[0]!.focus();
      await flush(r.fixture);
      expect(slots[0]!.hasAttribute('data-highlighted')).toBe(true);

      slots[0]!.blur();
      await flush(r.fixture);
      expect(slots[0]!.hasAttribute('data-highlighted')).toBe(false);
    });
  });

  describe('pointer highlight (issue #1784)', () => {
    const hover = (slot: HTMLElement) =>
      slot.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));

    const highlighted = (): HTMLElement[] =>
      Array.from(getSlots()).filter((slot) => slot.hasAttribute('data-highlighted'));

    const leaveContent = () =>
      document
        .querySelector<HTMLElement>('[role="listbox"]')!
        .dispatchEvent(new PointerEvent('pointerleave'));

    const advanceClock = (ms: number): void => {
      const frozen = Date.now() + ms;
      vi.spyOn(Date, 'now').mockImplementation(() => frozen);
    };

    async function openHourly() {
      const r = renderHost(TimePickerHost);
      r.instance.step.set(60);
      r.instance.open.set(true);
      await flush(r.fixture);
      return r;
    }

    it('hands data-highlighted to the hovered slot, and to no other', async () => {
      const r = await openHourly();
      const slots = Array.from(getSlots());
      slots[0]!.focus();
      await flush(r.fixture);
      expect(highlighted()).toEqual([slots[0]]);

      hover(slots[3]!);
      await flush(r.fixture);

      expect(highlighted()).toEqual([slots[3]]);
    });

    it('moves neither DOM focus nor the value', async () => {
      const r = await openHourly();
      const slots = Array.from(getSlots());
      slots[0]!.focus();
      await flush(r.fixture);

      hover(slots[3]!);
      await flush(r.fixture);

      expect(document.activeElement).toBe(slots[0]);
      expect(r.instance.value()).toBeNull();
      expect(r.instance.open()).toBe(true);
    });

    it('hands the highlight back to the keyboard on the next arrow move', async () => {
      const r = await openHourly();
      const slots = Array.from(getSlots());
      slots[0]!.focus();
      hover(slots[3]!);
      await flush(r.fixture);
      expect(highlighted()).toEqual([slots[3]]);

      pressKey(slots[0]!, 'ArrowDown');
      await flush(r.fixture);

      expect(document.activeElement).toBe(slots[1]);
      expect(highlighted()).toEqual([slots[1]]);
    });

    it('hands the highlight back to the focused slot when the pointer leaves the content', async () => {
      const r = await openHourly();
      const slots = Array.from(getSlots());
      slots[0]!.focus();
      hover(slots[3]!);
      await flush(r.fixture);
      expect(highlighted()).toEqual([slots[3]]);

      leaveContent();
      await flush(r.fixture);

      expect(highlighted()).toEqual([slots[0]]);
      expect(document.activeElement).toBe(slots[0]);
    });

    it('keeps exactly one slot highlighted while the pointer crosses to an adjacent one', async () => {
      const r = await openHourly();
      const slots = Array.from(getSlots());
      hover(slots[3]!);
      await flush(r.fixture);
      expect(highlighted()).toEqual([slots[3]]);

      slots[3]!.dispatchEvent(new PointerEvent('pointerleave'));
      await flush(r.fixture);
      expect(highlighted()).toEqual([slots[3]]);

      hover(slots[4]!);
      await flush(r.fixture);
      expect(highlighted()).toEqual([slots[4]]);
    });

    it('ignores a hover synthesized by the scroll a keyboard move performs', async () => {
      const r = await openHourly();
      const slots = Array.from(getSlots());
      slots[0]!.focus();
      hover(slots[3]!);
      await flush(r.fixture);

      pressKey(slots[0]!, 'ArrowDown');
      hover(slots[5]!);
      await flush(r.fixture);

      expect(highlighted()).toEqual([slots[1]]);
    });

    it('ignores a hover synthesized by the open-time scroll to the selected slot', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.step.set(60);
      r.instance.value.set(new Date(2000, 0, 1, 9, 0, 0));
      r.instance.open.set(true);
      await flush(r.fixture);
      const slots = Array.from(getSlots());

      hover(slots[3]!);
      await flush(r.fixture);

      expect(highlighted()).toEqual([slots[9]]);
    });

    it('takes the highlight once the suppression window has elapsed', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.step.set(60);
      r.instance.value.set(new Date(2000, 0, 1, 9, 0, 0));
      r.instance.open.set(true);
      await flush(r.fixture);
      const slots = Array.from(getSlots());

      advanceClock(1000);
      hover(slots[3]!);
      await flush(r.fixture);

      expect(highlighted()).toEqual([slots[3]]);
    });

    it('ignores a hover on a disabled slot', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.step.set(60);
      r.instance.minTime.set(new Date(2000, 0, 1, 9, 0, 0));
      r.instance.open.set(true);
      await flush(r.fixture);
      const slots = Array.from(getSlots());
      slots[9]!.focus();
      await flush(r.fixture);

      hover(slots[0]!);
      await flush(r.fixture);

      expect(highlighted()).toEqual([slots[9]]);
    });

    it('drops the pointer highlight when the hovered slot becomes disabled', async () => {
      const r = await openHourly();
      const slots = Array.from(getSlots());
      slots[9]!.focus();
      hover(slots[3]!);
      await flush(r.fixture);
      expect(highlighted()).toEqual([slots[3]]);

      r.instance.minTime.set(new Date(2000, 0, 1, 9, 0, 0));
      await flush(r.fixture);

      expect(highlighted()).toEqual([slots[9]]);
    });
  });

  describe('value display', () => {
    it('shows the placeholder when no value is selected', async () => {
      const r = renderHost(TimePickerHost);
      const valueEl = r.query<HTMLElement>('[forTimePickerValue]')!;
      expect(valueEl.getAttribute('data-placeholder')).toBe('');
    });

    it('shows the formatted value when one is selected', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.locale.set('en-US');
      r.instance.value.set(new Date(2000, 0, 1, 9, 30, 0));
      await flush(r.fixture);

      const valueEl = r.query<HTMLElement>('[forTimePickerValue]')!;
      expect(valueEl.hasAttribute('data-placeholder')).toBe(false);
      expect(valueEl.textContent?.trim()).toBe('09:30');
    });
  });

  describe('day-only adapter throws', () => {
    it('throws a time-capable error when a day-only adapter is provided', () => {
      const dayOnly = {
        today: () => new Date(),
        createDate: (y: number, m: number, d: number) => new Date(y, m - 1, d),
        getYear: (d: Date) => d.getFullYear(),
        getMonth: (d: Date) => d.getMonth() + 1,
        getDate: (d: Date) => d.getDate(),
        getDayOfWeek: (d: Date) => d.getDay(),
        getDaysInMonth: () => 30,
        getFirstDayOfWeek: () => 0,
        addDays: (d: Date) => d,
        addMonths: (d: Date) => d,
        addYears: (d: Date) => d,
        compare: (a: Date, b: Date) => a.getTime() - b.getTime(),
        isSameDay: (a: Date, b: Date) => a.toDateString() === b.toDateString(),
        isValid: () => true,
        format: () => '',
      } satisfies DateAdapter<Date>;

      @Component({
        imports: [ForTimePicker, ForTimePickerTrigger],
        providers: [{ provide: FOR_DATE_ADAPTER, useValue: dayOnly }],
        template: `
          <div forTimePicker>
            <button forTimePickerTrigger></button>
          </div>
        `,
      })
      class DayOnlyHost {}

      expect(() => {
        const f = TestBed.createComponent(DayOnlyHost);
        f.detectChanges();
      }).toThrow(/time-capable/);
    });
  });

  describe('Signal Forms wiring', () => {
    interface TimeProfile {
      meetingTime: Date | null;
    }

    @Component({
      imports: [...BASE_IMPORTS, ForTimePickerValue, FormField],
      providers: [...provideNativeDateAdapter()],
      template: `
        <div
          forTimePicker
          [step]="60"
          [formField]="profile.meetingTime"
          [(open)]="open"
          #picker="forTimePicker"
        >
          <button data-testid="trigger" forTimePickerTrigger>
            <span forTimePickerValue placeholder="Pick a time"></span>
          </button>
          @if (open()) {
            <div forTimePickerContent>
              @for (slot of picker.slots(); track slot.id) {
                <div forTimePickerOption [value]="slot.value" [disabled]="slot.disabled">
                  {{ slot.label }}
                </div>
              }
            </div>
          }
        </div>
      `,
    })
    class FormHost {
      readonly model = signal<TimeProfile>({ meetingTime: null });
      readonly profile = form(this.model, (p) => {
        required(p.meetingTime);
      });
      readonly open = signal(false);
    }

    it('flows required from the form schema to aria-required on trigger', async () => {
      const r = renderHost(FormHost);
      await flush(r.fixture);

      const trigger = document.querySelector<HTMLButtonElement>('[forTimePickerTrigger]')!;
      expect(trigger.getAttribute('aria-required')).toBe('true');
    });

    it('selecting a slot updates the form model', async () => {
      const r = renderHost(FormHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const nineAm =
        document.querySelector<HTMLElement>('[data-testid="slot-slot-32400"]') ??
        document.querySelectorAll<HTMLElement>('[forTimePickerOption]')[9];
      nineAm?.click();
      await flush(r.fixture);

      expect(r.instance.model().meetingTime).not.toBeNull();
    });

    it('form-driven value flows into picker value', async () => {
      const r = renderHost(FormHost);
      const nineAm = new Date(2000, 0, 1, 9, 0, 0);
      r.instance.model.update((m) => ({ ...m, meetingTime: nineAm }));
      await flush(r.fixture);

      r.instance.open.set(true);
      await flush(r.fixture);

      const selectedSlot = document.querySelector<HTMLElement>('[data-state="checked"]');
      expect(selectedSlot).not.toBeNull();
    });
  });

  describe('anchor (separate positioning element)', () => {
    @Component({
      imports: [
        ForTimePicker,
        ForTimePickerAnchor,
        ForTimePickerTrigger,
        ForTimePickerContent,
        ForTimePickerOption,
      ],
      providers: [...provideNativeDateAdapter()],
      template: `
        <div forTimePicker [(open)]="open" [(value)]="value" #picker="forTimePicker">
          @if (showAnchor()) {
            <div data-testid="anchor" forTimePickerAnchor>
              <button forTimePickerTrigger>Open</button>
            </div>
          } @else {
            <button forTimePickerTrigger>Open</button>
          }
          @if (open()) {
            <div forTimePickerContent>
              @for (slot of picker.slots(); track slot.id) {
                <div forTimePickerOption [value]="slot.value" [disabled]="slot.disabled">
                  {{ slot.label }}
                </div>
              }
            </div>
          }
        </div>
      `,
    })
    class AnchorHost {
      readonly open = signal(false);
      readonly value = signal<Date | null>(null);
      readonly showAnchor = signal(true);
    }

    it('mounts the listbox with [forTimePickerAnchor] registered alongside the trigger', async () => {
      const r = renderHost(AnchorHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      expect(document.querySelector<HTMLElement>('[data-testid="anchor"]')).not.toBeNull();
      expect(getTrigger()).not.toBeNull();
      expect(getContent()).not.toBeNull();
    });

    it('lets the trigger keep driving aria-controls and the toggle even with an anchor', async () => {
      const r = renderHost(AnchorHost);
      const trigger = getTrigger();
      expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');

      trigger.click();
      await flush(r.fixture);

      const content = getContent()!;
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(trigger.getAttribute('aria-controls')).toBe(content.id);
    });

    it('restores the trigger fallback after the anchor is torn down inside @if', async () => {
      const r = renderHost(AnchorHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      expect(document.querySelector<HTMLElement>('[data-testid="anchor"]')).not.toBeNull();

      r.instance.open.set(false);
      r.instance.showAnchor.set(false);
      await flush(r.fixture);
      expect(document.querySelector<HTMLElement>('[data-testid="anchor"]')).toBeNull();

      getTrigger().click();
      await flush(r.fixture);
      expect(getContent()).not.toBeNull();
    });

    it('reacts to anchor registration', async () => {
      const r = renderHost(AnchorHost);
      r.instance.showAnchor.set(false);
      await flush(r.fixture);
      r.instance.open.set(true);
      await flush(r.fixture);
      expect(getContent()).not.toBeNull();

      r.instance.open.set(false);
      r.instance.showAnchor.set(true);
      await flush(r.fixture);
      r.instance.open.set(true);
      await flush(r.fixture);
      expect(document.querySelector<HTMLElement>('[data-testid="anchor"]')).not.toBeNull();
      expect(getContent()).not.toBeNull();
    });

    it('throws when two [forTimePickerAnchor] are registered inside the same [forTimePicker]', () => {
      @Component({
        imports: [ForTimePicker, ForTimePickerAnchor, ForTimePickerTrigger],
        providers: [...provideNativeDateAdapter()],
        template: `
          @if (show()) {
            <div forTimePicker>
              <div forTimePickerAnchor></div>
              <div forTimePickerAnchor></div>
              <button forTimePickerTrigger>Open</button>
            </div>
          }
        `,
      })
      class TwoAnchorsHost {
        readonly show = signal(true);
      }

      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(TwoAnchorsHost);
      expect(() => fixture.detectChanges()).toThrow(
        /\[forty-cdk\/time-picker\] FORCDK-TIME-PICKER-003: A \[forTimePicker\] registered a second \[forTimePickerAnchor\]/,
      );
    });
  });

  describe('focus (focus-on-error)', () => {
    it('moves focus to the trigger, not the wrapper host', async () => {
      const r = renderHost(TimePickerHost);
      await r.flush();
      const picker = r.fixture.debugElement
        .query(By.directive(ForTimePicker))
        .injector.get(ForTimePicker);

      picker.focus();

      expect(document.activeElement).toBe(getTrigger());
    });

    it('is a no-op while disabled', async () => {
      const r = renderHost(TimePickerHost);
      r.instance.disabled.set(true);
      await r.flush();
      const picker = r.fixture.debugElement
        .query(By.directive(ForTimePicker))
        .injector.get(ForTimePicker);

      picker.focus();

      expect(document.activeElement).not.toBe(getTrigger());
    });
  });

  describe('reactive updates', () => {
    it('open writes mount and unmount the slot list', async () => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });

      @Component({
        imports: [...BASE_IMPORTS],
        providers: [...provideNativeDateAdapter()],
        template: `
          <div forTimePicker [(value)]="value" [(open)]="open" [step]="60" #picker="forTimePicker">
            <button data-testid="trigger" forTimePickerTrigger></button>
            @if (open()) {
              <div forTimePickerContent>
                @for (slot of picker.slots(); track slot.id) {
                  <div forTimePickerOption [value]="slot.value" [disabled]="slot.disabled">
                    {{ slot.label }}
                  </div>
                }
              </div>
            }
          </div>
        `,
      })
      class ZonelessHost {
        readonly value = signal<Date | null>(null);
        readonly open = signal(false);
      }

      const r = renderHost(ZonelessHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      expect(getContent()).not.toBeNull();
      expect(getSlots().length).toBe(24);

      r.instance.open.set(false);
      await flush(r.fixture);
      expect(getContent()).toBeNull();
    });
  });
});
