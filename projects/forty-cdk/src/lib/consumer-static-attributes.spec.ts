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
  ForCalendarMonthGrid,
  ForCalendarYearGrid,
  provideNativeDateAdapter,
} from 'forty-cdk/calendar';
import { ForDatePicker, ForDatePickerContent, ForDatePickerTrigger } from 'forty-cdk/date-picker';

import {
  ForCombobox,
  ForComboboxClear,
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
import { ForFieldset, ForFieldsetLegend } from 'forty-cdk/fieldset';
import { ForSlider, ForSliderThumb } from 'forty-cdk/slider';
import { ForTimePicker, ForTimePickerContent, ForTimePickerTrigger } from 'forty-cdk/time-picker';
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
  ForMenuRadioGroup,
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
} from 'forty-cdk/stepper';
import { ForTree, ForTreeItem, ForTreeItemLabel } from 'forty-cdk/tree';
import { ForBreadcrumbs } from 'forty-cdk/breadcrumbs';
import { ForCarousel, ForCarouselSlide, ForCarouselTrack } from 'forty-cdk/carousel';
import { ForSearch, ForSearchClear, ForSearchGroup } from 'forty-cdk/search';
import { ForToolbar } from 'forty-cdk/toolbar';

/**
 * Library-wide contract for the consumer-set **static** attributes a directive
 * must never clobber with its own host binding:
 *
 * - **#659 — `id`.** Every piece that host-binds `[id]` for aria wiring adopts
 *   a consumer-set static `id` instead of overwriting it with the generated
 *   fallback. The static id is the contract for anchors, external
 *   `aria-labelledby` / `aria-describedby` references, label `for`, and test
 *   hooks.
 * - **#1454 — `aria-labelledby` / `aria-describedby`.** Every surface that
 *   host-binds `[attr.aria-labelledby]` prefers a consumer-set static value
 *   over its own fallback, and every surface that host-binds
 *   `[attr.aria-describedby]` composes the consumer's ids before its own. Both
 *   go through the single `hostLabelledBy` / `hostDescribedBy` core seam. A
 *   `null` host binding removes the attribute outright, so the surfaces whose
 *   fallback is `null` by default (group labels, dialog titles) were destroying
 *   the consumer's value too — not just the ones emitting a generated id.
 * - **#1479 — `aria-label`.** Same mechanic, larger blast radius: a
 *   `[attr.aria-label]` binding resolving to `null` deleted the consumer's own
 *   attribute, leaving the widget with no accessible name at all. Every
 *   optional-name host (and every defaults-backed icon-only control) now routes
 *   through the third `hostAriaLabel` seam. Positional / per-instance computed
 *   labels — calendar cell, carousel slide / indicator, combobox chip remove,
 *   date & time segments, the carousel rotation control's state-swapping name —
 *   deliberately do **not** adopt; see the `keeps` block at the end.
 *
 * Each case locates the audited element by its directive attribute (never by
 * id — that would beg the question) and asserts its rendered attribute.
 */

function mount<T>(host: Type<T>, extraProviders: Provider[] = []): ComponentFixture<T> {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), ...extraProviders],
  });
  const fixture = TestBed.createComponent(host);
  fixture.detectChanges();
  return fixture;
}

function idOf<T>(fixture: ComponentFixture<T>, selector: string): string {
  return elementOf(fixture, selector).id;
}

function attrOf<T>(
  fixture: ComponentFixture<T>,
  selector: string,
  attribute: string,
): string | null {
  return elementOf(fixture, selector).getAttribute(attribute);
}

/**
 * Locates the audited element by its directive attribute. Checks the (detached)
 * fixture host first, then `document.body` for pieces portaled out of the host
 * (overlay content / dialog / drawer).
 */
function elementOf<T>(fixture: ComponentFixture<T>, selector: string): HTMLElement {
  const el = fixture.nativeElement.querySelector(selector) ?? document.body.querySelector(selector);
  if (!el) {
    throw new Error(`No element matched "${selector}"`);
  }
  return el as HTMLElement;
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
      imports: [ForMenubar, ForMenubarTrigger, ForMenuContent, ForMenuItem],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forMenubar [(value)]="value">
        <button forMenubarTrigger value="file" id="probe">File</button>
        @if (value() === 'file') {
          <div forMenuContent id="probe-content">
            <button forMenuItem>New</button>
          </div>
        }
      </div>`,
    })
    class Host {
      readonly value = signal('file');
    }

    it('trigger and menu content preserve a consumer-set static id', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(idOf(fixture, '[forMenubarTrigger]')).toBe('probe');
      expect(idOf(fixture, '[forMenuContent]')).toBe('probe-content');
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

describe('consumer-set static aria-labelledby / aria-describedby preservation (#1454)', () => {
  afterEachOverlayCleanup();

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
            <button forNavigationMenuTrigger>Products</button>
            @if (value() === 'products') {
              <div forNavigationMenuContent aria-labelledby="my-heading">Panel</div>
            }
          </li>
        </ul>
      </nav>`,
    })
    class Host {
      readonly value = signal('products');
    }

    it('content preserves a consumer-set static aria-labelledby', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(attrOf(fixture, '[forNavigationMenuContent]', 'aria-labelledby')).toBe('my-heading');
    });

    it('falls back to the trigger id when the panel has none', async () => {
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
              <button forNavigationMenuTrigger id="trigger-id">Products</button>
              @if (value() === 'products') {
                <div forNavigationMenuContent>Panel</div>
              }
            </li>
          </ul>
        </nav>`,
      })
      class NoLabelHost {
        readonly value = signal('products');
      }
      const fixture = mount(NoLabelHost);
      await flush(fixture);
      expect(attrOf(fixture, '[forNavigationMenuContent]', 'aria-labelledby')).toBe('trigger-id');
    });

    // The static-only boundary of #659, carried over verbatim: a consumer
    // `[attr.aria-labelledby]="expr"` binding evaluates after directive
    // construction, so it is invisible to adoption and the directive's own host
    // binding still wins.
    it('does NOT adopt a consumer [attr.aria-labelledby] binding', async () => {
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
              <button forNavigationMenuTrigger id="trigger-id">Products</button>
              @if (value() === 'products') {
                <div forNavigationMenuContent [attr.aria-labelledby]="bound">Panel</div>
              }
            </li>
          </ul>
        </nav>`,
      })
      class BoundHost {
        readonly value = signal('products');
        readonly bound = 'my-heading';
      }
      const fixture = mount(BoundHost);
      await flush(fixture);
      expect(attrOf(fixture, '[forNavigationMenuContent]', 'aria-labelledby')).toBe('trigger-id');
    });
  });

  describe('Accordion', () => {
    @Component({
      imports: [ForAccordion, ForAccordionItem, ForAccordionTrigger, ForAccordionContent],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forAccordion [(value)]="value">
        <div forAccordionItem value="a">
          <button forAccordionTrigger>A</button>
          <section forAccordionContent aria-labelledby="my-heading">Panel A</section>
        </div>
      </div>`,
    })
    class Host {
      readonly value = signal<readonly string[]>(['a']);
    }

    it('content preserves a consumer-set static aria-labelledby', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(attrOf(fixture, '[forAccordionContent]', 'aria-labelledby')).toBe('my-heading');
    });
  });

  describe('Tabs', () => {
    @Component({
      imports: [ForTabs, ForTabsList, ForTabsTrigger, ForTabsContent],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forTabs [(value)]="value">
        <div forTabsList>
          <button forTabsTrigger value="a">A</button>
        </div>
        <section forTabsContent value="a" aria-labelledby="my-heading">Content A</section>
      </div>`,
    })
    class Host {
      readonly value = signal<string | null>('a');
    }

    it('panel preserves a consumer-set static aria-labelledby', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(attrOf(fixture, '[forTabsContent]', 'aria-labelledby')).toBe('my-heading');
    });
  });

  describe('Stepper', () => {
    @Component({
      imports: [ForStepper, ForStepperList, ForStepperItem, ForStepperTrigger, ForStepperContent],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forStepper [(selectedIndex)]="index">
        <div forStepperList>
          <div forStepperItem>
            <button forStepperTrigger>Step 1</button>
          </div>
        </div>
        <section forStepperContent aria-labelledby="my-heading">Panel 1</section>
      </div>`,
    })
    class Host {
      readonly index = signal(0);
    }

    it('panel preserves a consumer-set static aria-labelledby', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(attrOf(fixture, '[forStepperContent]', 'aria-labelledby')).toBe('my-heading');
    });
  });

  describe('Calendar', () => {
    @Component({
      imports: [
        ForCalendar,
        ForCalendarHeading,
        ForCalendarGrid,
        ForCalendarCell,
        ForCalendarMonthGrid,
        ForCalendarYearGrid,
      ],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forCalendar [(value)]="value">
        <h2 forCalendarHeading>Heading</h2>
        <table forCalendarGrid #grid="forCalendarGrid" aria-labelledby="my-heading">
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
        <table forCalendarMonthGrid aria-labelledby="my-month-heading"></table>
        <table forCalendarYearGrid aria-labelledby="my-year-heading"></table>
      </div>`,
    })
    class Host {
      readonly value = signal<Date | null>(null);
    }

    it('grid preserves a consumer-set static aria-labelledby', async () => {
      const fixture = mount(Host, [...provideNativeDateAdapter()]);
      await flush(fixture);
      expect(attrOf(fixture, '[forCalendarGrid]', 'aria-labelledby')).toBe('my-heading');
    });

    it('month and year grids preserve a consumer-set static aria-labelledby', async () => {
      const fixture = mount(Host, [...provideNativeDateAdapter()]);
      await flush(fixture);
      expect(attrOf(fixture, '[forCalendarMonthGrid]', 'aria-labelledby')).toBe('my-month-heading');
      expect(attrOf(fixture, '[forCalendarYearGrid]', 'aria-labelledby')).toBe('my-year-heading');
    });

    it('month and year grids fall back to the heading id when they have none', async () => {
      @Component({
        imports: [ForCalendar, ForCalendarHeading, ForCalendarMonthGrid, ForCalendarYearGrid],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `<div forCalendar>
          <h2 forCalendarHeading id="heading-id">Heading</h2>
          <table forCalendarMonthGrid></table>
          <table forCalendarYearGrid></table>
        </div>`,
      })
      class NoLabelHost {}
      const fixture = mount(NoLabelHost, [...provideNativeDateAdapter()]);
      await flush(fixture);
      expect(attrOf(fixture, '[forCalendarMonthGrid]', 'aria-labelledby')).toBe('heading-id');
      expect(attrOf(fixture, '[forCalendarYearGrid]', 'aria-labelledby')).toBe('heading-id');
    });
  });

  describe('Fieldset', () => {
    @Component({
      imports: [ForFieldset, ForFieldsetLegend],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forFieldset aria-labelledby="my-heading">
        <div forFieldsetLegend>Shipping</div>
      </div>`,
    })
    class Host {}

    it('group preserves a consumer-set static aria-labelledby over the legend id', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(attrOf(fixture, '[forFieldset]', 'aria-labelledby')).toBe('my-heading');
    });
  });

  describe('Slider', () => {
    @Component({
      imports: [ForSlider, ForSliderThumb],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forSlider [(value)]="value">
        <span forSliderThumb [index]="0" aria-labelledby="my-heading"></span>
      </div>`,
    })
    class Host {
      readonly value = signal<readonly number[]>([50]);
    }

    it('thumb leaves a consumer-set static aria-labelledby untouched (no host binding)', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(attrOf(fixture, '[forSliderThumb]', 'aria-labelledby')).toBe('my-heading');
    });
  });

  describe('Listbox', () => {
    @Component({
      imports: [ForListbox, ForListboxGroup, ForListboxGroupLabel, ForListboxOption],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<ul forListbox [(value)]="value">
        <li forListboxGroup aria-labelledby="my-heading">
          <div forListboxGroupLabel>Group</div>
          <button type="button" forListboxOption value="a">A</button>
        </li>
      </ul>`,
    })
    class Host {
      readonly value = signal<readonly string[]>([]);
    }

    it('group preserves a consumer-set static aria-labelledby over the group label id', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(attrOf(fixture, '[forListboxGroup]', 'aria-labelledby')).toBe('my-heading');
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
        <button forSelectTrigger>Select</button>
        @if (open()) {
          <div forSelectContent aria-labelledby="my-heading">
            <div forSelectGroup aria-labelledby="my-group-heading">
              <div forSelectGroupLabel>Group</div>
              <button forSelectOption value="a">A</button>
            </div>
          </div>
        }
      </div>`,
    })
    class Host {
      readonly value = signal<readonly string[]>([]);
      readonly open = signal(true);
    }

    it('content and group preserve a consumer-set static aria-labelledby', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(attrOf(fixture, '[forSelectContent]', 'aria-labelledby')).toBe('my-heading');
      expect(attrOf(fixture, '[forSelectGroup]', 'aria-labelledby')).toBe('my-group-heading');
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
        <input forComboboxInput />
        @if (open()) {
          <div forComboboxContent aria-labelledby="my-heading">
            <div forComboboxList aria-labelledby="my-list-heading">
              <div forComboboxGroup aria-labelledby="my-group-heading">
                <div forComboboxGroupLabel>Group</div>
                <div forComboboxOption value="a">A</div>
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

    it('content, list, and group preserve a consumer-set static aria-labelledby', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(attrOf(fixture, '[forComboboxContent]', 'aria-labelledby')).toBe('my-heading');
      expect(attrOf(fixture, '[forComboboxList]', 'aria-labelledby')).toBe('my-list-heading');
      expect(attrOf(fixture, '[forComboboxGroup]', 'aria-labelledby')).toBe('my-group-heading');
    });
  });

  describe('DatePicker', () => {
    @Component({
      imports: [ForDatePicker, ForDatePickerTrigger, ForDatePickerContent],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forDatePicker [(value)]="value" [(open)]="open">
        <button forDatePickerTrigger>Pick</button>
        @if (open()) {
          <div forDatePickerContent aria-labelledby="my-heading">Calendar</div>
        }
      </div>`,
    })
    class Host {
      readonly value = signal<Date | null>(null);
      readonly open = signal(true);
    }

    it('content preserves a consumer-set static aria-labelledby', async () => {
      const fixture = mount(Host, [...provideNativeDateAdapter()]);
      await flush(fixture);
      expect(attrOf(fixture, '[forDatePickerContent]', 'aria-labelledby')).toBe('my-heading');
    });
  });

  describe('TimePicker', () => {
    @Component({
      imports: [ForTimePicker, ForTimePickerTrigger, ForTimePickerContent],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forTimePicker [(value)]="value" [(open)]="open">
        <button forTimePickerTrigger>Pick</button>
        @if (open()) {
          <div forTimePickerContent aria-labelledby="my-heading">Slots</div>
        }
      </div>`,
    })
    class Host {
      readonly value = signal<Date | null>(null);
      readonly open = signal(true);
    }

    it('content preserves a consumer-set static aria-labelledby', async () => {
      const fixture = mount(Host, [...provideNativeDateAdapter()]);
      await flush(fixture);
      expect(attrOf(fixture, '[forTimePickerContent]', 'aria-labelledby')).toBe('my-heading');
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
        ForMenuRadioGroup,
      ],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forDropdownMenu [(open)]="open">
        <button forDropdownMenuTrigger>Options</button>
        @if (open()) {
          <div forMenuContent aria-labelledby="my-heading">
            <div forMenuGroup aria-labelledby="my-group-heading">
              <div forMenuGroupLabel>Group</div>
              <button forMenuItem>A</button>
            </div>
            <div forMenuRadioGroup [(value)]="choice" aria-labelledby="my-radio-heading">
              <button forMenuItem>B</button>
            </div>
          </div>
        }
      </div>`,
    })
    class Host {
      readonly open = signal(true);
      readonly choice = signal('');
    }

    it('content, group, and radio group preserve a consumer-set static aria-labelledby', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(attrOf(fixture, '[forMenuContent]', 'aria-labelledby')).toBe('my-heading');
      expect(attrOf(fixture, '[forMenuGroup]', 'aria-labelledby')).toBe('my-group-heading');
      expect(attrOf(fixture, '[forMenuRadioGroup]', 'aria-labelledby')).toBe('my-radio-heading');
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
        <button forPopoverTrigger>Toggle</button>
        @if (open()) {
          <div forPopoverContent aria-labelledby="my-heading" aria-describedby="my-hint">
            <h2 forPopoverTitle id="title-id">Title</h2>
            <p forPopoverDescription id="desc-id">Description</p>
          </div>
        }
      </div>`,
    })
    class Host {
      readonly open = signal(true);
    }

    it('content prefers the static label and composes the static description', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(attrOf(fixture, '[forPopoverContent]', 'aria-labelledby')).toBe('my-heading');
      expect(attrOf(fixture, '[forPopoverContent]', 'aria-describedby')).toBe('my-hint desc-id');
    });
  });

  describe('Dialog', () => {
    @Component({
      imports: [ForDialog, ForDialogTitle, ForDialogDescription],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `@if (open()) {
        <div
          forDialog
          (dismiss)="open.set(false)"
          aria-labelledby="my-heading"
          aria-describedby="my-hint"
        >
          <h2 forDialogTitle id="title-id">Confirm</h2>
          <p forDialogDescription id="desc-id">Sure?</p>
        </div>
      }`,
    })
    class Host {
      readonly open = signal(true);
    }

    it('surface prefers the static label and composes the static description', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(attrOf(fixture, '[forDialog]', 'aria-labelledby')).toBe('my-heading');
      expect(attrOf(fixture, '[forDialog]', 'aria-describedby')).toBe('my-hint desc-id');
    });
  });

  describe('Drawer', () => {
    @Component({
      imports: [ForDrawer, ForDrawerTitle, ForDrawerDescription],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `@if (open()) {
        <div
          forDrawer
          (dismiss)="open.set(false)"
          aria-labelledby="my-heading"
          aria-describedby="my-hint"
        >
          <h2 forDrawerTitle id="title-id">Title</h2>
          <p forDrawerDescription id="desc-id">Description</p>
        </div>
      }`,
    })
    class Host {
      readonly open = signal(true);
    }

    it('surface prefers the static label and composes the static description', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(attrOf(fixture, '[forDrawer]', 'aria-labelledby')).toBe('my-heading');
      expect(attrOf(fixture, '[forDrawer]', 'aria-describedby')).toBe('my-hint desc-id');
    });
  });

  describe('Toast', () => {
    @Component({
      imports: [ForToast, ForToastTitle, ForToastDescription],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `@if (open()) {
        <div
          forToast
          (dismiss)="open.set(false)"
          aria-labelledby="my-heading"
          aria-describedby="my-hint"
        >
          <div forToastTitle id="title-id">Saved</div>
          <div forToastDescription id="desc-id">Changes are live.</div>
        </div>
      }`,
    })
    class Host {
      readonly open = signal(true);
    }

    it('toast prefers the static label and composes the static description', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(attrOf(fixture, '[forToast]', 'aria-labelledby')).toBe('my-heading');
      expect(attrOf(fixture, '[forToast]', 'aria-describedby')).toBe('my-hint desc-id');
    });
  });

  describe('Tooltip', () => {
    @Component({
      imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forTooltip [(open)]="open" [openDelay]="0">
        <button forTooltipTrigger aria-describedby="my-hint">Hover</button>
        @if (open()) {
          <div forTooltipContent id="content-id">Hint</div>
        }
      </div>`,
    })
    class Host {
      readonly open = signal(true);
    }

    it('trigger composes the tooltip id after a consumer-set static description', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(attrOf(fixture, '[forTooltipTrigger]', 'aria-describedby')).toBe('my-hint content-id');
    });

    it('keeps the consumer description alone while the tooltip is closed', async () => {
      @Component({
        imports: [ForTooltip, ForTooltipTrigger],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `<div forTooltip [(open)]="open" [openDelay]="0">
          <button forTooltipTrigger aria-describedby="my-hint">Hover</button>
        </div>`,
      })
      class ClosedHost {
        readonly open = signal(false);
      }
      const fixture = mount(ClosedHost);
      await flush(fixture);
      expect(attrOf(fixture, '[forTooltipTrigger]', 'aria-describedby')).toBe('my-hint');
    });
  });
});

describe('consumer-set static aria-label preservation (#1479)', () => {
  afterEachOverlayCleanup();

  describe('roots with an optional accessible name', () => {
    @Component({
      imports: [
        ForListbox,
        ForTabs,
        ForTabsList,
        ForToolbar,
        ForMenubar,
        ForTree,
        ForNavigationMenu,
        ForStepper,
        ForStepperList,
      ],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<ul forListbox aria-label="Toppings"></ul>
        <div forTabs>
          <div forTabsList aria-label="Sections"></div>
        </div>
        <div forToolbar aria-label="Formatting"></div>
        <div forMenubar aria-label="Main"></div>
        <ul forTree [totalCount]="0" aria-label="Files"></ul>
        <nav forNavigationMenu aria-label="Site"></nav>
        <div forStepper>
          <ol forStepperList aria-label="Steps"></ol>
        </div>`,
    })
    class Host {}

    it('every root preserves a consumer-set static aria-label', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(attrOf(fixture, '[forListbox]', 'aria-label')).toBe('Toppings');
      expect(attrOf(fixture, '[forTabsList]', 'aria-label')).toBe('Sections');
      expect(attrOf(fixture, '[forToolbar]', 'aria-label')).toBe('Formatting');
      expect(attrOf(fixture, '[forMenubar]', 'aria-label')).toBe('Main');
      expect(attrOf(fixture, '[forTree]', 'aria-label')).toBe('Files');
      expect(attrOf(fixture, '[forNavigationMenu]', 'aria-label')).toBe('Site');
      expect(attrOf(fixture, '[forStepperList]', 'aria-label')).toBe('Steps');
    });

    it('emits the [ariaLabel] input when the host carries no static value', async () => {
      @Component({
        imports: [ForListbox],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `<ul forListbox [ariaLabel]="'Library'"></ul>`,
      })
      class InputHost {}
      const fixture = mount(InputHost);
      await flush(fixture);
      expect(attrOf(fixture, '[forListbox]', 'aria-label')).toBe('Library');
    });

    it('emits no aria-label when neither channel is set', async () => {
      @Component({
        imports: [ForListbox],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `<ul forListbox></ul>`,
      })
      class BareHost {}
      const fixture = mount(BareHost);
      await flush(fixture);
      expect(attrOf(fixture, '[forListbox]', 'aria-label')).toBeNull();
    });

    // The static-only boundary of #659 / #1454, carried over verbatim: a
    // consumer `[attr.aria-label]="expr"` binding evaluates after directive
    // construction, so it is invisible to adoption and the directive's own host
    // binding still wins.
    it('does NOT adopt a consumer [attr.aria-label] binding', async () => {
      @Component({
        imports: [ForListbox],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `<ul forListbox [ariaLabel]="'Library'" [attr.aria-label]="bound"></ul>`,
      })
      class BoundHost {
        readonly bound = 'Toppings';
      }
      const fixture = mount(BoundHost);
      await flush(fixture);
      expect(attrOf(fixture, '[forListbox]', 'aria-label')).toBe('Library');
    });
  });

  describe('Slider', () => {
    @Component({
      imports: [ForSlider, ForSliderThumb],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forSlider [(value)]="value">
        <span forSliderThumb [index]="0" ariaLabel="Minimum" aria-label="Lowest price"></span>
      </div>`,
    })
    class Host {
      readonly value = signal<readonly number[]>([50]);
    }

    it('thumb preserves a consumer-set static aria-label over the [ariaLabel] input', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(attrOf(fixture, '[forSliderThumb]', 'aria-label')).toBe('Lowest price');
    });
  });

  describe('Dialog / Drawer', () => {
    @Component({
      imports: [ForDialog, ForDrawer],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `@if (open()) {
        <div forDialog (dismiss)="open.set(false)" ariaLabel="Input" aria-label="Confirm">Body</div>
        <div forDrawer (dismiss)="open.set(false)" ariaLabel="Input" aria-label="Filters">Body</div>
      }`,
    })
    class Host {
      readonly open = signal(true);
    }

    it('both surfaces prefer the static aria-label over the [ariaLabel] input', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(attrOf(fixture, '[forDialog]', 'aria-label')).toBe('Confirm');
      expect(attrOf(fixture, '[forDrawer]', 'aria-label')).toBe('Filters');
    });
  });

  describe('Select', () => {
    @Component({
      imports: [ForSelect, ForSelectTrigger, ForSelectContent],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forSelect [(value)]="value" [(open)]="open">
        <button forSelectTrigger>Select</button>
        @if (open()) {
          <div forSelectContent aria-label="Toppings"></div>
        }
      </div>`,
    })
    class Host {
      readonly value = signal<readonly string[]>([]);
      readonly open = signal(true);
    }

    // `aria-labelledby` outranks `aria-label` in ARIA, so adopting the static
    // name is only meaningful if the surface also drops its generated
    // trigger-id fallback — otherwise the trigger's text would still be the
    // announced name.
    it('content adopts the static aria-label and drops the trigger-id fallback', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(attrOf(fixture, '[forSelectContent]', 'aria-label')).toBe('Toppings');
      expect(attrOf(fixture, '[forSelectContent]', 'aria-labelledby')).toBeNull();
    });

    it('still falls back to the trigger id when the surface has no static name', async () => {
      @Component({
        imports: [ForSelect, ForSelectTrigger, ForSelectContent],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `<div forSelect [(value)]="value" [(open)]="open">
          <button forSelectTrigger id="trigger-id">Select</button>
          @if (open()) {
            <div forSelectContent></div>
          }
        </div>`,
      })
      class NoLabelHost {
        readonly value = signal<readonly string[]>([]);
        readonly open = signal(true);
      }
      const fixture = mount(NoLabelHost);
      await flush(fixture);
      expect(attrOf(fixture, '[forSelectContent]', 'aria-label')).toBeNull();
      expect(attrOf(fixture, '[forSelectContent]', 'aria-labelledby')).toBe('trigger-id');
    });
  });

  describe('DropdownMenu / Menu', () => {
    @Component({
      imports: [ForDropdownMenu, ForDropdownMenuTrigger, ForMenuContent, ForMenuItem],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forDropdownMenu [(open)]="open">
        <button forDropdownMenuTrigger>Options</button>
        @if (open()) {
          <div forMenuContent aria-label="Row actions">
            <button forMenuItem>A</button>
          </div>
        }
      </div>`,
    })
    class Host {
      readonly open = signal(true);
    }

    it('content adopts the static aria-label and drops the trigger-id fallback', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(attrOf(fixture, '[forMenuContent]', 'aria-label')).toBe('Row actions');
      expect(attrOf(fixture, '[forMenuContent]', 'aria-labelledby')).toBeNull();
    });
  });

  describe('Combobox', () => {
    @Component({
      imports: [
        ForCombobox,
        ForComboboxInput,
        ForComboboxContent,
        ForComboboxList,
        ForComboboxClear,
      ],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forCombobox [(query)]="query" [(value)]="value" [(open)]="open">
        <input forComboboxInput />
        <button forComboboxClear aria-label="Reset filter">x</button>
        @if (open()) {
          <div forComboboxContent aria-label="Results surface">
            <div forComboboxList aria-label="Results"></div>
          </div>
        }
      </div>`,
    })
    class Host {
      readonly query = signal('');
      readonly value = signal<readonly string[]>([]);
      readonly open = signal(true);
    }

    it('content, list, and clear button preserve a consumer-set static aria-label', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(attrOf(fixture, '[forComboboxContent]', 'aria-label')).toBe('Results surface');
      expect(attrOf(fixture, '[forComboboxList]', 'aria-label')).toBe('Results');
      expect(attrOf(fixture, '[forComboboxClear]', 'aria-label')).toBe('Reset filter');
    });

    it('the list drops its input-id fallback so the adopted name wins', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(attrOf(fixture, '[forComboboxList]', 'aria-labelledby')).toBeNull();
    });
  });

  describe('Popover / DatePicker / TimePicker', () => {
    @Component({
      imports: [
        ForPopover,
        ForPopoverTrigger,
        ForPopoverContent,
        ForDatePicker,
        ForDatePickerTrigger,
        ForDatePickerContent,
        ForTimePicker,
        ForTimePickerTrigger,
        ForTimePickerContent,
      ],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forPopover [(open)]="open">
          <button forPopoverTrigger>Toggle</button>
          @if (open()) {
            <div forPopoverContent aria-label="Filters"></div>
          }
        </div>
        <div forDatePicker [(value)]="date" [(open)]="open">
          <button forDatePickerTrigger>Pick</button>
          @if (open()) {
            <div forDatePickerContent aria-label="Choose a date"></div>
          }
        </div>
        <div forTimePicker [(value)]="date" [(open)]="open">
          <button forTimePickerTrigger>Pick</button>
          @if (open()) {
            <div forTimePickerContent aria-label="Choose a time"></div>
          }
        </div>`,
    })
    class Host {
      readonly open = signal(true);
      readonly date = signal<Date | null>(null);
    }

    it('every anchored surface preserves a consumer-set static aria-label', async () => {
      const fixture = mount(Host, [...provideNativeDateAdapter()]);
      await flush(fixture);
      expect(attrOf(fixture, '[forPopoverContent]', 'aria-label')).toBe('Filters');
      expect(attrOf(fixture, '[forDatePickerContent]', 'aria-label')).toBe('Choose a date');
      expect(attrOf(fixture, '[forTimePickerContent]', 'aria-label')).toBe('Choose a time');
    });

    it('the picker surfaces drop their trigger-id fallback so the adopted name wins', async () => {
      const fixture = mount(Host, [...provideNativeDateAdapter()]);
      await flush(fixture);
      expect(attrOf(fixture, '[forDatePickerContent]', 'aria-labelledby')).toBeNull();
      expect(attrOf(fixture, '[forTimePickerContent]', 'aria-labelledby')).toBeNull();
    });
  });

  describe('defaults-backed mandatory names', () => {
    @Component({
      imports: [ForBreadcrumbs, ForSearch, ForSearchClear, ForSearchGroup],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<nav forBreadcrumbs aria-label="You are here"></nav>
        <div forSearchGroup>
          <input forSearch [(value)]="query" />
          <button forSearchClear aria-label="Reset search">x</button>
        </div>`,
    })
    class Host {
      readonly query = signal('coffee');
    }

    it('a static aria-label overrides the scope default', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(attrOf(fixture, '[forBreadcrumbs]', 'aria-label')).toBe('You are here');
      expect(attrOf(fixture, '[forSearchClear]', 'aria-label')).toBe('Reset search');
    });

    it('keeps emitting the scope default when the host has no static value', async () => {
      @Component({
        imports: [ForBreadcrumbs],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `<nav forBreadcrumbs></nav>`,
      })
      class DefaultHost {}
      const fixture = mount(DefaultHost);
      await flush(fixture);
      expect(attrOf(fixture, '[forBreadcrumbs]', 'aria-label')).toBe('Breadcrumb');
    });
  });

  // Documented `keep` decisions: these hosts compute a per-instance accessible
  // name (positional, per-datum, or state-swapping) and are stamped in a
  // repeat, so a single static attribute would name every instance identically
  // - an authoring error rather than an override. They never resolve to `null`,
  // so nothing is erased either. The supported per-instance channel stays the
  // reactive input ([ariaLabel] here) or the scope's label builder.
  describe('positional labels are deliberately NOT adopted', () => {
    @Component({
      imports: [ForCarousel, ForCarouselTrack, ForCarouselSlide],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forCarousel>
        <div forCarouselTrack>
          <div forCarouselSlide aria-label="Static">One</div>
          <div forCarouselSlide>Two</div>
        </div>
      </div>`,
    })
    class Host {}

    it('carousel slide keeps its positional label', async () => {
      const fixture = mount(Host);
      await flush(fixture);
      expect(attrOf(fixture, '[forCarouselSlide]', 'aria-label')).toBe('1 of 2');
    });
  });
});
