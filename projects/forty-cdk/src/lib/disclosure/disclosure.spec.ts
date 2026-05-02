import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { renderHost } from '../../test-utils/render';
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

describe('ForDisclosure', () => {
  describe('render & wiring', () => {
    it('links the trigger to the content via id and aria-controls', () => {
      const { query } = renderHost(DisclosureHost);

      const trigger = query<HTMLButtonElement>('button')!;
      const content = query<HTMLElement>('section')!;

      expect(trigger.id).toBeTruthy();
      expect(content.id).toBeTruthy();
      expect(trigger.getAttribute('aria-controls')).toBe(content.id);
    });

    it('produces unique ids across instances', () => {
      const { queryAll } = renderHost(TwoDisclosureHost);

      const triggers = queryAll<HTMLButtonElement>('button');
      const contents = queryAll<HTMLElement>('section');

      expect(triggers[0]!.id).not.toBe(triggers[1]!.id);
      expect(contents[0]!.id).not.toBe(contents[1]!.id);
      expect(triggers[0]!.getAttribute('aria-controls')).toBe(contents[0]!.id);
      expect(triggers[1]!.getAttribute('aria-controls')).toBe(contents[1]!.id);
    });
  });

  describe('initial state', () => {
    it('renders closed by default', () => {
      const { query } = renderHost(DisclosureHost);

      const trigger = query<HTMLButtonElement>('button')!;
      const content = query<HTMLElement>('section')!;
      const root = query<HTMLElement>('[forDisclosure]')!;

      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(content.hasAttribute('hidden')).toBe(true);
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
      expect(content.hasAttribute('hidden')).toBe(false);
      expect(content.getAttribute('data-state')).toBe('open');
      expect(fixture.componentInstance.isOpen()).toBe(true);

      trigger.click();
      flush();

      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(content.hasAttribute('hidden')).toBe(true);
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
      expect(content.hasAttribute('hidden')).toBe(false);
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
});
