import {
  ChangeDetectionStrategy,
  Component,
  type Provider,
  provideZonelessChangeDetection,
  signal,
  type Type,
} from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { flush } from '../test-utils/flush';
import { afterEachOverlayCleanup } from '../test-utils/overlay-cleanup';
import {
  ForAccordion,
  ForAccordionContent,
  ForAccordionItem,
  ForAccordionTrigger,
} from 'forty-cdk/accordion';
import {
  ForCalendar,
  ForCalendarCell,
  ForCalendarGrid,
  ForCalendarHeading,
  provideNativeDateAdapter,
} from 'forty-cdk/calendar';
import { ForDatePicker, ForDatePickerContent, ForDatePickerTrigger } from 'forty-cdk/date-picker';

import {
  ForCombobox,
  ForComboboxContent,
  ForComboboxGroup,
  ForComboboxGroupLabel,
  ForComboboxInput,
  ForComboboxList,
  ForComboboxOption,
} from 'forty-cdk/combobox';
import {
  ForListbox,
  ForListboxGroup,
  ForListboxGroupLabel,
  ForListboxOption,
} from 'forty-cdk/listbox';
import {
  ForSelect,
  ForSelectContent,
  ForSelectGroup,
  ForSelectGroupLabel,
  ForSelectOption,
  ForSelectTrigger,
} from 'forty-cdk/select';

import { ForDialog, ForDialogDescription, ForDialogTitle } from 'forty-cdk/dialog';
import { ForDisclosure, ForDisclosureContent, ForDisclosureTrigger } from 'forty-cdk/disclosure';
import { ForRadio, ForRadioGroup } from 'forty-cdk/radio-group';
import { ForTabs, ForTabsContent, ForTabsList, ForTabsTrigger } from 'forty-cdk/tabs';
import { ForDrawer, ForDrawerDescription, ForDrawerTitle } from 'forty-cdk/drawer';
import {
  ForPopover,
  ForPopoverContent,
  ForPopoverDescription,
  ForPopoverTitle,
  ForPopoverTrigger,
} from 'forty-cdk/popover';
import { ForToast, ForToastDescription, ForToastTitle } from 'forty-cdk/toast';
import { ForTooltip, ForTooltipContent, ForTooltipTrigger } from 'forty-cdk/tooltip';
import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';
import {
  ForMenuContent,
  ForMenuGroup,
  ForMenuGroupLabel,
  ForMenuItem,
  ForMenuSub,
  ForMenuSubTrigger,
} from 'forty-cdk/menu';
import { ForMenubar, ForMenubarTrigger } from 'forty-cdk/menubar';
import {
  ForNavigationMenu,
  ForNavigationMenuContent,
  ForNavigationMenuItem,
  ForNavigationMenuList,
  ForNavigationMenuTrigger,
} from 'forty-cdk/navigation-menu';

import {
  ForStepper,
  ForStepperContent,
  ForStepperItem,
  ForStepperList,
  ForStepperTrigger,
} from './stepper';

import { ForTree, ForTreeItem, ForTreeItemLabel } from './tree';

/**
 * Library-wide contract for #659: every piece that host-binds `[id]` for aria
 * wiring must adopt a consumer-set **static** `id` instead of clobbering it
 * with its generated fallback. The static id is the contract for anchors,
 * external `aria-labelledby`/`aria-describedby` references, label `for`, and
 * test hooks.
 *
 * Each case locates the audited element by its directive attribute (never by
 * id — that would beg the question) and asserts its rendered `id`.
 */

function mount<T>(host: Type<T>, extraProviders: Provider[] = []): ComponentFixture<T> {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), ...extraProviders],
  });
  const fixture = TestBed.createComponent(host);
  fixture.detectChanges();
  return fixture;
}

/**
 * Locates the audited element by its directive attribute. Checks the (detached)
 * fixture host first, then `document.body` for pieces portaled out of the host
 * (overlay content / dialog / drawer).
 */
function idOf<T>(fixture: ComponentFixture<T>, selector: string): string {
  const el = fixture.nativeElement.querySelector(selector) ?? document.body.querySelector(selector);
  if (!el) {
    throw new Error(`No element matched "${selector}"`);
  }
  return (el as HTMLElement).id;
}

describe('consumer-set static id preservation (#659)', () => {
  afterEachOverlayCleanup();

  describe('Disclosure', () => {
    @Component({
      imports: [ForDisclosure, ForDisclosureTrigger, ForDisclosureContent],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forDisclosure [(open)]="open">
        <button forDisclosureTrigger id="probe">Toggle</button>
        <section forDisclosureContent id="probe-content">Content</section>
      </div>`,
    })
    class Host {
      readonly open = signal(true);
    }

    it('trigger and content preserve a consumer-set static id', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(idOf(fixture, '[forDisclosureTrigger]')).toBe('probe');
      expect(idOf(fixture, '[forDisclosureContent]')).toBe('probe-content');
    });

    it('falls back to a generated id when the host has none', async () => {
      @Component({
        imports: [ForDisclosure, ForDisclosureTrigger],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `<div forDisclosure>
          <button forDisclosureTrigger>Toggle</button>
        </div>`,
      })
      class NoIdHost {}
      const fixture = mount(NoIdHost);
      await flush(fixture);
      expect(idOf(fixture, '[forDisclosureTrigger]')).toMatch(/^for-disclosure-trigger-/);
    });

    // Documents the static-only boundary: a consumer `[id]="expr"` PROPERTY
    // binding evaluates after directive construction, so it is not adopted —
    // the directive's own `[id]` host binding still wins. Only static template
    // ids (present on the element at construction) are preserved.
    it('does NOT adopt a consumer [id] property binding (static-only boundary)', async () => {
      @Component({
        imports: [ForDisclosure, ForDisclosureTrigger],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `<div forDisclosure>
          <button forDisclosureTrigger [id]="boundId">Toggle</button>
        </div>`,
      })
      class BoundIdHost {
        readonly boundId = 'bound';
      }
      const fixture = mount(BoundIdHost);
      await flush(fixture);
      expect(idOf(fixture, '[forDisclosureTrigger]')).toMatch(/^for-disclosure-trigger-/);
    });
  });

  describe('Accordion', () => {
    @Component({
      imports: [ForAccordion, ForAccordionItem, ForAccordionTrigger, ForAccordionContent],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forAccordion [(value)]="value">
        <div forAccordionItem value="a">
          <button forAccordionTrigger id="probe">A</button>
          <section forAccordionContent id="probe-content">Panel A</section>
        </div>
      </div>`,
    })
    class Host {
      readonly value = signal<readonly string[]>(['a']);
    }

    it('trigger and content preserve a consumer-set static id', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(idOf(fixture, '[forAccordionTrigger]')).toBe('probe');
      expect(idOf(fixture, '[forAccordionContent]')).toBe('probe-content');
    });
  });

  describe('Tabs', () => {
    @Component({
      imports: [ForTabs, ForTabsList, ForTabsTrigger, ForTabsContent],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forTabs [(value)]="value">
        <div forTabsList>
          <button forTabsTrigger value="a" id="probe">A</button>
        </div>
        <section forTabsContent value="a" id="probe-content">Content A</section>
      </div>`,
    })
    class Host {
      readonly value = signal<string | null>('a');
    }

    it('trigger and content preserve a consumer-set static id', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(idOf(fixture, '[forTabsTrigger]')).toBe('probe');
      expect(idOf(fixture, '[forTabsContent]')).toBe('probe-content');
    });
  });

  describe('Stepper', () => {
    @Component({
      imports: [ForStepper, ForStepperList, ForStepperItem, ForStepperTrigger, ForStepperContent],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forStepper [(selectedIndex)]="index">
        <ol forStepperList>
          <li forStepperItem>
            <button forStepperTrigger id="probe">A</button>
          </li>
        </ol>
        <section forStepperContent id="probe-content">Content A</section>
      </div>`,
    })
    class Host {
      readonly index = signal(0);
    }

    it('trigger and content preserve a consumer-set static id', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(idOf(fixture, '[forStepperTrigger]')).toBe('probe');
      expect(idOf(fixture, '[forStepperContent]')).toBe('probe-content');
    });
  });

  describe('RadioGroup', () => {
    @Component({
      imports: [ForRadioGroup, ForRadio],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forRadioGroup [(value)]="value">
        <button type="button" forRadio value="a" id="probe">A</button>
      </div>`,
    })
    class Host {
      readonly value = signal('');
    }

    it('radio preserves a consumer-set static id', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(idOf(fixture, '[forRadio]')).toBe('probe');
    });
  });

  describe('Listbox', () => {
    @Component({
      imports: [ForListbox, ForListboxGroup, ForListboxGroupLabel, ForListboxOption],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<ul forListbox [(value)]="value">
        <li forListboxGroup>
          <div forListboxGroupLabel id="probe-label">Group</div>
          <button forListboxOption value="a" id="probe">A</button>
        </li>
      </ul>`,
    })
    class Host {
      readonly value = signal<readonly string[]>([]);
    }

    it('option and group label preserve a consumer-set static id', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(idOf(fixture, '[forListboxOption]')).toBe('probe');
      expect(idOf(fixture, '[forListboxGroupLabel]')).toBe('probe-label');
    });
  });

  describe('Menubar', () => {
    @Component({
      imports: [ForMenubar, ForMenubarTrigger],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forMenubar [(value)]="value">
        <button forMenubarTrigger value="file" id="probe">File</button>
      </div>`,
    })
    class Host {
      readonly value = signal('');
    }

    it('trigger preserves a consumer-set static id', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(idOf(fixture, '[forMenubarTrigger]')).toBe('probe');
    });
  });

  describe('NavigationMenu', () => {
    @Component({
      imports: [
        ForNavigationMenu,
        ForNavigationMenuList,
        ForNavigationMenuItem,
        ForNavigationMenuTrigger,
        ForNavigationMenuContent,
      ],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<nav forNavigationMenu [(value)]="value">
        <ul forNavigationMenuList>
          <li forNavigationMenuItem value="products">
            <button forNavigationMenuTrigger id="probe">Products</button>
            @if (value() === 'products') {
              <div forNavigationMenuContent id="probe-content">Panel</div>
            }
          </li>
        </ul>
      </nav>`,
    })
    class Host {
      readonly value = signal('products');
    }

    it('trigger and content preserve a consumer-set static id', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(idOf(fixture, '[forNavigationMenuTrigger]')).toBe('probe');
      expect(idOf(fixture, '[forNavigationMenuContent]')).toBe('probe-content');
    });
  });

  describe('Calendar', () => {
    @Component({
      imports: [ForCalendar, ForCalendarHeading, ForCalendarGrid, ForCalendarCell],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forCalendar [(value)]="value">
        <h2 forCalendarHeading id="probe">Heading</h2>
        <table forCalendarGrid #grid="forCalendarGrid">
          <tbody>
            @for (week of grid.weeks(); track week.key) {
              <tr>
                @for (cell of week.days; track cell.key) {
                  <td forCalendarCell [date]="cell.date">{{ cell.label }}</td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>`,
    })
    class Host {
      readonly value = signal<Date | null>(null);
    }

    it('heading preserves a consumer-set static id', async () => {
      const fixture = mount(Host, [...provideNativeDateAdapter()]);
      await flush(fixture);
      expect(idOf(fixture, '[forCalendarHeading]')).toBe('probe');
    });
  });

  describe('Dialog', () => {
    @Component({
      imports: [ForDialog, ForDialogTitle, ForDialogDescription],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `@if (open()) {
        <div forDialog (dismiss)="open.set(false)">
          <h2 forDialogTitle id="probe">Confirm</h2>
          <p forDialogDescription id="probe-desc">Sure?</p>
        </div>
      }`,
    })
    class Host {
      readonly open = signal(true);
    }

    it('title and description preserve a consumer-set static id', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(idOf(fixture, '[forDialogTitle]')).toBe('probe');
      expect(idOf(fixture, '[forDialogDescription]')).toBe('probe-desc');
    });
  });

  describe('Drawer', () => {
    @Component({
      imports: [ForDrawer, ForDrawerTitle, ForDrawerDescription],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `@if (open()) {
        <div forDrawer (dismiss)="open.set(false)">
          <h2 forDrawerTitle id="probe">Title</h2>
          <p forDrawerDescription id="probe-desc">Description</p>
        </div>
      }`,
    })
    class Host {
      readonly open = signal(true);
    }

    it('title and description preserve a consumer-set static id', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(idOf(fixture, '[forDrawerTitle]')).toBe('probe');
      expect(idOf(fixture, '[forDrawerDescription]')).toBe('probe-desc');
    });
  });

  describe('Popover', () => {
    @Component({
      imports: [
        ForPopover,
        ForPopoverTrigger,
        ForPopoverContent,
        ForPopoverTitle,
        ForPopoverDescription,
      ],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forPopover [(open)]="open">
        <button forPopoverTrigger id="probe">Toggle</button>
        @if (open()) {
          <div forPopoverContent id="probe-content">
            <h2 forPopoverTitle id="probe-title">Title</h2>
            <p forPopoverDescription id="probe-desc">Description</p>
          </div>
        }
      </div>`,
    })
    class Host {
      readonly open = signal(true);
    }

    it('trigger, content, title, and description preserve a consumer-set static id', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(idOf(fixture, '[forPopoverTrigger]')).toBe('probe');
      expect(idOf(fixture, '[forPopoverContent]')).toBe('probe-content');
      expect(idOf(fixture, '[forPopoverTitle]')).toBe('probe-title');
      expect(idOf(fixture, '[forPopoverDescription]')).toBe('probe-desc');
    });
  });

  describe('Tooltip', () => {
    @Component({
      imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forTooltip [(open)]="open" [openDelay]="0">
        <button forTooltipTrigger id="probe">Hover</button>
        @if (open()) {
          <div forTooltipContent id="probe-content">Hint</div>
        }
      </div>`,
    })
    class Host {
      readonly open = signal(true);
    }

    it('trigger and content preserve a consumer-set static id', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(idOf(fixture, '[forTooltipTrigger]')).toBe('probe');
      expect(idOf(fixture, '[forTooltipContent]')).toBe('probe-content');
    });
  });

  describe('Select', () => {
    @Component({
      imports: [
        ForSelect,
        ForSelectTrigger,
        ForSelectContent,
        ForSelectGroup,
        ForSelectGroupLabel,
        ForSelectOption,
      ],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forSelect [(value)]="value" [(open)]="open">
        <button forSelectTrigger id="probe">Select</button>
        @if (open()) {
          <div forSelectContent id="probe-content">
            <div forSelectGroup>
              <div forSelectGroupLabel id="probe-label">Group</div>
              <button forSelectOption value="a" id="probe-option">A</button>
            </div>
          </div>
        }
      </div>`,
    })
    class Host {
      readonly value = signal<readonly string[]>([]);
      readonly open = signal(true);
    }

    it('trigger, content, option, and group label preserve a consumer-set static id', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(idOf(fixture, '[forSelectTrigger]')).toBe('probe');
      expect(idOf(fixture, '[forSelectContent]')).toBe('probe-content');
      expect(idOf(fixture, '[forSelectOption]')).toBe('probe-option');
      expect(idOf(fixture, '[forSelectGroupLabel]')).toBe('probe-label');
    });
  });

  describe('Combobox', () => {
    @Component({
      imports: [
        ForCombobox,
        ForComboboxInput,
        ForComboboxList,
        ForComboboxContent,
        ForComboboxGroup,
        ForComboboxGroupLabel,
        ForComboboxOption,
      ],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forCombobox [(query)]="query" [(value)]="value" [(open)]="open">
        <input forComboboxInput id="probe" />
        @if (open()) {
          <div forComboboxContent id="probe-content">
            <div forComboboxList id="probe-list">
              <div forComboboxGroup>
                <div forComboboxGroupLabel id="probe-label">Group</div>
                <div forComboboxOption value="a" id="probe-option">A</div>
              </div>
            </div>
          </div>
        }
      </div>`,
    })
    class Host {
      readonly query = signal('');
      readonly value = signal<readonly string[]>([]);
      readonly open = signal(true);
    }

    it('input, list, content, option, and group label preserve a consumer-set static id', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(idOf(fixture, '[forComboboxInput]')).toBe('probe');
      expect(idOf(fixture, '[forComboboxContent]')).toBe('probe-content');
      expect(idOf(fixture, '[forComboboxList]')).toBe('probe-list');
      expect(idOf(fixture, '[forComboboxOption]')).toBe('probe-option');
      expect(idOf(fixture, '[forComboboxGroupLabel]')).toBe('probe-label');
    });
  });

  describe('DatePicker', () => {
    @Component({
      imports: [ForDatePicker, ForDatePickerTrigger, ForDatePickerContent],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forDatePicker [(value)]="value" [(open)]="open">
        <button forDatePickerTrigger id="probe">Pick</button>
        @if (open()) {
          <div forDatePickerContent id="probe-content">Calendar</div>
        }
      </div>`,
    })
    class Host {
      readonly value = signal<Date | null>(null);
      readonly open = signal(true);
    }

    it('trigger and content preserve a consumer-set static id', async () => {
      const fixture = mount(Host, [...provideNativeDateAdapter()]);
      await flush(fixture);
      expect(idOf(fixture, '[forDatePickerTrigger]')).toBe('probe');
      expect(idOf(fixture, '[forDatePickerContent]')).toBe('probe-content');
    });
  });

  describe('DropdownMenu / Menu', () => {
    @Component({
      imports: [
        ForDropdownMenu,
        ForDropdownMenuTrigger,
        ForMenuContent,
        ForMenuItem,
        ForMenuGroup,
        ForMenuGroupLabel,
        ForMenuSub,
        ForMenuSubTrigger,
      ],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forDropdownMenu [(open)]="open">
        <button forDropdownMenuTrigger id="probe">Options</button>
        @if (open()) {
          <div forMenuContent id="probe-content">
            <div forMenuGroup>
              <div forMenuGroupLabel id="probe-label">Group</div>
              <button forMenuItem>A</button>
            </div>
            <div forMenuSub [(open)]="subOpen">
              <button forMenuSubTrigger id="probe-sub">More</button>
              @if (subOpen()) {
                <div forMenuSubContent>
                  <button forMenuItem>B</button>
                </div>
              }
            </div>
          </div>
        }
      </div>`,
    })
    class Host {
      readonly open = signal(true);
      readonly subOpen = signal(true);
    }

    it('trigger, content, group label, and sub-trigger preserve a consumer-set static id', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(idOf(fixture, '[forDropdownMenuTrigger]')).toBe('probe');
      expect(idOf(fixture, '[forMenuContent]')).toBe('probe-content');
      expect(idOf(fixture, '[forMenuGroupLabel]')).toBe('probe-label');
      expect(idOf(fixture, '[forMenuSubTrigger]')).toBe('probe-sub');
    });
  });

  describe('Toast', () => {
    @Component({
      imports: [ForToast, ForToastTitle, ForToastDescription],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `@if (open()) {
        <div forToast (dismiss)="open.set(false)">
          <div forToastTitle id="probe">Saved</div>
          <div forToastDescription id="probe-desc">Changes are live.</div>
        </div>
      }`,
    })
    class Host {
      readonly open = signal(true);
    }

    it('title and description preserve a consumer-set static id', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(idOf(fixture, '[forToastTitle]')).toBe('probe');
      expect(idOf(fixture, '[forToastDescription]')).toBe('probe-desc');
    });

    it('falls back to a generated id when the host has none', async () => {
      @Component({
        imports: [ForToast, ForToastTitle],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `@if (open()) {
          <div forToast (dismiss)="open.set(false)">
            <div forToastTitle>Saved</div>
          </div>
        }`,
      })
      class NoIdHost {
        readonly open = signal(true);
      }
      const fixture = mount(NoIdHost);
      await flush(fixture);
      expect(idOf(fixture, '[forToastTitle]')).toMatch(/^for-toast-title-/);
    });
  });

  describe('Tree', () => {
    @Component({
      imports: [ForTree, ForTreeItem, ForTreeItemLabel],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<ul forTree [totalCount]="1" ariaLabel="Static">
        <li
          forTreeItem
          value="a"
          id="my-node"
          [itemIndex]="0"
          [level]="1"
          [setSize]="1"
          [posInSet]="1"
        >
          <div forTreeItemLabel>A</div>
        </li>
      </ul>`,
    })
    class Host {}

    it('treeitem preserves a consumer-set static id', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(idOf(fixture, '[forTreeItem]')).toBe('my-node');
    });
  });
});
