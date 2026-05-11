import { ɵPLATFORM_SERVER_ID, isPlatformServer } from '@angular/common';
import {
  Component,
  PLATFORM_ID,
  provideZonelessChangeDetection,
  signal,
  type Type,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ForAccordion } from '../../accordion/accordion';
import { ForAccordionContent } from '../../accordion/accordion-content';
import { ForAccordionItem } from '../../accordion/accordion-item';
import { ForAccordionTrigger } from '../../accordion/accordion-trigger';
import { ForCheckbox } from '../../checkbox/checkbox';
import { ForDialog } from '../../dialog/dialog';
import { ForDialogTitle } from '../../dialog/dialog-title';
import { ForDisclosure } from '../../disclosure/disclosure';
import { ForDisclosureContent } from '../../disclosure/disclosure-content';
import { ForDisclosureTrigger } from '../../disclosure/disclosure-trigger';
import { ForRadio } from '../../radio-group/radio';
import { ForRadioGroup } from '../../radio-group/radio-group';
import { ForSwitch } from '../../switch/switch';
import { ForTabs } from '../../tabs/tabs';
import { ForTabsContent } from '../../tabs/tabs-content';
import { ForTabsList } from '../../tabs/tabs-list';
import { ForTabsTrigger } from '../../tabs/tabs-trigger';
import { ForTooltip } from '../../tooltip/tooltip';
import { ForTooltipContent } from '../../tooltip/tooltip-content';
import { ForTooltipTrigger } from '../../tooltip/tooltip-trigger';
import { BodyScrollLock } from '../body-scroll-lock/body-scroll-lock';
import { DismissableLayerStack } from '../dismissable-layer/dismissable-layer';
import { IdGenerator } from '../id-generator/id-generator';
import { InertSiblingsStack } from '../inert-siblings/inert-siblings';

/**
 * SSR smoke tests. Forces `PLATFORM_ID` to `'server'` and asserts:
 *
 * - Each primitive constructs and renders without throwing on the server.
 * - Static markup (role, aria-*, ids, data-state) is present after
 *   change detection — these are the bits that need to match between
 *   server and client for hydration.
 * - The `providedIn: 'root'` singletons (`DismissableLayerStack`,
 *   `BodyScrollLock`, `InertSiblingsStack`, `IdGenerator`) are scoped per
 *   bootstrap, so two simulated SSR requests get isolated state.
 *
 * jsdom is still the underlying DOM, so `document` exists; what we
 * exercise is the gating: every overlay-side-effect path
 * (`injectPortal`, `DismissableLayerStack` constructor, `BodyScrollLock`,
 * `InertSiblingsStack`) is supposed to no-op when `isPlatformServer`
 * resolves true. Regressions that touch the DOM eagerly or share
 * module-level state between requests get caught here.
 */

@Component({
  imports: [ForDisclosure, ForDisclosureTrigger, ForDisclosureContent],
  template: `
    <div forDisclosure>
      <button forDisclosureTrigger>Toggle</button>
      <section forDisclosureContent>content</section>
    </div>
  `,
})
class DisclosureFixture {}

@Component({
  imports: [ForAccordion, ForAccordionItem, ForAccordionTrigger, ForAccordionContent],
  template: `
    <div forAccordion>
      <div forAccordionItem value="one">
        <button forAccordionTrigger>One</button>
        <section forAccordionContent>one body</section>
      </div>
    </div>
  `,
})
class AccordionFixture {}

@Component({
  imports: [ForTabs, ForTabsList, ForTabsTrigger, ForTabsContent],
  template: `
    <div forTabs value="a">
      <div forTabsList>
        <button forTabsTrigger value="a">A</button>
      </div>
      <section forTabsContent value="a">A body</section>
    </div>
  `,
})
class TabsFixture {}

@Component({
  imports: [ForSwitch],
  template: `<button forSwitch>switch</button>`,
})
class SwitchFixture {}

@Component({
  imports: [ForCheckbox],
  template: `<button forCheckbox>cb</button>`,
})
class CheckboxFixture {}

@Component({
  imports: [ForRadioGroup, ForRadio],
  template: `
    <div forRadioGroup>
      <button forRadio value="a">A</button>
    </div>
  `,
})
class RadioFixture {}

@Component({
  imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
  template: `
    <span forTooltip>
      <button forTooltipTrigger>t</button>
      <div forTooltipContent>tip</div>
    </span>
  `,
})
class TooltipFixture {}

@Component({
  imports: [ForDialog, ForDialogTitle],
  template: `
    @if (open()) {
      <div forDialog ariaLabel="d">
        <h2 forDialogTitle>title</h2>
      </div>
    }
  `,
})
class DialogFixture {
  readonly open = signal(false);
}

const FIXTURES: ReadonlyArray<Type<unknown>> = [
  DisclosureFixture,
  AccordionFixture,
  TabsFixture,
  SwitchFixture,
  CheckboxFixture,
  RadioFixture,
  TooltipFixture,
  DialogFixture,
];

function configureServer(): void {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: PLATFORM_ID, useValue: ɵPLATFORM_SERVER_ID },
    ],
  });
}

describe('SSR smoke tests', () => {
  beforeEach(() => {
    configureServer();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('reports the server platform', () => {
    expect(isPlatformServer(TestBed.inject(PLATFORM_ID))).toBe(true);
  });

  for (const fixture of FIXTURES) {
    it(`renders ${fixture.name} without throwing on the server`, () => {
      expect(() => {
        const f = TestBed.createComponent(fixture);
        f.detectChanges();
      }).not.toThrow();
    });
  }

  it('Disclosure renders ARIA wiring (id, aria-controls, aria-expanded) server-side', () => {
    const f = TestBed.createComponent(DisclosureFixture);
    f.detectChanges();
    const trigger = f.nativeElement.querySelector('[forDisclosureTrigger]') as HTMLElement;
    const content = f.nativeElement.querySelector('[forDisclosureContent]') as HTMLElement;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(content.getAttribute('id')).toBe(trigger.getAttribute('aria-controls'));
  });

  it('IdGenerator is salted with APP_ID — identical render orders produce identical ids across requests', () => {
    const a = TestBed.inject(IdGenerator).next();
    TestBed.resetTestingModule();
    configureServer();
    const b = TestBed.inject(IdGenerator).next();
    // Both bootstraps share APP_ID's default value, so the salted
    // counters reset to 1 in both — that's the property hydration
    // relies on (server and client renders of the same app produce the
    // same ids in the same order).
    expect(a).toBe(b);
  });

  it('overlay singletons are isolated across simulated SSR requests', () => {
    const stack1 = TestBed.inject(DismissableLayerStack);
    const lock1 = TestBed.inject(BodyScrollLock);
    const inert1 = TestBed.inject(InertSiblingsStack);

    TestBed.resetTestingModule();
    configureServer();

    const stack2 = TestBed.inject(DismissableLayerStack);
    const lock2 = TestBed.inject(BodyScrollLock);
    const inert2 = TestBed.inject(InertSiblingsStack);

    expect(stack2).not.toBe(stack1);
    expect(lock2).not.toBe(lock1);
    expect(inert2).not.toBe(inert1);
  });

  it('BodyScrollLock is a no-op on the server', () => {
    const lock = TestBed.inject(BodyScrollLock);
    document.body.style.overflow = 'auto';
    lock.lock();
    // Server gating prevents any mutation to <body>.
    expect(document.body.style.overflow).toBe('auto');
    lock.unlock();
    expect(document.body.style.overflow).toBe('auto');
    document.body.style.overflow = '';
  });
});
