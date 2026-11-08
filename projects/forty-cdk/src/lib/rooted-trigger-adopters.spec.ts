import { Component, signal, type Type } from '@angular/core';

import {
  ForCombobox,
  ForComboboxContent,
  ForComboboxInput,
  ForComboboxList,
  ForComboboxOption,
  ForComboboxTrigger,
} from 'forty-cdk/combobox';
import { provideNativeDateAdapter } from 'forty-cdk/date-adapter';
import { ForDatePicker, ForDatePickerContent, ForDatePickerTrigger } from 'forty-cdk/date-picker';
import { ForHoverCard, ForHoverCardContent, ForHoverCardTrigger } from 'forty-cdk/hover-card';
import { ForPopover, ForPopoverContent, ForPopoverTrigger } from 'forty-cdk/popover';
import { ForSelect, ForSelectContent, ForSelectOption, ForSelectTrigger } from 'forty-cdk/select';
import { pointerEvent, pressKey, pressWithMouse } from 'forty-cdk/testing';
import {
  ForTimePicker,
  ForTimePickerContent,
  ForTimePickerOption,
  ForTimePickerTrigger,
} from 'forty-cdk/time-picker';
import { ForTooltip, ForTooltipContent, ForTooltipTrigger } from 'forty-cdk/tooltip';

import { afterEachOverlayCleanup, flush, renderHost } from '../test-utils';
import { entryPointOf, LIBRARY_CODE } from '../test-utils/source-scan';

/**
 * Adoption guard for the roots that register their triggers in a per-root bucket
 * ([#2723](https://github.com/tutkli/forty-cdk/issues/2723)). Such a root can carry several
 * mounted triggers, and three things have to hold for each of them: pressing any trigger is never
 * an outside press, the surface anchors to, is labelled by and returns focus to the trigger that
 * opened it, and no two triggers share an id. `RootedTriggerSlot` (`forty-cdk/core-anchored`) is
 * what provides the first two, and each trigger mints its own id.
 *
 * The source half derives the family from the `*_TRIGGERS` registries the library declares and
 * fails when a root resolves its triggers without the slot, when a content exempts a single
 * trigger rather than every registered host, or when a trigger takes its id from the root. The
 * behaviour half mounts two triggers on each root, and its roster is checked against the derived
 * family in both directions.
 */

/** Registry token → the entry point declaring it. */
function triggerRegistries(): Map<string, string> {
  const registries = new Map<string, string>();
  for (const [path, code] of LIBRARY_CODE) {
    for (const match of code.matchAll(/export const (\w+_TRIGGERS) = new InjectionToken\b/g)) {
      registries.set(match[1]!, entryPointOf(path));
    }
  }
  return registries;
}

/** The expression following `key:` up to the comma or brace that closes it. */
function propertyExpression(code: string, from: number): string {
  let depth = 0;
  for (let i = from; i < code.length; i++) {
    const char = code[i]!;
    if ('([{'.includes(char)) depth++;
    else if (')]}'.includes(char)) {
      if (depth === 0) return code.slice(from, i);
      depth--;
    } else if (char === ',' && depth === 0) return code.slice(from, i);
  }
  return code.slice(from);
}

const sorted = (values: Iterable<string>): string[] => [...values].sort();

describe('rooted trigger adoption (source)', () => {
  const registries = triggerRegistries();
  const entryPoints = new Set(registries.values());

  it('finds the trigger registries the library declares', () => {
    expect(registries.size).toBeGreaterThan(5);
  });

  it('resolves every root bucket through RootedTriggerSlot', () => {
    const offenders: string[] = [];
    const consumed = new Set<string>();
    for (const [path, code] of LIBRARY_CODE) {
      for (const match of code.matchAll(/inject\((\w+_TRIGGERS)\)\.of\(this\)/g)) {
        consumed.add(match[1]!);
        const before = code.slice(0, match.index).trimEnd();
        const throughSlot = before.endsWith('new RootedTriggerSlot(');
        const throughController =
          before.endsWith('triggers:') && code.includes('new ListboxOverlayController');
        if (!throughSlot && !throughController) {
          offenders.push(`${path}::${match[1]}`);
        }
      }
    }

    expect(offenders).toEqual([]);
    expect(sorted(consumed)).toEqual(sorted(registries.keys()));
    expect(
      LIBRARY_CODE.get('core-anchored/src/listbox-overlay/listbox-overlay-controller.ts'),
    ).toContain('new RootedTriggerSlot(deps.triggers)');
  });

  it('exempts every registered trigger from the outside checks of each content', () => {
    const found: string[] = [];
    const offenders: string[] = [];
    for (const [path, code] of LIBRARY_CODE) {
      if (!entryPoints.has(entryPointOf(path))) {
        continue;
      }
      for (const match of code.matchAll(/exemptElements:/g)) {
        found.push(path);
        const expression = propertyExpression(code, match.index + match[0].length);
        if (!expression.includes('triggerHosts()') || /\btrigger\(\)/.test(expression)) {
          offenders.push(path);
        }
      }
    }

    expect(found.length).toBeGreaterThan(4);
    expect(offenders).toEqual([]);
  });

  it('gives every trigger an id of its own rather than one its root mints', () => {
    const triggers: string[] = [];
    const offenders: string[] = [];
    for (const [path, code] of LIBRARY_CODE) {
      if (!entryPoints.has(entryPointOf(path))) {
        continue;
      }
      if (/\.next\(\s*'for-[\w-]+-trigger'\s*\)/.test(code)) {
        offenders.push(`${path}: mints a trigger id on the root`);
      }
      const registersTrigger = [...registries.keys()].some(
        (token) => code.includes(`inject(${token})`) && code.includes('registerHandle('),
      );
      if (registersTrigger && code.includes(`'[id]': 'id()'`)) {
        triggers.push(path);
        if (!/private readonly id = hostId\('for-[\w-]+-trigger'\)/.test(code)) {
          offenders.push(`${path}: [id] is not the trigger's own hostId`);
        }
      }
    }
    for (const [path, code] of LIBRARY_CODE) {
      if (/\bresolveTriggerId\b|\.resolveId\(/.test(code)) {
        offenders.push(`${path}: resolves a trigger id through its root`);
      }
    }

    expect(triggers.length).toBeGreaterThan(5);
    expect(offenders).toEqual([]);
  });
});

abstract class OpenHost {
  readonly open = signal(false);
}

@Component({
  imports: [ForPopover, ForPopoverTrigger, ForPopoverContent],
  template: `
    <div forPopover [(open)]="open">
      <button type="button" forPopoverTrigger data-testid="older">Older</button>
      <button type="button" forPopoverTrigger data-testid="newer">Newer</button>
      @if (open()) {
        <div forPopoverContent><button type="button">Inside</button></div>
      }
    </div>
  `,
})
class PopoverTriggersHost extends OpenHost {}

@Component({
  imports: [ForSelect, ForSelectTrigger, ForSelectContent, ForSelectOption],
  template: `
    <div forSelect [(open)]="open">
      <button forSelectTrigger data-testid="older">Older</button>
      <button forSelectTrigger data-testid="newer">Newer</button>
      @if (open()) {
        <div forSelectContent><button forSelectOption value="apple">Apple</button></div>
      }
    </div>
  `,
})
class SelectTriggersHost extends OpenHost {}

@Component({
  imports: [ForTimePicker, ForTimePickerTrigger, ForTimePickerContent, ForTimePickerOption],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forTimePicker [(open)]="open" #picker="forTimePicker">
      <button forTimePickerTrigger data-testid="older">Older</button>
      <button forTimePickerTrigger data-testid="newer">Newer</button>
      @if (open()) {
        <div forTimePickerContent>
          @for (slot of picker.slots(); track slot.id) {
            <div forTimePickerOption [value]="slot.value">{{ slot.label }}</div>
          }
        </div>
      }
    </div>
  `,
})
class TimePickerTriggersHost extends OpenHost {}

@Component({
  imports: [
    ForCombobox,
    ForComboboxTrigger,
    ForComboboxInput,
    ForComboboxContent,
    ForComboboxList,
    ForComboboxOption,
  ],
  template: `
    <div forCombobox [(open)]="open">
      <button forComboboxTrigger data-testid="older">Older</button>
      <button forComboboxTrigger data-testid="newer">Newer</button>
      @if (open()) {
        <div forComboboxContent>
          <input forComboboxInput />
          <div forComboboxList>
            <div forComboboxOption value="apple" label="Apple">Apple</div>
          </div>
        </div>
      }
    </div>
  `,
})
class ComboboxTriggersHost extends OpenHost {}

@Component({
  imports: [ForDatePicker, ForDatePickerTrigger, ForDatePickerContent],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forDatePicker [(open)]="open">
      <button forDatePickerTrigger data-testid="older">Older</button>
      <button forDatePickerTrigger data-testid="newer">Newer</button>
      @if (open()) {
        <div forDatePickerContent><button type="button">Inside</button></div>
      }
    </div>
  `,
})
class DatePickerTriggersHost extends OpenHost {}

@Component({
  imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
  template: `
    <div forTooltip [(open)]="open">
      <button type="button" forTooltipTrigger data-testid="older">Older</button>
      <button type="button" forTooltipTrigger data-testid="newer">Newer</button>
      @if (open()) {
        <div forTooltipContent>Tip</div>
      }
    </div>
  `,
})
class TooltipTriggersHost extends OpenHost {}

@Component({
  imports: [ForHoverCard, ForHoverCardTrigger, ForHoverCardContent],
  template: `
    <span forHoverCard [(open)]="open" [openDelay]="0" [closeDelay]="0">
      <a forHoverCardTrigger href="/older" data-testid="older">Older</a>
      <a forHoverCardTrigger href="/newer" data-testid="newer">Newer</a>
      @if (open()) {
        <div forHoverCardContent><button type="button">Inside</button></div>
      }
    </span>
  `,
})
class HoverCardTriggersHost extends OpenHost {}

/** The roots a trigger press toggles, keyed by the entry point declaring the registry. */
const TOGGLED: Readonly<Record<string, Type<OpenHost>>> = {
  popover: PopoverTriggersHost,
  select: SelectTriggersHost,
  'time-picker': TimePickerTriggersHost,
  combobox: ComboboxTriggersHost,
  'date-picker': DatePickerTriggersHost,
};

/** The roots a hover or a keyboard focus opens. */
const HOVERED: Readonly<Record<string, Type<OpenHost>>> = {
  tooltip: TooltipTriggersHost,
  'hover-card': HoverCardTriggersHost,
};

describe('rooted trigger adoption (behaviour)', () => {
  afterEachOverlayCleanup();

  it('mounts two triggers on every root the source half derives', () => {
    expect(sorted([...Object.keys(TOGGLED), ...Object.keys(HOVERED)])).toEqual(
      sorted(new Set(triggerRegistries().values())),
    );
  });

  describe.each(Object.entries(TOGGLED))('%s', (_entryPoint, host) => {
    const older = (r: ReturnType<typeof renderHost<OpenHost>>): HTMLElement =>
      r.query<HTMLElement>('[data-testid="older"]')!;
    const newer = (r: ReturnType<typeof renderHost<OpenHost>>): HTMLElement =>
      r.query<HTMLElement>('[data-testid="newer"]')!;

    it('closes from the older trigger that opened it', async () => {
      const r = renderHost(host);
      pressWithMouse(older(r));
      await flush(r.fixture);
      expect(r.instance.open()).toBe(true);

      pressWithMouse(older(r));
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
    });

    it('returns focus to the older trigger after Escape', async () => {
      const r = renderHost(host);
      pressWithMouse(older(r));
      await flush(r.fixture);
      expect(r.instance.open()).toBe(true);

      pressKey(document.activeElement ?? document, 'Escape');
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
      expect(document.activeElement).toBe(older(r));
    });

    it('gives the two triggers different ids', () => {
      const r = renderHost(host);

      expect(older(r).id).not.toBe('');
      expect(older(r).id).not.toBe(newer(r).id);
    });
  });

  it('tooltip: describes the trigger it opened on, and gives the triggers different ids', async () => {
    const r = renderHost(HOVERED['tooltip']!);
    const older = r.query<HTMLElement>('[data-testid="older"]')!;
    const newer = r.query<HTMLElement>('[data-testid="newer"]')!;
    older.dispatchEvent(new FocusEvent('focus'));
    await flush(r.fixture);
    expect(r.instance.open()).toBe(true);

    const content = document.querySelector<HTMLElement>('[role="tooltip"]')!;
    expect(older.getAttribute('aria-describedby')).toBe(content.id);
    expect(newer.hasAttribute('aria-describedby')).toBe(false);
    expect(older.id).not.toBe('');
    expect(older.id).not.toBe(newer.id);
  });

  it('hover card: returns focus to the trigger it opened on after Escape', async () => {
    const r = renderHost(HOVERED['hover-card']!);
    const older = r.query<HTMLElement>('[data-testid="older"]')!;
    older.dispatchEvent(pointerEvent('pointerenter'));
    await flush(r.fixture);
    expect(r.instance.open()).toBe(true);

    const content = document.querySelector<HTMLElement>('[forHoverCardContent]')!;
    content.dispatchEvent(pointerEvent('pointerenter'));
    older.dispatchEvent(pointerEvent('pointerleave'));
    const inside = content.querySelector<HTMLButtonElement>('button')!;
    inside.focus();
    await flush(r.fixture);

    pressKey(inside, 'Escape');
    await flush(r.fixture);

    expect(r.instance.open()).toBe(false);
    expect(document.activeElement).toBe(older);
  });
});
