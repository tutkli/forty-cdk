import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  inject,
  InjectionToken,
  type Provider,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush } from '../test-utils/flush';
import { afterEachOverlayCleanup } from '../test-utils/overlay-cleanup';
import { entryPointOf, LIBRARY_CODE } from '../test-utils/source-scan';

import { provideNativeDateAdapter } from 'forty-cdk/shared';
import { ForCombobox, ForComboboxContent, ForComboboxInput } from 'forty-cdk/combobox';
import { ForContextMenu, ForContextMenuTrigger } from 'forty-cdk/context-menu';
import {
  ForDatePicker,
  ForDatePickerContent,
  ForDatePickerTrigger,
  ForDateRangePicker,
} from 'forty-cdk/date-picker';
import { ForDialog } from 'forty-cdk/dialog';
import { ForDrawer } from 'forty-cdk/drawer';
import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';
import { ForHoverCard, ForHoverCardContent, ForHoverCardTrigger } from 'forty-cdk/hover-card';
import { ForMenu, ForMenuContent, ForMenuItem } from 'forty-cdk/menu';
import { ForMenubar, ForMenubarTrigger } from 'forty-cdk/menubar';
import { ForPopover, ForPopoverContent, ForPopoverTrigger } from 'forty-cdk/popover';
import { ForSelect, ForSelectContent, ForSelectTrigger } from 'forty-cdk/select';
import { ForTimePicker, ForTimePickerContent, ForTimePickerTrigger } from 'forty-cdk/time-picker';
import { ForToastViewport } from 'forty-cdk/toast';
import { ForTooltip, ForTooltipContent, ForTooltipTrigger } from 'forty-cdk/tooltip';

const PORTALING_HELPER =
  /\b(?:injectPortal|injectModalShell|injectOverlayShell|injectFloating|injectItemAlignedPositioner)\(/;

const INTERNAL_TIER = ['core/', 'core-overlay/', 'core-anchored/'];

const BODY_APPEND = /\.body\.(?:appendChild|append|prepend|insertBefore)\(/g;

const SHARED_STAMP = /\bstampAmbientDirection\(/g;

interface BodyAppendExclusion {
  readonly reason: string;
  readonly holds: (code: string) => boolean;
}

const BODY_APPEND_EXCLUSIONS: Readonly<Record<string, BodyAppendExclusion>> = {
  'core/src/live-announcer/live-announcer.ts': {
    reason: 'a visually hidden live region lays out no text a reader sees',
    holds: (code) => /style\.cssText = VISUALLY_HIDDEN_STYLE/.test(code),
  },
  'core-overlay/src/overlay-manager/overlay-manager.ts': {
    reason:
      'the outlet host generates no box, and every surface it renders moves itself through injectPortal',
    holds: (code) => /outletHost\.style\.display = 'contents'/.test(code),
  },
};

function count(code: string, pattern: RegExp): number {
  return code.match(pattern)?.length ?? 0;
}

function bodyAppendingSources(): string[] {
  return [...LIBRARY_CODE]
    .filter(([, code]) => count(code, BODY_APPEND) > 0)
    .map(([path]) => path)
    .sort();
}

function portalingSources(): string[] {
  return [...LIBRARY_CODE]
    .filter(
      ([path, code]) =>
        !INTERNAL_TIER.some((tier) => path.startsWith(tier)) && PORTALING_HELPER.test(code),
    )
    .map(([path]) => path)
    .sort();
}

const DIR_BINDING = /'\[attr\.dir\]':\s*'([^']*)'/g;

const REFLECTED_DECLARATION = /\breflectedDir\s*=\s*injectReflectedDirection\(/;

function dirBindings(): { readonly path: string; readonly value: string }[] {
  return [...LIBRARY_CODE]
    .flatMap(([path, code]) => [...code.matchAll(DIR_BINDING)].map((m) => ({ path, value: m[1]! })))
    .sort((a, b) => a.path.localeCompare(b.path));
}

/** The `dir` the `<section>` around each adopter declares: `'rtl'`, or nothing at all. */
const SECTION_DIR = new InjectionToken<'rtl' | null>('SECTION_DIR', { factory: () => 'rtl' });

@Directive()
abstract class DirSection {
  readonly dir = inject(SECTION_DIR);
}

@Component({
  imports: [ForPopover, ForPopoverTrigger, ForPopoverContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section [attr.dir]="dir">
    <div forPopover [open]="true">
      <button forPopoverTrigger>Toggle</button>
      <div forPopoverContent>Content</div>
    </div>
  </section>`,
})
class PopoverHost extends DirSection {}

@Component({
  imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section [attr.dir]="dir">
    <div forTooltip [open]="true">
      <button forTooltipTrigger>Hover</button>
      <div forTooltipContent>Hint</div>
    </div>
  </section>`,
})
class TooltipHost extends DirSection {}

@Component({
  imports: [ForHoverCard, ForHoverCardTrigger, ForHoverCardContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section [attr.dir]="dir">
    <span forHoverCard [open]="true">
      <a forHoverCardTrigger href="/users/ada">Ada</a>
      <div forHoverCardContent>Preview</div>
    </span>
  </section>`,
})
class HoverCardHost extends DirSection {}

@Component({
  imports: [ForSelect, ForSelectTrigger, ForSelectContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section [attr.dir]="dir">
    <div forSelect [open]="true">
      <button forSelectTrigger>Select</button>
      <div forSelectContent></div>
    </div>
  </section>`,
})
class SelectHost extends DirSection {}

@Component({
  imports: [ForCombobox, ForComboboxInput, ForComboboxContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section [attr.dir]="dir">
    <div forCombobox [open]="true">
      <input forComboboxInput />
      <div forComboboxContent></div>
    </div>
  </section>`,
})
class ComboboxHost extends DirSection {}

@Component({
  imports: [ForDropdownMenu, ForDropdownMenuTrigger, ForMenuContent, ForMenuItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section [attr.dir]="dir">
    <div forDropdownMenu [open]="true">
      <button forDropdownMenuTrigger>Options</button>
      <div forMenuContent>
        <button forMenuItem>New</button>
      </div>
    </div>
  </section>`,
})
class MenuHost extends DirSection {}

@Component({
  imports: [ForDatePicker, ForDatePickerTrigger, ForDatePickerContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section [attr.dir]="dir">
    <div forDatePicker [open]="true">
      <button forDatePickerTrigger>Pick</button>
      <div forDatePickerContent></div>
    </div>
  </section>`,
})
class DatePickerHost extends DirSection {}

@Component({
  imports: [ForTimePicker, ForTimePickerTrigger, ForTimePickerContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section [attr.dir]="dir">
    <div forTimePicker [step]="60" [open]="true">
      <button forTimePickerTrigger>Pick</button>
      <div forTimePickerContent></div>
    </div>
  </section>`,
})
class TimePickerHost extends DirSection {}

@Component({
  imports: [ForDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section [attr.dir]="dir">
    <div forDialog ariaLabel="Dialog"><button type="button">OK</button></div>
  </section>`,
})
class DialogHost extends DirSection {}

@Component({
  imports: [ForDrawer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section [attr.dir]="dir">
    <div forDrawer ariaLabel="Drawer"><button type="button">OK</button></div>
  </section>`,
})
class DrawerHost extends DirSection {}

@Component({
  imports: [ForToastViewport],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section [attr.dir]="dir"><for-toast-viewport /></section>`,
})
class ToastViewportHost extends DirSection {}

@Component({
  imports: [ForContextMenu, ForContextMenuTrigger, ForMenuContent, ForMenuItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section [attr.dir]="dir">
    <div forContextMenu [open]="true">
      <div forContextMenuTrigger>Right-click here</div>
      <div forMenuContent>
        <button forMenuItem>Rename</button>
      </div>
    </div>
  </section>`,
})
class ContextMenuHost extends DirSection {}

@Component({
  imports: [ForMenubar, ForMenubarTrigger, ForMenuContent, ForMenuItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section [attr.dir]="dir">
    <div forMenubar value="file" ariaLabel="Main">
      <button forMenubarTrigger value="file">File</button>
      <div forMenuContent>
        <button forMenuItem>New</button>
      </div>
    </div>
  </section>`,
})
class MenubarHost extends DirSection {}

@Component({
  imports: [ForMenu, ForDropdownMenuTrigger, ForMenuContent, ForMenuItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section [attr.dir]="dir">
    <div forMenu #row="forMenu" [open]="true" ariaLabel="Row actions">
      <button [forDropdownMenuTrigger]="row">Actions</button>
      <div forMenuContent>
        <button forMenuItem>Edit</button>
      </div>
    </div>
  </section>`,
})
class StandaloneMenuHost extends DirSection {}

@Component({
  imports: [ForDateRangePicker, ForDatePickerTrigger, ForDatePickerContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section [attr.dir]="dir">
    <div forDateRangePicker [open]="true">
      <button forDatePickerTrigger>Pick</button>
      <div forDatePickerContent></div>
    </div>
  </section>`,
})
class DateRangePickerHost extends DirSection {}

interface Adopter {
  readonly source: string;
  readonly surface: string;
  readonly host: Type<unknown>;
  readonly providers?: readonly Provider[];
}

/**
 * Roots that portal through a surface `ADOPTERS` already sweeps, and reflect `dir` on their own
 * host: each one sits between its content and the `<section>`, so it is the root's reflection the
 * portal stamp reads first.
 */
const SHARED_SURFACE_ROOTS: readonly Adopter[] = [
  {
    source: 'context-menu/src/context-menu.ts',
    surface: '[forMenuContent]',
    host: ContextMenuHost,
  },
  { source: 'menubar/src/menubar.ts', surface: '[forMenuContent]', host: MenubarHost },
  { source: 'menu/src/menu.ts', surface: '[forMenuContent]', host: StandaloneMenuHost },
  {
    source: 'date-picker/src/date-range-picker.ts',
    surface: '[forDatePickerContent]',
    host: DateRangePickerHost,
    providers: provideNativeDateAdapter(),
  },
];

async function mountPortaled(
  { source, surface, host, providers = [] }: Adopter,
  sectionDir: 'rtl' | null,
): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: SECTION_DIR, useValue: sectionDir },
      ...providers,
    ],
  });
  const fixture = TestBed.createComponent(host);
  await flush(fixture);

  const region = (fixture.nativeElement as HTMLElement).querySelector('section')!;
  const portaled = document.body.querySelector<HTMLElement>(surface);

  expect(portaled, source).not.toBeNull();
  expect(region.contains(portaled)).toBe(false);
  return portaled!;
}

const ADOPTERS: readonly Adopter[] = [
  {
    source: 'popover/src/popover-content.ts',
    surface: '[forPopoverContent]',
    host: PopoverHost,
  },
  {
    source: 'tooltip/src/tooltip-content.ts',
    surface: '[forTooltipContent]',
    host: TooltipHost,
  },
  {
    source: 'hover-card/src/hover-card-content.ts',
    surface: '[forHoverCardContent]',
    host: HoverCardHost,
  },
  { source: 'select/src/select-content.ts', surface: '[forSelectContent]', host: SelectHost },
  {
    source: 'combobox/src/combobox-content.ts',
    surface: '[forComboboxContent]',
    host: ComboboxHost,
  },
  { source: 'menu/src/menu-content.ts', surface: '[forMenuContent]', host: MenuHost },
  {
    source: 'date-picker/src/date-picker-content.ts',
    surface: '[forDatePickerContent]',
    host: DatePickerHost,
    providers: provideNativeDateAdapter(),
  },
  {
    source: 'time-picker/src/time-picker-content.ts',
    surface: '[forTimePickerContent]',
    host: TimePickerHost,
    providers: provideNativeDateAdapter(),
  },
  { source: 'dialog/src/dialog.ts', surface: '[forDialog]', host: DialogHost },
  { source: 'drawer/src/drawer.ts', surface: '[forDrawer]', host: DrawerHost },
  {
    source: 'toast/src/toast-viewport.ts',
    surface: 'for-toast-viewport',
    host: ToastViewportHost,
  },
];

describe('portaled surfaces keep the ambient writing direction (#2141)', () => {
  afterEachOverlayCleanup();

  it('derives a live family', () => {
    expect(portalingSources()).toContain('popover/src/popover-content.ts');
    expect(portalingSources()).toContain('dialog/src/dialog.ts');
    expect(portalingSources().length).toBeGreaterThan(8);
  });

  it('sweeps every library source that portals its host', () => {
    expect(ADOPTERS.map(({ source }) => source).sort()).toEqual(portalingSources());
  });

  it('derives a live family of sources appending to <body>', () => {
    expect(bodyAppendingSources()).toContain('core/src/drag-session/drag-preview.ts');
  });

  it('stamps the ambient dir on every element a library source appends to <body>', () => {
    const unstamped = bodyAppendingSources()
      .filter((path) => !(path in BODY_APPEND_EXCLUSIONS))
      .filter((path) => {
        const code = LIBRARY_CODE.get(path)!;
        return count(code, SHARED_STAMP) < count(code, BODY_APPEND);
      });

    expect(
      unstamped,
      'an element appended to <body> leaves the subtree that gave it its direction: stamp it with stampAmbientDirection, or exclude it here with a condition the guard checks',
    ).toEqual([]);
  });

  it('keeps every <body>-append exclusion true', () => {
    for (const [path, { reason, holds }] of Object.entries(BODY_APPEND_EXCLUSIONS)) {
      const code = LIBRARY_CODE.get(path);
      expect(code, `${path} no longer exists`).toBeDefined();
      expect(count(code!, BODY_APPEND), `${path} no longer appends to <body>`).toBeGreaterThan(0);
      expect(holds(code!), `${path}: ${reason}`).toBe(true);
    }
  });

  it('routes the portal through the shared stamp', () => {
    expect(count(LIBRARY_CODE.get('core/src/portal/portal.ts')!, SHARED_STAMP)).toBeGreaterThan(0);
  });

  for (const adopter of [...ADOPTERS, ...SHARED_SURFACE_ROOTS]) {
    const name = `${adopter.surface} from ${adopter.source}`;

    it(`${name} leaves a dir="rtl" subtree still carrying dir="rtl"`, async () => {
      const portaled = await mountPortaled(adopter, 'rtl');
      expect(portaled.getAttribute('dir')).toBe('rtl');
    });

    it(`${name} is stamped with the dir <html> declares`, async () => {
      document.documentElement.setAttribute('dir', 'rtl');
      try {
        const portaled = await mountPortaled(adopter, null);
        expect(portaled.getAttribute('dir')).toBe('rtl');
      } finally {
        document.documentElement.removeAttribute('dir');
      }
    });

    it(`${name} carries no dir under CSS-only RTL (#2725)`, async () => {
      document.documentElement.style.direction = 'rtl';
      try {
        const portaled = await mountPortaled(adopter, null);
        expect(portaled.getAttribute('dir')).toBeNull();
      } finally {
        document.documentElement.style.removeProperty('direction');
      }
    });
  }
});

describe('dir-reflecting hosts reflect only a declared direction (#2725)', () => {
  it('derives a live family', () => {
    const paths = dirBindings().map(({ path }) => path);
    expect(paths).toContain('select/src/select.ts');
    expect(paths).toContain('date-field/src/date-range-field-endpoint.ts');
    expect(paths.length).toBeGreaterThan(30);
  });

  it('binds every [attr.dir] host binding to injectReflectedDirection', () => {
    const offenders = dirBindings()
      .filter(({ path, value }) => {
        if (value !== 'reflectedDir()') {
          return true;
        }
        const entry = entryPointOf(path);
        return ![...LIBRARY_CODE].some(
          ([other, code]) => entryPointOf(other) === entry && REFLECTED_DECLARATION.test(code),
        );
      })
      .map(({ path, value }) => `${path}: '[attr.dir]': '${value}'`);

    expect(
      offenders,
      'a resolved dir() reflects a default nobody declared: bind reflectedDir = injectReflectedDirection(this._dirInput) instead',
    ).toEqual([]);
  });

  it('the shared-surface roots each reflect dir on their own host', () => {
    const reflecting = new Set(dirBindings().map(({ path }) => path));
    for (const { source } of SHARED_SURFACE_ROOTS) {
      expect(reflecting.has(source), source).toBe(true);
    }
  });
});
