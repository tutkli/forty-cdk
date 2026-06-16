import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { pressKey, renderHost } from '../../test-utils';
import { assertRovingTabindexContract } from '../../test-utils/contract';
import { ForStepper } from './stepper';
import { ForStepperContent } from './stepper-content';
import { ForStepperIndicator } from './stepper-indicator';
import { ForStepperItem } from './stepper-item';
import { ForStepperList } from './stepper-list';
import { ForStepperNext } from './stepper-next';
import { ForStepperPrevious } from './stepper-previous';
import { ForStepperSeparator } from './stepper-separator';
import { ForStepperTrigger } from './stepper-trigger';
import { provideForStepperDefaults } from './stepper-defaults';

const STEPPER_IMPORTS = [
  ForStepper,
  ForStepperList,
  ForStepperItem,
  ForStepperTrigger,
  ForStepperIndicator,
  ForStepperSeparator,
  ForStepperContent,
  ForStepperNext,
  ForStepperPrevious,
] as const;

interface StepDef {
  label: string;
  completed: boolean;
  optional: boolean;
  disabled: boolean;
  hasError: boolean;
  state: string | null;
}

@Component({
  imports: [...STEPPER_IMPORTS],
  template: `
    <div
      forStepper
      [(selectedIndex)]="selectedIndex"
      [linear]="linear()"
      [mode]="mode()"
      [orientation]="orientation()"
      [activationMode]="activationMode()"
      [loop]="loop()"
      [disabled]="rootDisabled()"
      [dir]="dir()"
    >
      <ol forStepperList [ariaLabel]="listLabel()">
        @for (s of steps(); track $index) {
          <li
            forStepperItem
            [completed]="s.completed"
            [optional]="s.optional"
            [disabled]="s.disabled"
            [hasError]="s.hasError"
            [state]="s.state"
            [attr.data-step]="$index"
          >
            <button type="button" forStepperTrigger [attr.data-trigger]="$index">
              <span forStepperIndicator [attr.data-indicator]="$index"></span>
              {{ s.label }}
            </button>
            @if ($index < steps().length - 1) {
              <span forStepperSeparator [attr.data-sep]="$index"></span>
            }
          </li>
        }
      </ol>
      @for (s of steps(); track $index) {
        <section forStepperContent [attr.data-content]="$index">
          Panel {{ $index }}
          @if (s.hasError) {
            <button type="button" data-inner="true">inner</button>
          }
        </section>
      }
      <button forStepperPrevious data-prev>Back</button>
      <button forStepperNext data-next>Next</button>
    </div>
  `,
})
class StepperHost {
  readonly selectedIndex = signal(0);
  readonly linear = signal(false);
  readonly mode = signal<'interactive' | 'progress'>('interactive');
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
  readonly activationMode = signal<'automatic' | 'manual'>('manual');
  readonly loop = signal(true);
  readonly rootDisabled = signal(false);
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
  readonly listLabel = signal<string | null>('Steps');
  readonly steps = signal<StepDef[]>([
    { label: 'A', completed: false, optional: false, disabled: false, hasError: false, state: null },
    { label: 'B', completed: false, optional: false, disabled: false, hasError: false, state: null },
    { label: 'C', completed: false, optional: false, disabled: false, hasError: false, state: null },
  ]);
}

const triggerAt = (el: HTMLElement, i: number) =>
  el.querySelector<HTMLButtonElement>(`button[data-trigger="${i}"]`)!;

const contentAt = (el: HTMLElement, i: number) =>
  el.querySelector<HTMLElement>(`[data-content="${i}"]`)!;

const itemAt = (el: HTMLElement, i: number) =>
  el.querySelector<HTMLElement>(`[data-step="${i}"]`)!;

const indicatorAt = (el: HTMLElement, i: number) =>
  el.querySelector<HTMLElement>(`[data-indicator="${i}"]`)!;

const sepAt = (el: HTMLElement, i: number) =>
  el.querySelector<HTMLElement>(`[data-sep="${i}"]`)!;

const listEl = (el: HTMLElement) => el.querySelector<HTMLElement>('[forStepperList]')!;
const nextBtn = (el: HTMLElement) => el.querySelector<HTMLElement>('[data-next]')!;
const prevBtn = (el: HTMLElement) => el.querySelector<HTMLElement>('[data-prev]')!;

const triggers = (el: HTMLElement): HTMLElement[] =>
  Array.from(el.querySelectorAll<HTMLElement>('[forStepperTrigger]'));

describe('ForStepper', () => {
  describe('static accessibility — interactive mode', () => {
    it('list has role=tablist and aria-orientation', () => {
      const { el } = renderHost(StepperHost);
      const list = listEl(el);
      expect(list.getAttribute('role')).toBe('tablist');
      expect(list.getAttribute('aria-orientation')).toBe('horizontal');
    });

    it('triggers have role=tab', () => {
      const { el } = renderHost(StepperHost);
      for (let i = 0; i < 3; i++) {
        expect(triggerAt(el, i).getAttribute('role')).toBe('tab');
      }
    });

    it('content panels have role=tabpanel', () => {
      const { el } = renderHost(StepperHost);
      for (let i = 0; i < 3; i++) {
        expect(contentAt(el, i).getAttribute('role')).toBe('tabpanel');
      }
    });

    it('aria-selected is always emitted on triggers', () => {
      const { el } = renderHost(StepperHost);
      expect(triggerAt(el, 0).getAttribute('aria-selected')).toBe('true');
      expect(triggerAt(el, 1).getAttribute('aria-selected')).toBe('false');
      expect(triggerAt(el, 2).getAttribute('aria-selected')).toBe('false');
    });

    it('aria-labelledby on content points at its trigger', async () => {
      const { el, flush } = renderHost(StepperHost);
      await flush();
      for (let i = 0; i < 3; i++) {
        expect(contentAt(el, i).getAttribute('aria-labelledby')).toBe(triggerAt(el, i).id);
      }
    });

    it('aria-controls is emitted only on the current trigger', async () => {
      const { el, instance, fixture, flush } = renderHost(StepperHost);
      await flush();
      expect(triggerAt(el, 0).getAttribute('aria-controls')).toBe(contentAt(el, 0).id);
      expect(triggerAt(el, 1).hasAttribute('aria-controls')).toBe(false);
      expect(triggerAt(el, 2).hasAttribute('aria-controls')).toBe(false);

      instance.selectedIndex.set(1);
      fixture.detectChanges();

      expect(triggerAt(el, 0).hasAttribute('aria-controls')).toBe(false);
      expect(triggerAt(el, 1).getAttribute('aria-controls')).toBe(contentAt(el, 1).id);
    });

    it('inactive panels carry aria-hidden and inert; active panel does not', () => {
      const { el } = renderHost(StepperHost);
      expect(contentAt(el, 0).hasAttribute('aria-hidden')).toBe(false);
      expect(contentAt(el, 0).hasAttribute('inert')).toBe(false);
      expect(contentAt(el, 1).getAttribute('aria-hidden')).toBe('true');
      expect(contentAt(el, 1).hasAttribute('inert')).toBe(true);
      expect(contentAt(el, 2).getAttribute('aria-hidden')).toBe('true');
    });

    it('content data-state reflects active/inactive', () => {
      const { el } = renderHost(StepperHost);
      expect(contentAt(el, 0).getAttribute('data-state')).toBe('active');
      expect(contentAt(el, 1).getAttribute('data-state')).toBe('inactive');
    });
  });

  describe('static accessibility — progress mode', () => {
    it('list has role=list (not tablist) and no aria-orientation', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.mode.set('progress');
      fixture.detectChanges();
      const list = listEl(el);
      expect(list.getAttribute('role')).toBe('list');
      expect(list.hasAttribute('aria-orientation')).toBe(false);
    });

    it('triggers carry no role in progress mode', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.mode.set('progress');
      fixture.detectChanges();
      for (let i = 0; i < 3; i++) {
        expect(triggerAt(el, i).hasAttribute('role')).toBe(false);
      }
    });

    it('triggers carry no tabindex in progress mode', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.mode.set('progress');
      fixture.detectChanges();
      for (let i = 0; i < 3; i++) {
        expect(triggerAt(el, i).hasAttribute('tabindex')).toBe(false);
      }
    });

    it('current trigger has aria-current="step"; others have none', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.mode.set('progress');
      fixture.detectChanges();
      expect(triggerAt(el, 0).getAttribute('aria-current')).toBe('step');
      expect(triggerAt(el, 1).hasAttribute('aria-current')).toBe(false);
      expect(triggerAt(el, 2).hasAttribute('aria-current')).toBe(false);
    });

    it('content panels carry role=group in progress mode', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.mode.set('progress');
      fixture.detectChanges();
      for (let i = 0; i < 3; i++) {
        expect(contentAt(el, i).getAttribute('role')).toBe('group');
      }
    });
  });

  describe('selection', () => {
    it('clicking a trigger selects it and updates selectedIndex', () => {
      const { el, instance, flush } = renderHost(StepperHost);
      triggerAt(el, 1).click();
      flush();
      expect(instance.selectedIndex()).toBe(1);
      expect(triggerAt(el, 1).getAttribute('aria-selected')).toBe('true');
      expect(contentAt(el, 1).hasAttribute('inert')).toBe(false);
      expect(contentAt(el, 0).hasAttribute('inert')).toBe(true);
    });

    it('external selectedIndex write reflects in ARIA', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.selectedIndex.set(2);
      fixture.detectChanges();
      expect(triggerAt(el, 2).getAttribute('aria-selected')).toBe('true');
      expect(contentAt(el, 2).hasAttribute('inert')).toBe(false);
    });

    it('an out-of-range consumer selectedIndex write selects no step (consumer-owned, not clamped)', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.selectedIndex.set(100);
      fixture.detectChanges();
      for (let i = 0; i < 3; i++) {
        expect(triggerAt(el, i).getAttribute('aria-selected')).toBe('false');
        expect(contentAt(el, i).hasAttribute('inert')).toBe(true);
      }
    });
  });

  describe('linear gating', () => {
    it('ahead steps are aria-disabled when linear=true (unreachable but not disabled)', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.linear.set(true);
      fixture.detectChanges();
      expect(triggerAt(el, 1).getAttribute('aria-disabled')).toBe('true');
      expect(triggerAt(el, 1).hasAttribute('data-disabled')).toBe(false);
    });

    it('clicking an unreachable step is a no-op', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.linear.set(true);
      fixture.detectChanges();
      triggerAt(el, 1).click();
      fixture.detectChanges();
      expect(instance.selectedIndex()).toBe(0);
    });

    it('step becomes reachable after preceding step is completed', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.linear.set(true);
      fixture.detectChanges();
      expect(triggerAt(el, 1).getAttribute('aria-disabled')).toBe('true');
      instance.steps.update((ss) =>
        ss.map((s, i) => (i === 0 ? { ...s, completed: true } : s)),
      );
      fixture.detectChanges();
      expect(triggerAt(el, 1).hasAttribute('aria-disabled')).toBe(false);
    });

    it('optional steps are skippable in linear mode', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.linear.set(true);
      instance.steps.update((ss) =>
        ss.map((s, i) => (i === 0 ? { ...s, optional: true } : s)),
      );
      fixture.detectChanges();
      expect(triggerAt(el, 1).hasAttribute('aria-disabled')).toBe(false);
    });

    it('next() is a no-op when linear and current step is not completed/optional', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.linear.set(true);
      fixture.detectChanges();
      nextBtn(el).click();
      fixture.detectChanges();
      expect(instance.selectedIndex()).toBe(0);
    });

    it('previous() always works regardless of linear mode', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.linear.set(true);
      instance.selectedIndex.set(2);
      fixture.detectChanges();
      prevBtn(el).click();
      fixture.detectChanges();
      expect(instance.selectedIndex()).toBe(1);
    });
  });

  describe('resolved-state precedence', () => {
    it('custom state override wins', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.steps.update((ss) =>
        ss.map((s, i) => (i === 0 ? { ...s, state: 'my-custom' } : s)),
      );
      fixture.detectChanges();
      expect(itemAt(el, 0).getAttribute('data-state')).toBe('my-custom');
      expect(triggerAt(el, 0).getAttribute('data-state')).toBe('my-custom');
      expect(indicatorAt(el, 0).getAttribute('data-state')).toBe('my-custom');
    });

    it('hasError emits "error" on non-current step', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.steps.update((ss) =>
        ss.map((s, i) => (i === 1 ? { ...s, hasError: true } : s)),
      );
      fixture.detectChanges();
      expect(itemAt(el, 1).getAttribute('data-state')).toBe('error');
    });

    it('current step emits "active" even when hasError is true', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.steps.update((ss) =>
        ss.map((s, i) => (i === 0 ? { ...s, hasError: true } : s)),
      );
      fixture.detectChanges();
      expect(itemAt(el, 0).getAttribute('data-state')).toBe('active');
    });

    it('completed step emits "completed"', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.steps.update((ss) =>
        ss.map((s, i) => (i === 1 ? { ...s, completed: true } : s)),
      );
      fixture.detectChanges();
      expect(itemAt(el, 1).getAttribute('data-state')).toBe('completed');
    });

    it('default state is "pending"', () => {
      const { el } = renderHost(StepperHost);
      expect(itemAt(el, 1).getAttribute('data-state')).toBe('pending');
    });

    it('current step emits "active"', () => {
      const { el } = renderHost(StepperHost);
      expect(itemAt(el, 0).getAttribute('data-state')).toBe('active');
    });
  });

  describe('separator data-state', () => {
    it('separator reflects completed state of its item', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      expect(sepAt(el, 0).getAttribute('data-state')).toBe('pending');
      instance.steps.update((ss) =>
        ss.map((s, i) => (i === 0 ? { ...s, completed: true } : s)),
      );
      fixture.detectChanges();
      expect(sepAt(el, 0).getAttribute('data-state')).toBe('completed');
    });

    it('indicator is aria-hidden', () => {
      const { el } = renderHost(StepperHost);
      expect(indicatorAt(el, 0).getAttribute('aria-hidden')).toBe('true');
    });
  });

  assertRovingTabindexContract({
    mount: async () => {
      const r = renderHost(StepperHost);
      await r.flush();
      return { items: triggers(r.el), flush: r.flush };
    },
    mountWithDisabledFirst: async () => {
      const r = renderHost(StepperHost);
      r.instance.steps.update((ss) =>
        ss.map((s, i) => (i === 0 ? { ...s, disabled: true } : s)),
      );
      r.fixture.detectChanges();
      await r.flush();
      return { items: triggers(r.el), enabledIndices: [1, 2], flush: r.flush };
    },
    mountWithDisabledMiddle: async () => {
      const r = renderHost(StepperHost);
      r.instance.steps.update((ss) =>
        ss.map((s, i) => (i === 1 ? { ...s, disabled: true } : s)),
      );
      r.fixture.detectChanges();
      await r.flush();
      return { items: triggers(r.el), enabledIndices: [0, 2], flush: r.flush };
    },
    mountRtl: async () => {
      const r = renderHost(StepperHost);
      r.instance.dir.set('rtl');
      r.fixture.detectChanges();
      await r.flush();
      return { items: triggers(r.el), flush: r.flush };
    },
  });

  describe('keyboard navigation', () => {
    it('ArrowRight moves focus in horizontal mode', () => {
      const { el, flush } = renderHost(StepperHost);
      triggerAt(el, 0).focus();
      flush();
      pressKey(triggerAt(el, 0), 'ArrowRight');
      flush();
      expect(document.activeElement).toBe(triggerAt(el, 1));
    });

    it('ArrowUp/Down navigate in vertical mode, ArrowLeft/Right are ignored', () => {
      const { el, instance, fixture, flush } = renderHost(StepperHost);
      instance.orientation.set('vertical');
      fixture.detectChanges();
      triggerAt(el, 0).focus();
      flush();

      pressKey(triggerAt(el, 0), 'ArrowDown');
      flush();
      expect(document.activeElement).toBe(triggerAt(el, 1));

      pressKey(triggerAt(el, 1), 'ArrowUp');
      flush();
      expect(document.activeElement).toBe(triggerAt(el, 0));

      pressKey(triggerAt(el, 0), 'ArrowRight');
      flush();
      expect(document.activeElement).toBe(triggerAt(el, 0));
    });

    it('automatic mode selects on arrow move', () => {
      const { el, instance, fixture, flush } = renderHost(StepperHost);
      instance.activationMode.set('automatic');
      fixture.detectChanges();
      triggerAt(el, 0).focus();
      flush();
      pressKey(triggerAt(el, 0), 'ArrowRight');
      flush();
      expect(instance.selectedIndex()).toBe(1);
    });

    it('manual mode does not select on arrow move', () => {
      const { el, instance, flush } = renderHost(StepperHost);
      triggerAt(el, 0).focus();
      flush();
      pressKey(triggerAt(el, 0), 'ArrowRight');
      flush();
      expect(instance.selectedIndex()).toBe(0);
    });

    it('loop=false stops at the last trigger', () => {
      const { el, instance, fixture, flush } = renderHost(StepperHost);
      instance.loop.set(false);
      fixture.detectChanges();
      triggerAt(el, 2).focus();
      flush();
      pressKey(triggerAt(el, 2), 'ArrowRight');
      flush();
      expect(document.activeElement).toBe(triggerAt(el, 2));
    });
  });

  describe('content APG tabindex', () => {
    it('text-only current panel has tabindex=0', async () => {
      const { el, flush } = renderHost(StepperHost);
      await flush();
      expect(contentAt(el, 0).getAttribute('tabindex')).toBe('0');
    });

    it('panel with focusable content has no tabindex', async () => {
      const { el, instance, fixture, flush } = renderHost(StepperHost);
      instance.steps.update((ss) =>
        ss.map((s, i) => (i === 0 ? { ...s, hasError: true } : s)),
      );
      fixture.detectChanges();
      await flush();
      expect(contentAt(el, 0).hasAttribute('tabindex')).toBe(false);
    });

    it('inactive panels carry aria-hidden and inert', () => {
      const { el } = renderHost(StepperHost);
      expect(contentAt(el, 1).getAttribute('aria-hidden')).toBe('true');
      expect(contentAt(el, 1).hasAttribute('inert')).toBe(true);
    });
  });

  describe('orientation and data-orientation propagation', () => {
    it('data-orientation propagates to list/item/trigger/content/separator', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.orientation.set('vertical');
      fixture.detectChanges();
      expect(listEl(el).getAttribute('data-orientation')).toBe('vertical');
      expect(itemAt(el, 0).getAttribute('data-orientation')).toBe('vertical');
      expect(triggerAt(el, 0).getAttribute('data-orientation')).toBe('vertical');
      expect(contentAt(el, 0).getAttribute('data-orientation')).toBe('vertical');
      expect(sepAt(el, 0).getAttribute('data-orientation')).toBe('vertical');
    });

    it('RTL is reflected on the root dir attribute', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.dir.set('rtl');
      fixture.detectChanges();
      const root = el.querySelector<HTMLElement>('[forStepper]')!;
      expect(root.getAttribute('dir')).toBe('rtl');
    });
  });

  describe('Next / Previous buttons', () => {
    it('previous is aria-disabled at the first step', () => {
      const { el } = renderHost(StepperHost);
      expect(prevBtn(el).getAttribute('aria-disabled')).toBe('true');
    });

    it('next advances selectedIndex when allowed', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      nextBtn(el).click();
      fixture.detectChanges();
      expect(instance.selectedIndex()).toBe(1);
    });

    it('previous retreats selectedIndex', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.selectedIndex.set(2);
      fixture.detectChanges();
      prevBtn(el).click();
      fixture.detectChanges();
      expect(instance.selectedIndex()).toBe(1);
      expect(prevBtn(el).hasAttribute('aria-disabled')).toBe(false);
    });

    it('next is aria-disabled at the last step', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.selectedIndex.set(2);
      fixture.detectChanges();
      expect(nextBtn(el).getAttribute('aria-disabled')).toBe('true');
    });

    it('clicking next while aria-disabled is a no-op', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.selectedIndex.set(2);
      fixture.detectChanges();
      nextBtn(el).click();
      fixture.detectChanges();
      expect(instance.selectedIndex()).toBe(2);
    });
  });

  describe('defaults — provideForStepperDefaults', () => {
    it('overrides activationMode for a nested scope', () => {
      @Component({
        imports: [ForStepper, ForStepperList, ForStepperItem, ForStepperTrigger, ForStepperContent],
        providers: [provideForStepperDefaults({ activationMode: 'automatic' })],
        template: `
          <div forStepper [(selectedIndex)]="idx">
            <ol forStepperList>
              <li forStepperItem>
                <button type="button" forStepperTrigger data-trigger="0">A</button>
              </li>
              <li forStepperItem>
                <button type="button" forStepperTrigger data-trigger="1">B</button>
              </li>
            </ol>
            <section forStepperContent data-content="0">A</section>
            <section forStepperContent data-content="1">B</section>
          </div>
        `,
      })
      class AutomaticHost {
        readonly idx = signal(0);
      }

      const { el, instance, flush } = renderHost(AutomaticHost);
      flush();
      const t0 = el.querySelector<HTMLElement>('[data-trigger="0"]')!;
      t0.focus();
      flush();
      pressKey(t0, 'ArrowRight');
      flush();
      expect(instance.idx()).toBe(1);
    });

    it('overrides loop=false for a nested scope', () => {
      @Component({
        imports: [ForStepper, ForStepperList, ForStepperItem, ForStepperTrigger, ForStepperContent],
        providers: [provideForStepperDefaults({ loop: false })],
        template: `
          <div forStepper [(selectedIndex)]="idx">
            <ol forStepperList>
              <li forStepperItem>
                <button type="button" forStepperTrigger data-trigger="0">A</button>
              </li>
              <li forStepperItem>
                <button type="button" forStepperTrigger data-trigger="1">B</button>
              </li>
            </ol>
            <section forStepperContent data-content="0">A</section>
            <section forStepperContent data-content="1">B</section>
          </div>
        `,
      })
      class NoLoopHost {
        readonly idx = signal(0);
      }

      const { el, flush } = renderHost(NoLoopHost);
      flush();
      const t1 = el.querySelector<HTMLElement>('[data-trigger="1"]')!;
      t1.focus();
      flush();
      pressKey(t1, 'ArrowRight');
      flush();
      expect(document.activeElement).toBe(t1);
    });
  });

  describe('orphan error guards', () => {
    it('ForStepperList throws when used outside [forStepper]', () => {
      @Component({
        imports: [ForStepperList],
        template: `<ol forStepperList></ol>`,
      })
      class Orphan {}

      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      expect(() => TestBed.createComponent(Orphan).detectChanges()).toThrow(
        /\[forty-cdk\/stepper\] ForStepperList must be used inside a \[forStepper\] element/,
      );
    });

    it('ForStepperTrigger throws when used outside [forStepperItem]', () => {
      @Component({
        imports: [ForStepper, ForStepperList, ForStepperTrigger],
        template: `
          <div forStepper>
            <ol forStepperList>
              <button forStepperTrigger></button>
            </ol>
          </div>
        `,
      })
      class OrphanTrigger {}

      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      expect(() => TestBed.createComponent(OrphanTrigger).detectChanges()).toThrow(
        /\[forty-cdk\/stepper\] ForStepperTrigger must be used inside a \[forStepperItem\] element/,
      );
    });

    it('ForStepperIndicator throws when used outside [forStepperItem]', () => {
      @Component({
        imports: [ForStepper, ForStepperList, ForStepperIndicator],
        template: `
          <div forStepper>
            <ol forStepperList>
              <span forStepperIndicator></span>
            </ol>
          </div>
        `,
      })
      class OrphanIndicator {}

      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      expect(() => TestBed.createComponent(OrphanIndicator).detectChanges()).toThrow(
        /\[forty-cdk\/stepper\] ForStepperIndicator must be used inside a \[forStepperItem\] element/,
      );
    });
  });

  describe('zoneless reactivity', () => {
    it('aria-selected and data-state update on external selectedIndex writes without Zone.js', () => {
      @Component({
        imports: [ForStepper, ForStepperList, ForStepperItem, ForStepperTrigger, ForStepperContent],
        template: `
          <div forStepper [(selectedIndex)]="idx">
            <ol forStepperList>
              <li forStepperItem>
                <button type="button" forStepperTrigger data-trigger="0">A</button>
              </li>
              <li forStepperItem>
                <button type="button" forStepperTrigger data-trigger="1">B</button>
              </li>
            </ol>
            <section forStepperContent data-content="0">A</section>
            <section forStepperContent data-content="1">B</section>
          </div>
        `,
      })
      class ZonelessHost {
        readonly idx = signal(0);
      }

      const { el, instance, fixture } = renderHost(ZonelessHost);

      const t0 = el.querySelector<HTMLElement>('[data-trigger="0"]')!;
      const t1 = el.querySelector<HTMLElement>('[data-trigger="1"]')!;
      const c1 = el.querySelector<HTMLElement>('[data-content="1"]')!;

      expect(t0.getAttribute('aria-selected')).toBe('true');
      expect(t1.getAttribute('aria-selected')).toBe('false');

      instance.idx.set(1);
      fixture.detectChanges();

      expect(t0.getAttribute('aria-selected')).toBe('false');
      expect(t1.getAttribute('aria-selected')).toBe('true');
      expect(c1.hasAttribute('inert')).toBe(false);
    });
  });
});
