import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { renderHost } from '../../src/test-utils/render';
import { withReducedMotion } from '../../src/test-utils/reduced-motion';
import { ForDisclosure } from './disclosure';
import { ForDisclosureContent } from './disclosure-content';
import { ForDisclosureTrigger } from './disclosure-trigger';

@Component({
  imports: [ForDisclosure, ForDisclosureTrigger, ForDisclosureContent],
  template: `
    <div forDisclosure [(open)]="isOpen" [disabled]="isDisabled()">
      <button type="button" forDisclosureTrigger>Toggle</button>
      <section forDisclosureContent>Panel</section>
    </div>
  `,
})
class DisclosureHost {
  readonly isOpen = signal(false);
  readonly isDisabled = signal(false);
}

@Component({
  imports: [ForDisclosure, ForDisclosureTrigger, ForDisclosureContent],
  template: `
    <div forDisclosure>
      <button type="button" forDisclosureTrigger>A</button>
      <section forDisclosureContent>A</section>
    </div>
    <div forDisclosure>
      <button type="button" forDisclosureTrigger>B</button>
      <section forDisclosureContent>B</section>
    </div>
  `,
})
class TwoDisclosureHost {}

@Component({
  imports: [ForDisclosure, ForDisclosureTrigger, ForDisclosureContent],
  template: `
    <form (submit)="submitted = true">
      <div forDisclosure>
        <button forDisclosureTrigger>Toggle</button>
        <section forDisclosureContent>Panel</section>
      </div>
    </form>
  `,
})
class FormDisclosureHost {
  submitted = false;
}

describe('ForDisclosure', () => {
  describe('render & wiring', () => {
    it('host-binds type="button" so a trigger inside a <form> does not submit on toggle', () => {
      const { fixture, query, flush } = renderHost(FormDisclosureHost);
      const trigger = query<HTMLButtonElement>('button')!;

      expect(trigger.getAttribute('type')).toBe('button');

      trigger.click();
      flush();

      expect(fixture.componentInstance.submitted).toBe(false);
    });

    it('links the trigger to the content via aria-controls once open', () => {
      const { fixture, query, flush } = renderHost(DisclosureHost);

      const trigger = query<HTMLButtonElement>('button')!;
      const content = query<HTMLElement>('section')!;

      expect(trigger.hasAttribute('aria-controls')).toBe(false);

      fixture.componentInstance.isOpen.set(true);
      flush();

      expect(trigger.getAttribute('aria-controls')).toBe(content.id);
    });

    it('gates aria-controls to the open state, mirroring the overlay triggers', () => {
      const { fixture, query, flush } = renderHost(DisclosureHost);
      const trigger = query<HTMLButtonElement>('button')!;

      expect(trigger.hasAttribute('aria-controls')).toBe(false);

      fixture.componentInstance.isOpen.set(true);
      flush();
      expect(trigger.hasAttribute('aria-controls')).toBe(true);

      fixture.componentInstance.isOpen.set(false);
      flush();
      expect(trigger.hasAttribute('aria-controls')).toBe(false);
    });

    it('produces unique ids across instances', () => {
      const { queryAll } = renderHost(TwoDisclosureHost);

      const triggers = queryAll<HTMLButtonElement>('button');
      const contents = queryAll<HTMLElement>('section');

      expect(triggers[0]!.id).not.toBe(triggers[1]!.id);
      expect(contents[0]!.id).not.toBe(contents[1]!.id);
    });
  });

  describe('initial state', () => {
    it('renders closed by default', () => {
      const { query } = renderHost(DisclosureHost);

      const trigger = query<HTMLButtonElement>('button')!;
      const content = query<HTMLElement>('section')!;
      const root = query<HTMLElement>('[forDisclosure]')!;

      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(content.getAttribute('data-state')).toBe('closed');
      expect(trigger.getAttribute('data-state')).toBe('closed');
      expect(root.getAttribute('data-state')).toBe('closed');
    });
  });

  describe('toggle via click', () => {
    it('opens on click and closes on a second click', () => {
      const { fixture, query, flush } = renderHost(DisclosureHost);
      const trigger = query<HTMLButtonElement>('button')!;
      const content = query<HTMLElement>('section')!;

      trigger.click();
      flush();

      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(content.getAttribute('data-state')).toBe('open');
      expect(fixture.componentInstance.isOpen()).toBe(true);

      trigger.click();
      flush();

      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(content.getAttribute('data-state')).toBe('closed');
      expect(fixture.componentInstance.isOpen()).toBe(false);
    });
  });

  describe('two-way binding [(open)]', () => {
    it('reflects external open writes into the DOM', () => {
      const { fixture, query, flush } = renderHost(DisclosureHost);
      const trigger = query<HTMLButtonElement>('button')!;
      const content = query<HTMLElement>('section')!;

      fixture.componentInstance.isOpen.set(true);
      flush();

      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(content.getAttribute('data-state')).toBe('open');
    });

    it('writes back to the host signal when the trigger is clicked', () => {
      const { fixture, query, flush } = renderHost(DisclosureHost);
      const trigger = query<HTMLButtonElement>('button')!;

      trigger.click();
      flush();

      expect(fixture.componentInstance.isOpen()).toBe(true);
    });
  });

  describe('disabled', () => {
    it('ignores click and reflects the disabled attribute on the trigger', () => {
      const { fixture, query, flush } = renderHost(DisclosureHost);
      fixture.componentInstance.isDisabled.set(true);
      flush();

      const trigger = query<HTMLButtonElement>('button')!;
      const root = query<HTMLElement>('[forDisclosure]')!;

      expect(trigger.hasAttribute('disabled')).toBe(true);
      expect(trigger.getAttribute('aria-disabled')).toBe('true');
      expect(root.getAttribute('data-disabled')).toBe('');

      trigger.click();
      flush();

      expect(fixture.componentInstance.isOpen()).toBe(false);
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
    });

    it('propagates data-disabled to trigger and content', () => {
      const { fixture, query, flush } = renderHost(DisclosureHost);
      fixture.componentInstance.isDisabled.set(true);
      flush();

      const trigger = query<HTMLButtonElement>('button')!;
      const content = query<HTMLElement>('section')!;
      const root = query<HTMLElement>('[forDisclosure]')!;

      expect(root.getAttribute('data-disabled')).toBe('');
      expect(trigger.getAttribute('data-disabled')).toBe('');
      expect(content.getAttribute('data-disabled')).toBe('');

      fixture.componentInstance.isDisabled.set(false);
      flush();

      expect(root.hasAttribute('data-disabled')).toBe(false);
      expect(trigger.hasAttribute('data-disabled')).toBe(false);
      expect(content.hasAttribute('data-disabled')).toBe(false);
      // aria-disabled is truthy-only — absent (not "false") on the falsy path.
      expect(trigger.hasAttribute('aria-disabled')).toBe(false);
    });
  });

  describe('per-trigger disabled', () => {
    @Component({
      imports: [ForDisclosure, ForDisclosureTrigger, ForDisclosureContent],
      template: `
        <div forDisclosure [(open)]="isOpen" [disabled]="rootDisabled()">
          <button type="button" forDisclosureTrigger [disabled]="triggerDisabled()">Toggle</button>
          <section forDisclosureContent>Panel</section>
        </div>
      `,
    })
    class TriggerDisabledHost {
      readonly isOpen = signal(false);
      readonly rootDisabled = signal(false);
      readonly triggerDisabled = signal(false);
    }

    it('ignores click when only the trigger is disabled and reflects the effective state', () => {
      const { fixture, query, flush } = renderHost(TriggerDisabledHost);
      fixture.componentInstance.triggerDisabled.set(true);
      flush();

      const trigger = query<HTMLButtonElement>('button')!;
      const root = query<HTMLElement>('[forDisclosure]')!;

      expect(root.hasAttribute('data-disabled')).toBe(false);
      expect(trigger.getAttribute('data-disabled')).toBe('');
      expect(trigger.getAttribute('aria-disabled')).toBe('true');
      expect(trigger.getAttribute('disabled')).toBe('');

      trigger.click();
      flush();

      expect(fixture.componentInstance.isOpen()).toBe(false);
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
    });

    it('reflects root-only disabling on the trigger via the effective state', () => {
      const { fixture, query, flush } = renderHost(TriggerDisabledHost);
      fixture.componentInstance.rootDisabled.set(true);
      flush();

      const trigger = query<HTMLButtonElement>('button')!;

      expect(trigger.getAttribute('data-disabled')).toBe('');
      expect(trigger.getAttribute('aria-disabled')).toBe('true');
      expect(trigger.getAttribute('disabled')).toBe('');

      trigger.click();
      flush();

      expect(fixture.componentInstance.isOpen()).toBe(false);
    });

    it('stays disabled while either source is set and re-enables once both clear', () => {
      const { fixture, query, flush } = renderHost(TriggerDisabledHost);
      fixture.componentInstance.rootDisabled.set(true);
      fixture.componentInstance.triggerDisabled.set(true);
      flush();

      const trigger = query<HTMLButtonElement>('button')!;
      expect(trigger.getAttribute('disabled')).toBe('');

      fixture.componentInstance.rootDisabled.set(false);
      flush();
      expect(trigger.getAttribute('disabled')).toBe('');
      trigger.click();
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);

      fixture.componentInstance.triggerDisabled.set(false);
      flush();
      expect(trigger.hasAttribute('disabled')).toBe(false);
      expect(trigger.hasAttribute('aria-disabled')).toBe(false);
      expect(trigger.hasAttribute('data-disabled')).toBe(false);

      trigger.click();
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);
    });
  });

  describe('used outside [forDisclosure]', () => {
    it('throws a prefixed error from ForDisclosureTrigger', () => {
      @Component({
        imports: [ForDisclosureTrigger],
        template: `<button type="button" forDisclosureTrigger></button>`,
      })
      class OrphanTrigger {}

      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });

      expect(() => TestBed.createComponent(OrphanTrigger)).toThrow(
        /\[forty-cdk\/disclosure\] ForDisclosureTrigger must be used inside a \[forDisclosure\] element\./,
      );
    });

    it('throws a prefixed error from ForDisclosureContent', () => {
      @Component({
        imports: [ForDisclosureContent],
        template: `<section forDisclosureContent></section>`,
      })
      class OrphanContent {}

      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });

      expect(() => TestBed.createComponent(OrphanContent)).toThrow(
        /\[forty-cdk\/disclosure\] ForDisclosureContent must be used inside a \[forDisclosure\] element\./,
      );
    });
  });

  describe('(openChange) output', () => {
    it('emits the new state when the trigger toggles open/closed', () => {
      @Component({
        imports: [ForDisclosure, ForDisclosureTrigger, ForDisclosureContent],
        template: `
          <div forDisclosure (openChange)="emitted.push($event)">
            <button type="button" forDisclosureTrigger>X</button>
            <section forDisclosureContent></section>
          </div>
        `,
      })
      class Host {
        readonly emitted: boolean[] = [];
      }

      const { fixture, query, flush } = renderHost(Host);
      const trigger = query<HTMLButtonElement>('button')!;

      trigger.click();
      flush();
      trigger.click();
      flush();

      expect(fixture.componentInstance.emitted).toEqual([true, false]);
    });

    it('does not emit when the consumer drives `open` externally via [(open)]', () => {
      @Component({
        imports: [ForDisclosure, ForDisclosureTrigger, ForDisclosureContent],
        template: `
          <div forDisclosure [(open)]="isOpen" (openChange)="emitted.push($event)">
            <button type="button" forDisclosureTrigger></button>
            <section forDisclosureContent></section>
          </div>
        `,
      })
      class Host {
        readonly isOpen = signal(false);
        readonly emitted: boolean[] = [];
      }

      const { fixture, flush } = renderHost(Host);
      fixture.componentInstance.isOpen.set(true);
      flush();
      fixture.componentInstance.isOpen.set(false);
      flush();

      expect(fixture.componentInstance.emitted).toEqual([]);
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects state changes after detectChanges without Zone.js', () => {
      const { fixture, query, flush } = renderHost(DisclosureHost);
      const trigger = query<HTMLButtonElement>('button')!;

      expect(trigger.getAttribute('aria-expanded')).toBe('false');

      fixture.componentInstance.isOpen.set(true);
      flush();

      expect(trigger.getAttribute('aria-expanded')).toBe('true');
    });
  });

  describe('prefers-reduced-motion: reduce', () => {
    let restore: () => void;
    beforeEach(() => {
      restore = withReducedMotion();
    });
    afterEach(() => {
      restore();
    });

    it('toggle still flips data-state and aria-expanded under reduced-motion', () => {
      const { fixture, query, flush } = renderHost(DisclosureHost);
      const trigger = query<HTMLButtonElement>('button')!;
      const content = query<HTMLElement>('section')!;

      trigger.click();
      flush();
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(content.getAttribute('data-state')).toBe('open');
      expect(fixture.componentInstance.isOpen()).toBe(true);

      trigger.click();
      flush();
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(content.getAttribute('data-state')).toBe('closed');
      expect(fixture.componentInstance.isOpen()).toBe(false);
    });
  });

  describe('mounted-but-closed a11y', () => {
    it('marks the closed panel aria-hidden + inert and clears both when opened', () => {
      const { fixture, query, flush } = renderHost(DisclosureHost);
      const content = query<HTMLElement>('section')!;

      expect(content.getAttribute('aria-hidden')).toBe('true');
      expect(content.hasAttribute('inert')).toBe(true);

      fixture.componentInstance.isOpen.set(true);
      flush();

      expect(content.hasAttribute('aria-hidden')).toBe(false);
      expect(content.hasAttribute('inert')).toBe(false);

      fixture.componentInstance.isOpen.set(false);
      flush();

      expect(content.getAttribute('aria-hidden')).toBe('true');
      expect(content.hasAttribute('inert')).toBe(true);
    });

    it('does not apply the native [hidden] attribute', () => {
      const { query } = renderHost(DisclosureHost);
      const content = query<HTMLElement>('section')!;
      expect(content.hasAttribute('hidden')).toBe(false);
    });

    it('with @if-driven mounting, the panel unmounts on close (no host attrs to assert)', () => {
      @Component({
        imports: [ForDisclosure, ForDisclosureTrigger, ForDisclosureContent],
        template: `
          <div forDisclosure [(open)]="isOpen">
            <button type="button" forDisclosureTrigger>Toggle</button>
            @if (isOpen()) {
              <section forDisclosureContent>Panel</section>
            }
          </div>
        `,
      })
      class IfHost {
        readonly isOpen = signal(false);
      }

      const { fixture, query, flush } = renderHost(IfHost);
      expect(query<HTMLElement>('section')).toBeNull();

      fixture.componentInstance.isOpen.set(true);
      flush();

      const content = query<HTMLElement>('section')!;
      expect(content).not.toBeNull();
      expect(content.hasAttribute('aria-hidden')).toBe(false);
      expect(content.hasAttribute('inert')).toBe(false);

      fixture.componentInstance.isOpen.set(false);
      flush();

      expect(query<HTMLElement>('section')).toBeNull();
    });
  });
});
