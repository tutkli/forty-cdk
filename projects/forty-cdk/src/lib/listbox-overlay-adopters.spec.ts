import { Component, signal, type Type, type WritableSignal } from '@angular/core';

import { provideNativeDateAdapter } from 'forty-cdk/date-adapter';
import { ForSelect, ForSelectContent, ForSelectOption, ForSelectTrigger } from 'forty-cdk/select';
import { pressKey } from 'forty-cdk/testing';
import {
  ForTimePicker,
  ForTimePickerContent,
  ForTimePickerOption,
  ForTimePickerTrigger,
} from 'forty-cdk/time-picker';
import {
  afterEachOverlayCleanup,
  flush,
  flushPositioning,
  renderHost,
  type RenderResult,
  withScrollIntoViewStub,
} from '../test-utils';
import { entryPointOf, LIBRARY_CODE } from '../test-utils/source-scan';

/**
 * Every root composing `ListboxOverlayController` opens on an edge option from its trigger
 * (`Home` / `End`, `ArrowUp` with no value) and lets a non-option focus live inside its surface.
 * Two behaviours follow, and both live in the shared controller rather than in either root:
 * the option initial focus landed on is revealed once the positioner has bounded the surface,
 * and a Tab leaving the surface's tab cycle from anything that is not an option lands on the
 * trigger instead of past the body-appended portal. A third holds for every option piece: an
 * option disabled while it holds focus keeps the navigation keys and typeahead, and only its
 * activation and Tab commit stay guarded.
 *
 * Each adopter mounts once per behaviour; the source-derived cases fail on a root that composes
 * the controller without an entry here, and on an option piece that stops routing a disabled
 * option's keys through `handleDisabledRovingItemKey`.
 */
interface AdopterHost {
  readonly open: WritableSignal<boolean>;
  readonly firstOff: WritableSignal<boolean>;
}

interface Adopter {
  readonly host: Type<AdopterHost>;
  readonly trigger: string;
  readonly content: string;
  readonly lastOption: string;
  readonly typeaheadToLast: string;
}

@Component({
  imports: [ForSelect, ForSelectTrigger, ForSelectContent, ForSelectOption],
  host: { 'data-fixture': 'listbox-overlay-select' },
  template: `
    <div forSelect [(open)]="open">
      <button forSelectTrigger data-test-id="trigger">Fruit</button>
      @if (open()) {
        <div forSelectContent data-test-id="content">
          <button forSelectOption value="apple" [disabled]="firstOff()" data-test-id="first">
            Apple
          </button>
          <button forSelectOption value="banana" data-test-id="second">Banana</button>
          <button forSelectOption value="cherry" data-test-id="last">Cherry</button>
          <button type="button" data-test-id="consumer">Help</button>
        </div>
      }
    </div>
  `,
})
class SelectAdopterHost implements AdopterHost {
  readonly open = signal(false);
  readonly firstOff = signal(false);
}

@Component({
  imports: [ForTimePicker, ForTimePickerTrigger, ForTimePickerContent, ForTimePickerOption],
  providers: [...provideNativeDateAdapter()],
  host: { 'data-fixture': 'listbox-overlay-time-picker' },
  template: `
    <div forTimePicker [(open)]="open" [step]="240" [hourCycle]="24" #picker="forTimePicker">
      <button forTimePickerTrigger data-test-id="trigger">Time</button>
      @if (open()) {
        <div forTimePickerContent data-test-id="content">
          @for (slot of picker.slots(); track slot.id; let i = $index, last = $last) {
            <div
              forTimePickerOption
              [value]="slot.value"
              [disabled]="i === 0 && firstOff()"
              [attr.data-test-id]="last ? 'last' : i === 0 ? 'first' : i === 1 ? 'second' : null"
            >
              {{ slot.label }}
            </div>
          }
          <button type="button" data-test-id="consumer">Help</button>
        </div>
      }
    </div>
  `,
})
class TimePickerAdopterHost implements AdopterHost {
  readonly open = signal(false);
  readonly firstOff = signal(false);
}

const ADOPTERS: Readonly<Record<string, Adopter>> = {
  select: {
    host: SelectAdopterHost,
    trigger: 'trigger',
    content: 'content',
    lastOption: 'last',
    typeaheadToLast: 'c',
  },
  'time-picker': {
    host: TimePickerAdopterHost,
    trigger: 'trigger',
    content: 'content',
    lastOption: 'last',
    typeaheadToLast: '2',
  },
};

function byTestId(id: string): HTMLElement {
  return document.querySelector<HTMLElement>(`[data-test-id="${id}"]`)!;
}

describe('listbox overlay adopters', () => {
  afterEachOverlayCleanup();

  it('registers every root that composes ListboxOverlayController', () => {
    const roots = new Set(
      [...LIBRARY_CODE]
        .filter(([, code]) => /new ListboxOverlayController</.test(code))
        .map(([path]) => entryPointOf(path)),
    );
    expect(roots.size).toBeGreaterThan(0);
    expect([...roots].sort()).toEqual(Object.keys(ADOPTERS).sort());
  });

  it('routes the keys of a disabled option piece through the shared handler', () => {
    const entryPoints = new Set(Object.keys(ADOPTERS));
    const pieces = [...LIBRARY_CODE].filter(
      ([path, code]) => entryPoints.has(entryPointOf(path)) && code.includes('overlay.navigate('),
    );

    expect(pieces.length).toBeGreaterThanOrEqual(2);
    expect(
      pieces
        .filter(([, code]) => !code.includes('handleDisabledRovingItemKey('))
        .map(([path]) => path)
        .sort(),
    ).toEqual([]);
  });

  for (const [entryPoint, adopter] of Object.entries(ADOPTERS)) {
    describe(entryPoint, () => {
      it('reveals the option End focused once the positioner has resolved', async () => {
        const revealed: Element[] = [];
        await withScrollIntoViewStub(
          async () => {
            const r = renderHost(adopter.host);
            await flush(r.fixture);
            pressKey(byTestId(adopter.trigger), 'End');
            await flushPositioning(r.fixture);

            expect(document.activeElement).toBe(byTestId(adopter.lastOption));
            expect(revealed).toContain(byTestId(adopter.lastOption));
          },
          function (this: Element) {
            const content = byTestId(adopter.content);
            if (content?.style.translate) {
              revealed.push(this);
            }
          },
        );
      });

      describe('an option disabled while it holds focus', () => {
        async function focusFirstThenDisable(): Promise<{
          r: RenderResult<AdopterHost>;
          first: HTMLElement;
        }> {
          const r = renderHost(adopter.host);
          r.instance.open.set(true);
          await flush(r.fixture);
          const first = byTestId('first');
          first.focus();
          await flush(r.fixture);
          r.instance.firstOff.set(true);
          await flush(r.fixture);
          expect(first.getAttribute('aria-disabled')).toBe('true');
          expect(document.activeElement).toBe(first);
          return { r, first };
        }

        for (const [key, target] of [
          ['ArrowDown', 'second'],
          ['End', 'last'],
          ['PageDown', 'last'],
        ] as const) {
          it(`moves focus off it on ${key}`, async () => {
            const { r, first } = await focusFirstThenDisable();

            pressKey(first, key);
            await flush(r.fixture);

            expect(document.activeElement).toBe(byTestId(target));
          });
        }

        it('moves focus off it by typeahead', async () => {
          const { r, first } = await focusFirstThenDisable();

          pressKey(first, adopter.typeaheadToLast);
          await flush(r.fixture);

          expect(document.activeElement).toBe(byTestId(adopter.lastOption));
        });

        it('does not activate it on Enter', async () => {
          const { r, first } = await focusFirstThenDisable();

          pressKey(first, 'Enter');
          await flush(r.fixture);

          expect(r.instance.open()).toBe(true);
          expect(first.getAttribute('aria-selected')).not.toBe('true');
        });

        it('does not commit it on Tab', async () => {
          const { r, first } = await focusFirstThenDisable();

          const event = new KeyboardEvent('keydown', {
            key: 'Tab',
            bubbles: true,
            cancelable: true,
          });
          first.dispatchEvent(event);
          await flush(r.fixture);

          expect(event.defaultPrevented).toBe(false);
          expect(first.getAttribute('aria-selected')).not.toBe('true');
        });
      });

      it('parks focus on the trigger when Tab leaves the surface from a non-option', async () => {
        const r = renderHost(adopter.host);
        r.instance.open.set(true);
        await flush(r.fixture);

        const consumer = byTestId('consumer');
        consumer.focus();
        const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
        consumer.dispatchEvent(event);
        await flush(r.fixture);

        expect(document.activeElement).toBe(byTestId(adopter.trigger));
        expect(r.instance.open()).toBe(false);
        expect(event.defaultPrevented).toBe(false);
      });
    });
  }
});
