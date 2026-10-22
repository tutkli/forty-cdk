import { Component, signal, type Type, type WritableSignal } from '@angular/core';

import {
  ForCombobox,
  ForComboboxContent,
  ForComboboxInput,
  ForComboboxList,
  ForComboboxOption,
  ForComboboxTrigger,
} from 'forty-cdk/combobox';
import {
  ForDatePicker,
  ForDatePickerContent,
  ForDatePickerTrigger,
  ForDateRangePicker,
} from 'forty-cdk/date-picker';
import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';
import { ForMenuContent, ForMenuItem, ForMenuSub, ForMenuSubTrigger } from 'forty-cdk/menu';
import { ForPopover, ForPopoverContent, ForPopoverTrigger } from 'forty-cdk/popover';
import { ForSelect, ForSelectContent, ForSelectOption, ForSelectTrigger } from 'forty-cdk/select';
import { provideNativeDateAdapter } from 'forty-cdk/shared';
import { pressKey } from 'forty-cdk/testing';
import {
  ForTimePicker,
  ForTimePickerContent,
  ForTimePickerOption,
  ForTimePickerTrigger,
} from 'forty-cdk/time-picker';

import {
  afterEachOverlayCleanup,
  flushPositioning,
  focusInOn,
  pointerDownOn,
  renderHost,
} from '../test-utils';
import { LIBRARY_CODE } from '../test-utils/source-scan';

interface OpenHost {
  readonly open: WritableSignal<boolean>;
}

interface ReturnFocusCase {
  readonly name: string;
  readonly source: string;
  readonly host: Type<OpenHost>;
  readonly trigger: string;
}

@Component({
  imports: [ForPopover, ForPopoverTrigger, ForPopoverContent],
  template: `
    <div forPopover [(open)]="open">
      <button forPopoverTrigger>Open</button>
      @if (open()) {
        <div forPopoverContent><button>Inside</button></div>
      }
    </div>
  `,
})
class PopoverHost implements OpenHost {
  readonly open = signal(true);
}

@Component({
  imports: [ForDropdownMenu, ForDropdownMenuTrigger, ForMenuContent, ForMenuItem],
  template: `
    <div forDropdownMenu [(open)]="open">
      <button forDropdownMenuTrigger>Options</button>
      @if (open()) {
        <div forMenuContent><button forMenuItem>A</button></div>
      }
    </div>
  `,
})
class DropdownMenuHost implements OpenHost {
  readonly open = signal(true);
}

@Component({
  imports: [
    ForDropdownMenu,
    ForDropdownMenuTrigger,
    ForMenuContent,
    ForMenuItem,
    ForMenuSub,
    ForMenuSubTrigger,
  ],
  template: `
    <div forDropdownMenu [(open)]="open">
      <button forDropdownMenuTrigger>Options</button>
      @if (open()) {
        <div forMenuContent>
          <button forMenuItem>A</button>
          <div forMenuSub [(open)]="subOpen">
            <button forMenuSubTrigger>More</button>
            @if (subOpen()) {
              <div forMenuContent><button forMenuItem>B</button></div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
class SubmenuChainHost implements OpenHost {
  readonly open = signal(true);
  readonly subOpen = signal(true);
}

@Component({
  imports: [ForSelect, ForSelectTrigger, ForSelectContent, ForSelectOption],
  template: `
    <div forSelect [(open)]="open">
      <button forSelectTrigger>Fruit</button>
      @if (open()) {
        <div forSelectContent>
          <button forSelectOption value="apple">Apple</button>
        </div>
      }
    </div>
  `,
})
class SelectHost implements OpenHost {
  readonly open = signal(true);
}

@Component({
  imports: [
    ForCombobox,
    ForComboboxTrigger,
    ForComboboxContent,
    ForComboboxInput,
    ForComboboxList,
    ForComboboxOption,
  ],
  template: `
    <div forCombobox [(open)]="open">
      <button forComboboxTrigger>Pick</button>
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
class ComboboxHost implements OpenHost {
  readonly open = signal(true);
}

@Component({
  imports: [ForDatePicker, ForDatePickerTrigger, ForDatePickerContent],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forDatePicker [(open)]="open">
      <button forDatePickerTrigger>Date</button>
      @if (open()) {
        <div forDatePickerContent><button>Inside</button></div>
      }
    </div>
  `,
})
class DatePickerHost implements OpenHost {
  readonly open = signal(true);
}

@Component({
  imports: [ForDateRangePicker, ForDatePickerTrigger, ForDatePickerContent],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forDateRangePicker [(open)]="open">
      <button forDatePickerTrigger>Range</button>
      @if (open()) {
        <div forDatePickerContent><button>Inside</button></div>
      }
    </div>
  `,
})
class DateRangePickerHost implements OpenHost {
  readonly open = signal(true);
}

@Component({
  imports: [ForTimePicker, ForTimePickerTrigger, ForTimePickerContent, ForTimePickerOption],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forTimePicker [(open)]="open" [step]="60" #picker="forTimePicker">
      <button forTimePickerTrigger>Time</button>
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
class TimePickerHost implements OpenHost {
  readonly open = signal(true);
}

const CASES: readonly ReturnFocusCase[] = [
  {
    name: '[forPopover]',
    source: 'popover/src/popover-content.ts',
    host: PopoverHost,
    trigger: '[forPopoverTrigger]',
  },
  {
    name: '[forDropdownMenu]',
    source: 'menu/src/menu-content.ts',
    host: DropdownMenuHost,
    trigger: '[forDropdownMenuTrigger]',
  },
  {
    name: '[forSelect]',
    source: 'select/src/select-content.ts',
    host: SelectHost,
    trigger: '[forSelectTrigger]',
  },
  {
    name: '[forCombobox] (picker anatomy)',
    source: 'combobox/src/combobox-content.ts',
    host: ComboboxHost,
    trigger: '[forComboboxTrigger]',
  },
  {
    name: '[forDatePicker]',
    source: 'date-picker/src/date-picker-content.ts',
    host: DatePickerHost,
    trigger: '[forDatePickerTrigger]',
  },
  {
    name: '[forDateRangePicker]',
    source: 'date-picker/src/date-picker-content.ts',
    host: DateRangePickerHost,
    trigger: '[forDatePickerTrigger]',
  },
  {
    name: '[forTimePicker]',
    source: 'time-picker/src/time-picker-content.ts',
    host: TimePickerHost,
    trigger: '[forTimePickerTrigger]',
  },
];

const CHANNELS = [
  ['pointer-down', pointerDownOn],
  ['focus', focusInOn],
] as const;

describe('return focus after an outside close', () => {
  afterEachOverlayCleanup();

  let outside: HTMLButtonElement;
  beforeEach(() => {
    outside = document.createElement('button');
    document.body.appendChild(outside);
  });
  afterEach(() => {
    outside.remove();
  });

  for (const { name, host, trigger } of CASES) {
    for (const [channel, dispatch] of CHANNELS) {
      it(`${name} leaves focus where it moved after an outside ${channel} close`, async () => {
        const { instance, fixture, flush } = renderHost(host);
        await flushPositioning(fixture);
        const focusSpy = vi.spyOn(document.querySelector<HTMLElement>(trigger)!, 'focus');

        dispatch(outside);
        await flush();

        expect(instance.open()).toBe(false);
        expect(focusSpy).not.toHaveBeenCalled();
      });
    }

    it(`${name} still returns focus to the trigger after an Escape close`, async () => {
      const { instance, fixture, flush } = renderHost(host);
      await flushPositioning(fixture);
      const focusSpy = vi.spyOn(document.querySelector<HTMLElement>(trigger)!, 'focus');

      pressKey(document.activeElement ?? document.body, 'Escape');
      await flush();

      expect(instance.open()).toBe(false);
      expect(focusSpy).toHaveBeenCalled();
    });
  }

  for (const [channel, dispatch] of CHANNELS) {
    it(`a submenu chain closed by an outside ${channel} returns focus to neither trigger`, async () => {
      const { instance, fixture, flush } = renderHost(SubmenuChainHost);
      await flushPositioning(fixture);
      const spies = ['[forDropdownMenuTrigger]', '[forMenuSubTrigger]'].map((selector) =>
        vi.spyOn(document.querySelector<HTMLElement>(selector)!, 'focus'),
      );

      dispatch(outside);
      await flush();

      expect(instance.open()).toBe(false);
      for (const spy of spies) {
        expect(spy).not.toHaveBeenCalled();
      }
    });
  }
});

const SHELL = 'core-anchored/src/overlay-controller/overlay-shell.ts';
const OUTSIDE_REASON = /'(?:pointerDownOutside|focusOutside)'/;

const PROPAGATED_OUTSIDE_CLOSE: Readonly<Record<string, { source: string; propagates: RegExp }>> = {
  'menu/src/menu-content.ts': {
    source: 'menu/src/menu-sub.ts',
    propagates: /this\.parentMenu\.closeMenu\(reason\)/,
  },
};

function balancedFrom(code: string, open: number): string {
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === '{') {
      depth++;
    } else if (code[i] === '}') {
      depth--;
      if (depth === 0) {
        return code.slice(open, i + 1);
      }
    }
  }
  return code.slice(open);
}

function shellConfig(code: string): string | null {
  const call = /\binjectOverlayShell\(\s*(?:(\{)|(\w+)\s*\))/.exec(code);
  if (!call) {
    return null;
  }
  if (call[1]) {
    return balancedFrom(code, call.index + call[0].length - 1);
  }
  const decl = new RegExp(`\\b${call[2]}\\b(?:\\s*:[^=]+)?=\\s*\\{`).exec(code);
  return decl ? balancedFrom(code, decl.index + decl[0].length - 1) : null;
}

const callers = [...LIBRARY_CODE]
  .filter(([path, code]) => path !== SHELL && /\binjectOverlayShell\(/.test(code))
  .map(([path, code]) => ({ path, config: shellConfig(code) }));

const returnFocusBlocks = callers.flatMap(({ path, config }) => {
  const match = config === null ? null : /\breturnFocus:\s*\{/.exec(config);
  return match ? [{ path, block: balancedFrom(config!, match.index + match[0].length - 1) }] : [];
});

describe('injectOverlayShell return-focus adopters', () => {
  it('reads the config literal of every shell caller', () => {
    const callSites = [...LIBRARY_CODE]
      .filter(([path]) => path !== SHELL)
      .reduce((n, [, code]) => n + (code.match(/\binjectOverlayShell\(/g)?.length ?? 0), 0);

    expect(callers.length).toBeGreaterThan(0);
    expect(callers.length).toBe(callSites);
    expect(callers.filter(({ config }) => config === null).map(({ path }) => path)).toEqual([]);
  });

  it('finds a returnFocus block wherever a caller configures one', () => {
    const unread = callers
      .filter(({ config }) => /\breturnFocus\b/.test(config!))
      .filter(({ path }) => !returnFocusBlocks.some((b) => b.path === path))
      .map(({ path }) => path);

    expect(returnFocusBlocks.length).toBeGreaterThan(0);
    expect(unread).toEqual([]);
  });

  it('sweeps every caller that returns focus, and no other file', () => {
    const swept = [...new Set(CASES.map(({ source }) => source))].sort();

    expect(returnFocusBlocks.map(({ path }) => path).sort()).toEqual(swept);
  });

  it('leaves the outside-close skip to the shell', () => {
    const offenders = returnFocusBlocks
      .filter(({ path, block }) => OUTSIDE_REASON.test(block) && !PROPAGATED_OUTSIDE_CLOSE[path])
      .map(({ path }) => path);

    expect(offenders).toEqual([]);
  });

  it('keeps each propagated-close exclusion true', () => {
    for (const [path, { source, propagates }] of Object.entries(PROPAGATED_OUTSIDE_CLOSE)) {
      const block = returnFocusBlocks.find((b) => b.path === path)?.block ?? '';

      expect(block).toMatch(OUTSIDE_REASON);
      expect(LIBRARY_CODE.get(source)).toMatch(propagates);
    }
  });
});
