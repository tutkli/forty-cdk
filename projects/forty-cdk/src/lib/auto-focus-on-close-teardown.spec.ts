import { Component, signal, type Type, type WritableSignal } from '@angular/core';

import { provideNativeDateAdapter } from 'forty-cdk/calendar';
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
  ForDatePickerValue,
} from 'forty-cdk/date-picker';
import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';
import { ForMenuContent, ForMenuItem, ForMenuSub, ForMenuSubTrigger } from 'forty-cdk/menu';
import { ForMenubar, ForMenubarTrigger } from 'forty-cdk/menubar';
import { ForPopover, ForPopoverContent, ForPopoverTrigger } from 'forty-cdk/popover';
import {
  ForSelect,
  ForSelectContent,
  ForSelectOption,
  ForSelectTrigger,
  ForSelectValue,
} from 'forty-cdk/select';
import { afterEachOverlayCleanup, flushPositioning, renderHost } from '../test-utils';
import { LIBRARY_CODE } from '../test-utils/source-scan';

/**
 * A trigger-anchored root declares `autoFocusOnClose` as an `output()`, and the
 * shell consults it from a `DestroyRef.onDestroy` hook. When the surface lives
 * in the **same view** as its root — an unconditionally mounted `[forMenuContent]`,
 * a surface the consumer left outside the `@if` — the root's `OutputEmitterRef`
 * is torn down first, so the emit is dropped: `defaultPrevented` stays `false`,
 * the shell reads the consumer's silence as consent, and focuses a trigger that
 * is being removed with it ([#1961](https://github.com/tutkli/forty-cdk/issues/1961)).
 *
 * The library resolves an undeliverable emit as a veto, so no focus move is
 * attempted at all. That is what each case below asserts, over every channel the
 * ten roots of the `autoFocusOnOpen as output<VetoableEvent>()` matrix row reach
 * the hook through; the source-derived guard underneath covers the roots the
 * behavioural cases do not mount.
 *
 * A dropped emit is also an `NG0953`, which `assertNoDestroyedOutputEmits` fails
 * the run on — so the two halves fail independently.
 */
interface TeardownCase {
  readonly name: string;
  readonly host: Type<TeardownHost>;
  readonly triggers: readonly string[];
}

interface TeardownHost {
  readonly mounted: WritableSignal<boolean>;
  close?(): void;
}

@Component({
  imports: [ForPopover, ForPopoverTrigger, ForPopoverContent],
  host: { 'data-fixture': 'teardown-popover' },
  template: `
    @if (mounted()) {
      <div forPopover [(open)]="open">
        <button forPopoverTrigger>Open</button>
        <div forPopoverContent><button>Inside</button></div>
      </div>
    }
  `,
})
class PopoverTeardownHost implements TeardownHost {
  readonly mounted = signal(true);
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
  host: { 'data-fixture': 'teardown-dropdown-menu' },
  template: `
    @if (mounted()) {
      <div forDropdownMenu [(open)]="open">
        <button forDropdownMenuTrigger>Options</button>
        <div forMenuContent>
          <button forMenuItem>A</button>
          <div forMenuSub [(open)]="subOpen">
            <button forMenuSubTrigger>More</button>
            <div forMenuContent><button forMenuItem>B</button></div>
          </div>
        </div>
      </div>
    }
  `,
})
class DropdownMenuTeardownHost implements TeardownHost {
  readonly mounted = signal(true);
  readonly open = signal(true);
  readonly subOpen = signal(true);
}

@Component({
  imports: [ForSelect, ForSelectTrigger, ForSelectValue, ForSelectContent, ForSelectOption],
  host: { 'data-fixture': 'teardown-select' },
  template: `
    @if (mounted()) {
      <div forSelect [(open)]="open" [(value)]="value">
        <button forSelectTrigger><span forSelectValue></span></button>
        <div forSelectContent>
          <button forSelectOption value="apple">Apple</button>
        </div>
      </div>
    }
  `,
})
class SelectTeardownHost implements TeardownHost {
  readonly mounted = signal(true);
  readonly open = signal(true);
  readonly value = signal<readonly string[]>([]);
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
  host: { 'data-fixture': 'teardown-combobox' },
  template: `
    @if (mounted()) {
      <div forCombobox [(open)]="open" [(value)]="value" [(query)]="query">
        <button forComboboxTrigger>Pick</button>
        <div forComboboxContent>
          <input forComboboxInput />
          <div forComboboxList>
            <div forComboboxOption value="apple" label="Apple">Apple</div>
          </div>
        </div>
      </div>
    }
  `,
})
class ComboboxTeardownHost implements TeardownHost {
  readonly mounted = signal(true);
  readonly open = signal(true);
  readonly value = signal<readonly string[]>([]);
  readonly query = signal('');
}

@Component({
  imports: [ForDatePicker, ForDatePickerTrigger, ForDatePickerValue, ForDatePickerContent],
  host: { 'data-fixture': 'teardown-date-picker' },
  providers: [...provideNativeDateAdapter()],
  template: `
    @if (mounted()) {
      <div forDatePicker [(open)]="open" [(value)]="value">
        <button forDatePickerTrigger><span forDatePickerValue></span></button>
        <div forDatePickerContent><button>Inside</button></div>
      </div>
    }
  `,
})
class DatePickerTeardownHost implements TeardownHost {
  readonly mounted = signal(true);
  readonly open = signal(true);
  readonly value = signal<Date | null>(null);
}

@Component({
  imports: [ForMenubar, ForMenubarTrigger, ForMenuContent, ForMenuItem],
  host: { 'data-fixture': 'teardown-menubar' },
  template: `
    @if (mounted()) {
      <div forMenubar [(value)]="value" ariaLabel="Main">
        <button forMenubarTrigger value="file">File</button>
        <div forMenuContent><button forMenuItem>New</button></div>
      </div>
    }
  `,
})
class MenubarTeardownHost implements TeardownHost {
  readonly mounted = signal(true);
  readonly value = signal<string | null>('file');

  close(): void {
    this.value.set(null);
  }
}

const CASES: readonly TeardownCase[] = [
  { name: '[forPopover]', host: PopoverTeardownHost, triggers: ['[forPopoverTrigger]'] },
  {
    name: '[forDropdownMenu] + [forMenuSub]',
    host: DropdownMenuTeardownHost,
    triggers: ['[forDropdownMenuTrigger]', '[forMenuSubTrigger]'],
  },
  { name: '[forSelect]', host: SelectTeardownHost, triggers: ['[forSelectTrigger]'] },
  { name: '[forCombobox]', host: ComboboxTeardownHost, triggers: ['[forComboboxTrigger]'] },
  { name: '[forDatePicker]', host: DatePickerTeardownHost, triggers: ['[forDatePickerTrigger]'] },
  { name: '[forMenubar]', host: MenubarTeardownHost, triggers: ['[forMenubarTrigger]'] },
];

describe('auto-focus-on-close during teardown', () => {
  afterEachOverlayCleanup();

  for (const { name, host, triggers } of CASES) {
    it(`${name} attempts no return-focus when the root is destroyed with its surface mounted`, async () => {
      const { instance, fixture, flush } = renderHost(host);
      await flushPositioning(fixture);

      const spies = triggers.map((selector) => {
        const trigger = document.querySelector<HTMLElement>(selector);
        expect(trigger).not.toBe(null);
        return vi.spyOn(trigger!, 'focus');
      });

      instance.close?.();
      await flush();

      instance.mounted.set(false);
      await flush();

      for (const spy of spies) {
        expect(spy).not.toHaveBeenCalled();
      }
    });
  }
});

/**
 * The behavioural cases mount six of the ten roots; the fix has to reach all of
 * them, and a new root has to inherit it. Both halves are derived from source:
 * the roster is every file declaring the hooks as outputs, and the assertion is
 * that none of them resolves one through the unguarded `emitVetoableEvent`.
 */
describe('auto-focus hook emitters', () => {
  const DECLARES_HOOK = /readonly autoFocusOnClose = output<VetoableEvent>\(\)/;
  const UNGUARDED_EMIT =
    /emitVetoableEvent\(\s*(?:this\.|[\w.#]*\.emit\.)?autoFocusOn(?:Open|Close)/;
  const DECLARES_EMITTER = /emitAutoFocusOn(?:Open|Close)\(\)\s*:\s*boolean\s*\{/;
  const GUARDED = /injectVetoableEmitter\(/;
  const DELEGATES = /(?:super|this\.#?\w+)\.emitAutoFocusOn(?:Open|Close)\(\)/;

  const roots = [...LIBRARY_CODE]
    .filter(([, code]) => DECLARES_HOOK.test(code))
    .map(([path]) => path);

  it('finds every root declaring the hooks as outputs', () => {
    expect(roots.length).toBeGreaterThan(0);
  });

  it('never emits an auto-focus hook through the unguarded helper', () => {
    const offenders = [...LIBRARY_CODE]
      .filter(([, code]) => UNGUARDED_EMIT.test(code))
      .map(([path]) => path);

    expect(offenders).toEqual([]);
  });

  it('resolves every declared emitter through the guard or a delegation', () => {
    const unresolved = [...LIBRARY_CODE]
      .filter(([, code]) => DECLARES_EMITTER.test(code))
      .filter(([, code]) => !GUARDED.test(code) && !DELEGATES.test(code))
      .map(([path]) => path);

    expect(unresolved).toEqual([]);
  });
});
