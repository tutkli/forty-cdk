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

import { LIBRARY_CODE, README_SOURCES } from '../test-utils/source-scan';

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
 * One piece per family is mounted here (form control, overlay trigger,
 * collection option, icon / push button) to pin the behaviour; which pieces owe
 * it is the derived roster at the end of this file. The seam's own unit coverage
 * lives in `core/host-attributes/host-type.spec.ts`, and `[forButton]`'s
 * deliberately opposite contract — it *preserves* a consumer `type`, because a
 * `[forButton]` on a real submit button is legitimate usage — is asserted in
 * `button/src/button.spec.ts`.
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

const BUTTON_START_TAG = /<button\b([^>]*)>/g;

const PIECE_ATTRIBUTE = /(?:^|[\s[(])\[?(for[A-Z][A-Za-z]*)\]?(?=[\s=>\]]|$)/g;

const SELECTOR = /selector:\s*'([^']*)'/g;

const ownsNoClickActivation = (code: string): boolean => !code.includes(`'(click)'`);

/**
 * Pieces a README places on a `<button>` that deliberately leave its `type`
 * alone, each with the condition that makes it right. A condition rather than a
 * bare name, so an excluded piece that grows its own activation fails the
 * roster instead of staying parked here.
 */
const EXCLUSIONS: Readonly<Record<string, { reason: string; holds: (code: string) => boolean }>> = {
  forButton: {
    reason:
      'preserves a consumer `type` through its own `resolvedType`: a real submit button is legitimate usage',
    holds: (code) => code.includes('resolvedType') && !code.includes('hostButtonType('),
  },
  forTooltipTrigger: {
    reason:
      'describes the control it sits on and owns no activation, so a submit button with a tooltip stays one',
    holds: ownsNoClickActivation,
  },
  forContextMenuTrigger: {
    reason:
      'opens on a context-menu gesture rather than a click, so it owns no activation of its host',
    holds: ownsNoClickActivation,
  },
  forDialogInitialFocus: {
    reason:
      'marks where focus lands on open and owns no activation, so a dialog form submit button may carry it',
    holds: ownsNoClickActivation,
  },
};

/** Every `for…` attribute a README writes on a `<button>` start tag, with the READMEs that do. */
function readmeButtonPieces(): ReadonlyMap<string, readonly string[]> {
  const found = new Map<string, string[]>();
  for (const [path, markdown] of README_SOURCES) {
    for (const tag of markdown.matchAll(BUTTON_START_TAG)) {
      for (const attribute of tag[1]!.matchAll(PIECE_ATTRIBUTE)) {
        const readmes = found.get(attribute[1]!) ?? [];
        if (!readmes.includes(path)) {
          readmes.push(path);
        }
        found.set(attribute[1]!, readmes);
      }
    }
  }
  return found;
}

/** The library sources whose decorator selector names `[<attribute>]`. */
function declaringSources(attribute: string): readonly string[] {
  return [...LIBRARY_CODE]
    .filter(([, code]) =>
      [...code.matchAll(SELECTOR)].some((match) => match[1]!.includes(`[${attribute}]`)),
    )
    .map(([path]) => path);
}

/**
 * The roster is derived from the markup the READMEs tell a consumer to write: a
 * piece documented on a bare `<button>` is one a consumer will put inside a
 * `<form>`, so it owes the forced `type="button"` whether or not anyone
 * remembered to add it. The stepper trigger, the table column resizer and the
 * table select-all checkbox shipped without it while a one-per-family sample
 * stayed green ([#2259](https://github.com/tutkli/forty-cdk/issues/2259)).
 */
describe('forced type="button" roster', () => {
  const pieces = readmeButtonPieces();

  it('reads every README and finds the pieces documented on a <button>', () => {
    expect(README_SOURCES.size).toBeGreaterThan(50);
    expect(pieces.size).toBeGreaterThan(40);
    expect([...pieces.keys()]).toEqual(
      expect.arrayContaining(['forStepperTrigger', 'forTableColumnResizer', 'forCheckbox']),
    );
  });

  it('resolves every documented piece to exactly one declaring source', () => {
    const unresolved = [...pieces.keys()]
      .map((attribute) => [attribute, declaringSources(attribute)] as const)
      .filter(([, sources]) => sources.length !== 1)
      .map(([attribute, sources]) => `${attribute}: ${sources.join(', ') || 'no source'}`);

    expect(unresolved).toEqual([]);
  });

  it('forces type="button" through hostButtonType on every piece documented on a <button>', () => {
    const missing = [...pieces]
      .filter(([attribute]) => !(attribute in EXCLUSIONS))
      .flatMap(([attribute, readmes]) =>
        declaringSources(attribute)
          .filter((path) => !LIBRARY_CODE.get(path)!.includes('hostButtonType('))
          .map(
            (path) => `${attribute} (${path}), documented on a <button> in ${readmes.join(', ')}`,
          ),
      );

    expect(missing).toEqual([]);
  });

  it('keeps every exclusion documented on a <button> and its condition holding', () => {
    const stale = Object.entries(EXCLUSIONS)
      .filter(([attribute, { holds }]) => {
        const sources = declaringSources(attribute);
        return (
          !pieces.has(attribute) || sources.length !== 1 || !holds(LIBRARY_CODE.get(sources[0]!)!)
        );
      })
      .map(([attribute, { reason }]) => `${attribute}: ${reason}`);

    expect(stale).toEqual([]);
  });
});
