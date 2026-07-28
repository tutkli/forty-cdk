import {
  ChangeDetectionStrategy,
  Component,
  provideZonelessChangeDetection,
  signal,
  type Type,
} from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { ForCheckbox } from 'forty-cdk/checkbox';
import { ForListbox, ForListboxOption } from 'forty-cdk/listbox';
import { ForPopover, ForPopoverTrigger } from 'forty-cdk/popover';
import { ForSearch, ForSearchClear, ForSearchGroup } from 'forty-cdk/search';
import { ForSwitch } from 'forty-cdk/switch';
import { ForToolbar, ForToolbarButton } from 'forty-cdk/toolbar';

/**
 * Library-wide contract for the forced `type="button"` (#1512).
 *
 * Every piece that wants submit protection resolves it through the
 * `hostButtonType` core seam and host-binds `[attr.type]`, replacing the static
 * host attribute `type: 'button'` that was wrong in both directions: it stamped
 * an invalid `type` onto non-button hosts, and Angular let a consumer's static
 * `type="submit"` win over it — so the submit protection 46 pieces documented
 * did not exist, and a checkbox click inside a `<form>` navigated away instead
 * of toggling.
 *
 * One piece per family is audited here (form control, overlay trigger,
 * collection option, icon / push button); the seam's own unit coverage lives in
 * `core/host-type/host-type.spec.ts`, and `[forButton]`'s deliberately opposite
 * contract — it *preserves* a consumer `type`, because a `[forButton]` on a real
 * submit button is legitimate usage — is asserted in `button/src/button.spec.ts`.
 */

function mount<T>(host: Type<T>): ComponentFixture<T> {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(host);
  fixture.detectChanges();
  return fixture;
}

function typeOf<T>(fixture: ComponentFixture<T>, selector: string): string | null {
  const el = fixture.nativeElement.querySelector(selector) as HTMLElement | null;
  if (!el) {
    throw new Error(`No element matched "${selector}"`);
  }
  return el.getAttribute('type');
}

describe('forced type="button" (#1512)', () => {
  describe('form control — [forCheckbox] / [forSwitch]', () => {
    @Component({
      imports: [ForCheckbox, ForSwitch],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<button forCheckbox type="submit"></button>
        <div forCheckbox></div>
        <button forSwitch type="submit"></button>
        <div forSwitch></div>`,
    })
    class Host {}

    it('forces type="button" over a consumer-set type="submit" on a button host', () => {
      const fixture = mount(Host);
      expect(typeOf(fixture, 'button[forCheckbox]')).toBe('button');
      expect(typeOf(fixture, 'button[forSwitch]')).toBe('button');
    });

    it('emits no type attribute on a non-button host', () => {
      const fixture = mount(Host);
      expect(typeOf(fixture, 'div[forCheckbox]')).toBeNull();
      expect(typeOf(fixture, 'div[forSwitch]')).toBeNull();
    });
  });

  describe('overlay trigger — [forPopoverTrigger]', () => {
    @Component({
      imports: [ForPopover, ForPopoverTrigger],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forPopover>
          <button forPopoverTrigger type="submit">Open</button>
        </div>
        <div forPopover>
          <span forPopoverTrigger>Open</span>
        </div>`,
    })
    class Host {}

    it('forces type="button" on a button host and emits none on a span host', () => {
      const fixture = mount(Host);
      expect(typeOf(fixture, 'button[forPopoverTrigger]')).toBe('button');
      expect(typeOf(fixture, 'span[forPopoverTrigger]')).toBeNull();
    });
  });

  describe('collection option — [forListboxOption]', () => {
    @Component({
      imports: [ForListbox, ForListboxOption],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forListbox>
        <button forListboxOption value="a" type="submit">A</button>
        <div forListboxOption value="b">B</div>
      </div>`,
    })
    class Host {}

    it('forces type="button" on a button host and emits none on a div host', () => {
      const fixture = mount(Host);
      expect(typeOf(fixture, 'button[forListboxOption]')).toBe('button');
      expect(typeOf(fixture, 'div[forListboxOption]')).toBeNull();
    });
  });

  describe('icon / push button — [forSearchClear] / [forToolbarButton]', () => {
    @Component({
      imports: [ForSearch, ForSearchClear, ForSearchGroup, ForToolbar, ForToolbarButton],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forSearchGroup>
          <input forSearch [(value)]="query" />
          <button forSearchClear type="submit" aria-label="Reset">x</button>
        </div>
        <div forToolbar>
          <button forToolbarButton type="submit">Bold</button>
          <div forToolbarButton>Italic</div>
        </div>`,
    })
    class Host {
      readonly query = signal('coffee');
    }

    it('forces type="button" on a button host and emits none on a div host', () => {
      const fixture = mount(Host);
      expect(typeOf(fixture, 'button[forSearchClear]')).toBe('button');
      expect(typeOf(fixture, 'button[forToolbarButton]')).toBe('button');
      expect(typeOf(fixture, 'div[forToolbarButton]')).toBeNull();
    });
  });

  /**
   * The functional half of the defect: the attribute value above is only
   * interesting because it is what stops the click from submitting. The plain
   * `<button type="submit">` in the same form is the control case — it proves
   * this environment really does run form submission on a submit-button click,
   * so the `[forCheckbox]` assertion cannot pass vacuously.
   */
  describe('submit protection inside a <form>', () => {
    @Component({
      imports: [ForCheckbox],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<form (submit)="onSubmit($event)">
        <button forCheckbox type="submit" [(checked)]="agreed"></button>
        <button data-testid="native-submit" type="submit">Send</button>
      </form>`,
    })
    class Host {
      readonly agreed = signal(false);
      readonly submits = signal(0);

      onSubmit(event: Event): void {
        event.preventDefault();
        this.submits.update((count) => count + 1);
      }
    }

    it('does not submit the form when the checkbox is clicked', () => {
      const fixture = mount(Host);
      const host = fixture.componentInstance;

      (fixture.nativeElement.querySelector('[data-testid="native-submit"]') as HTMLElement).click();
      expect(host.submits()).toBe(1);

      (fixture.nativeElement.querySelector('button[forCheckbox]') as HTMLElement).click();
      fixture.detectChanges();

      expect(host.submits()).toBe(1);
      expect(host.agreed()).toBe(true);
    });
  });
});
