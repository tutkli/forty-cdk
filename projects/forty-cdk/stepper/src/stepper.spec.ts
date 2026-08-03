import { Component, computed, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, required } from '@angular/forms/signals';
import { By } from '@angular/platform-browser';

import { pressKey, renderHost } from '../../src/test-utils';
import {
  assertDataStateContract,
  assertRovingTabindexContract,
} from '../../src/test-utils/contract';
import { ForStepper } from './stepper';
import { ForStepperContent } from './stepper-content';
import { ForStepperCompletedContent } from './stepper-completed-content';
import { ForStepperIndicator } from './stepper-indicator';
import { ForStepperItem } from './stepper-item';
import { ForStepperList } from './stepper-list';
import { ForStepperNext } from './stepper-next';
import { ForStepperPrevious } from './stepper-previous';
import { ForStepperProgress } from './stepper-progress';
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
  ForStepperCompletedContent,
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
      (complete)="onComplete()"
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
      <section forStepperCompletedContent data-completed>All steps complete</section>
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
    {
      label: 'A',
      completed: false,
      optional: false,
      disabled: false,
      hasError: false,
      state: null,
    },
    {
      label: 'B',
      completed: false,
      optional: false,
      disabled: false,
      hasError: false,
      state: null,
    },
    {
      label: 'C',
      completed: false,
      optional: false,
      disabled: false,
      hasError: false,
      state: null,
    },
  ]);
  readonly completeCount = signal(0);
  onComplete(): void {
    this.completeCount.update((n) => n + 1);
  }
}

const triggerAt = (el: HTMLElement, i: number) =>
  el.querySelector<HTMLButtonElement>(`button[data-trigger="${i}"]`)!;

const contentAt = (el: HTMLElement, i: number) =>
  el.querySelector<HTMLElement>(`[data-content="${i}"]`)!;

const itemAt = (el: HTMLElement, i: number) => el.querySelector<HTMLElement>(`[data-step="${i}"]`)!;

const indicatorAt = (el: HTMLElement, i: number) =>
  el.querySelector<HTMLElement>(`[data-indicator="${i}"]`)!;

const sepAt = (el: HTMLElement, i: number) => el.querySelector<HTMLElement>(`[data-sep="${i}"]`)!;

const listEl = (el: HTMLElement) => el.querySelector<HTMLElement>('[forStepperList]')!;
const nextBtn = (el: HTMLElement) => el.querySelector<HTMLElement>('[data-next]')!;
const prevBtn = (el: HTMLElement) => el.querySelector<HTMLElement>('[data-prev]')!;
const completedEl = (el: HTMLElement) => el.querySelector<HTMLElement>('[data-completed]')!;

const triggers = (el: HTMLElement): HTMLElement[] =>
  Array.from(el.querySelectorAll<HTMLElement>('[forStepperTrigger]'));

@Component({
  imports: [ForStepper, ForStepperList, ForStepperItem, ForStepperTrigger, ForStepperContent],
  template: `
    <div forStepper [(selectedIndex)]="selectedIndex" [activationMode]="activationMode()">
      <ol forStepperList>
        @for (s of steps(); track $index) {
          <li forStepperItem [attr.data-step]="$index">
            @if ($index !== 1 || !hideMiddleTrigger()) {
              <button type="button" forStepperTrigger [attr.data-trigger]="$index">{{ s }}</button>
            }
          </li>
        }
      </ol>
      @for (s of steps(); track $index) {
        <section forStepperContent [attr.data-content]="$index">Panel {{ $index }}</section>
      }
    </div>
  `,
})
class HiddenTriggerHost {
  readonly selectedIndex = signal(0);
  readonly activationMode = signal<'automatic' | 'manual'>('manual');
  readonly hideMiddleTrigger = signal(false);
  readonly steps = signal(['A', 'B', 'C']);
}

@Component({
  imports: [ForStepper, ForStepperList, ForStepperItem, ForStepperTrigger, ForStepperContent],
  template: `
    <div forStepper [(selectedIndex)]="selectedIndex">
      <ol forStepperList>
        @for (s of steps(); track $index) {
          <li forStepperItem [attr.data-step]="$index">
            <button type="button" forStepperTrigger [attr.data-trigger]="$index">{{ s }}</button>
          </li>
        }
      </ol>
      @for (i of mountedPanels(); track i) {
        <section forStepperContent [step]="explicitStep() ? i : null" [attr.data-content]="i">
          Panel {{ i }}
        </section>
      }
    </div>
  `,
})
class ExplicitStepPanelHost {
  readonly selectedIndex = signal(0);
  readonly steps = signal(['A', 'B', 'C']);
  readonly explicitStep = signal(true);
  readonly hideMiddlePanel = signal(false);
  readonly onlyCurrentPanel = signal(false);
  readonly mountedPanels = computed<readonly number[]>(() => {
    const all = this.steps().map((_, i) => i);
    if (this.onlyCurrentPanel()) {
      return all.filter((i) => i === this.selectedIndex());
    }
    return this.hideMiddlePanel() ? all.filter((i) => i !== 1) : all;
  });
}

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

    it('items carry role=presentation so the tablist owns the tabs directly', () => {
      const { el } = renderHost(StepperHost);
      for (let i = 0; i < 3; i++) {
        expect(itemAt(el, i).getAttribute('role')).toBe('presentation');
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

    it('items keep their implicit listitem role (no role attr) in progress mode', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.mode.set('progress');
      fixture.detectChanges();
      for (let i = 0; i < 3; i++) {
        expect(itemAt(el, i).hasAttribute('role')).toBe(false);
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
    it('clicking a trigger selects it and updates selectedIndex', async () => {
      const { el, instance, flush } = renderHost(StepperHost);
      triggerAt(el, 1).click();
      await flush();
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
      instance.steps.update((ss) => ss.map((s, i) => (i === 0 ? { ...s, completed: true } : s)));
      fixture.detectChanges();
      expect(triggerAt(el, 1).hasAttribute('aria-disabled')).toBe(false);
    });

    it('optional steps are skippable in linear mode', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.linear.set(true);
      instance.steps.update((ss) => ss.map((s, i) => (i === 0 ? { ...s, optional: true } : s)));
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
      instance.steps.update((ss) => ss.map((s, i) => (i === 0 ? { ...s, state: 'my-custom' } : s)));
      fixture.detectChanges();
      expect(itemAt(el, 0).getAttribute('data-state')).toBe('my-custom');
      expect(triggerAt(el, 0).getAttribute('data-state')).toBe('my-custom');
      expect(indicatorAt(el, 0).getAttribute('data-state')).toBe('my-custom');
    });

    it('hasError emits "error" on non-current step', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.steps.update((ss) => ss.map((s, i) => (i === 1 ? { ...s, hasError: true } : s)));
      fixture.detectChanges();
      expect(itemAt(el, 1).getAttribute('data-state')).toBe('error');
    });

    it('current step emits "active" even when hasError is true', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.steps.update((ss) => ss.map((s, i) => (i === 0 ? { ...s, hasError: true } : s)));
      fixture.detectChanges();
      expect(itemAt(el, 0).getAttribute('data-state')).toBe('active');
    });

    it('completed step emits "completed"', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.steps.update((ss) => ss.map((s, i) => (i === 1 ? { ...s, completed: true } : s)));
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

  describe('indicator', () => {
    it('indicator is aria-hidden', () => {
      const { el } = renderHost(StepperHost);
      expect(indicatorAt(el, 0).getAttribute('aria-hidden')).toBe('true');
    });
  });

  assertDataStateContract(
    {
      vocabulary: ['active', 'inactive'],
      mount: () => {
        const r = renderHost(StepperHost);
        return {
          pieces: () => ({ content: contentAt(r.el, 0) }),
          setState: (state) => r.instance.selectedIndex.set(state === 'active' ? 0 : 1),
          flush: r.flush,
        };
      },
    },
    { label: 'content panels' },
  );

  assertDataStateContract(
    {
      vocabulary: ['completed', 'pending'],
      mount: () => {
        const r = renderHost(StepperHost);
        return {
          pieces: () => ({ separator: sepAt(r.el, 0) }),
          setState: (state) =>
            r.instance.steps.update((ss) =>
              ss.map((s, i) => (i === 0 ? { ...s, completed: state === 'completed' } : s)),
            ),
          flush: r.flush,
        };
      },
    },
    { label: 'separators' },
  );

  assertRovingTabindexContract({
    mount: async () => {
      const r = renderHost(StepperHost);
      await r.flush();
      return { items: triggers(r.el), flush: r.flush };
    },
    mountWithDisabledFirst: async () => {
      const r = renderHost(StepperHost);
      r.instance.steps.update((ss) => ss.map((s, i) => (i === 0 ? { ...s, disabled: true } : s)));
      r.fixture.detectChanges();
      await r.flush();
      return { items: triggers(r.el), enabledIndices: [1, 2], flush: r.flush };
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
    it('ArrowRight moves focus in horizontal mode', async () => {
      const { el, flush } = renderHost(StepperHost);
      triggerAt(el, 0).focus();
      await flush();
      pressKey(triggerAt(el, 0), 'ArrowRight');
      await flush();
      expect(document.activeElement).toBe(triggerAt(el, 1));
    });

    it('ArrowUp/Down navigate in vertical mode, ArrowLeft/Right are ignored', async () => {
      const { el, instance, fixture, flush } = renderHost(StepperHost);
      instance.orientation.set('vertical');
      fixture.detectChanges();
      triggerAt(el, 0).focus();
      await flush();

      pressKey(triggerAt(el, 0), 'ArrowDown');
      await flush();
      expect(document.activeElement).toBe(triggerAt(el, 1));

      pressKey(triggerAt(el, 1), 'ArrowUp');
      await flush();
      expect(document.activeElement).toBe(triggerAt(el, 0));

      pressKey(triggerAt(el, 0), 'ArrowRight');
      await flush();
      expect(document.activeElement).toBe(triggerAt(el, 0));
    });

    it('automatic mode selects on arrow move', async () => {
      const { el, instance, fixture, flush } = renderHost(StepperHost);
      instance.activationMode.set('automatic');
      fixture.detectChanges();
      triggerAt(el, 0).focus();
      await flush();
      pressKey(triggerAt(el, 0), 'ArrowRight');
      await flush();
      expect(instance.selectedIndex()).toBe(1);
    });

    it('manual mode does not select on arrow move', async () => {
      const { el, instance, flush } = renderHost(StepperHost);
      triggerAt(el, 0).focus();
      await flush();
      pressKey(triggerAt(el, 0), 'ArrowRight');
      await flush();
      expect(instance.selectedIndex()).toBe(0);
    });

    it('loop=false stops at the last trigger', async () => {
      const { el, instance, fixture, flush } = renderHost(StepperHost);
      instance.loop.set(false);
      fixture.detectChanges();
      triggerAt(el, 2).focus();
      await flush();
      pressKey(triggerAt(el, 2), 'ArrowRight');
      await flush();
      expect(document.activeElement).toBe(triggerAt(el, 2));
    });
  });

  describe('disabled steps stay keyboard-reachable (APG)', () => {
    const withDisabledStep1 = async (activation: 'manual' | 'automatic' = 'automatic') => {
      const r = renderHost(StepperHost);
      r.instance.activationMode.set(activation);
      r.instance.steps.update((ss) => ss.map((s, i) => (i === 1 ? { ...s, disabled: true } : s)));
      r.fixture.detectChanges();
      await r.flush();
      return r;
    };

    it('interactive: a disabled step trigger keeps aria-disabled="true" and tabindex="-1"', async () => {
      const { el } = await withDisabledStep1('manual');
      expect(triggerAt(el, 1).getAttribute('aria-disabled')).toBe('true');
      expect(triggerAt(el, 1).getAttribute('tabindex')).toBe('-1');
    });

    it('automatic mode: ArrowRight onto a disabled step reaches it without selecting it', async () => {
      const { el, instance, flush } = await withDisabledStep1();
      triggerAt(el, 0).focus();
      await flush();
      pressKey(triggerAt(el, 0), 'ArrowRight');
      await flush();
      expect(document.activeElement).toBe(triggerAt(el, 1));
      expect(instance.selectedIndex()).toBe(0);
    });

    it('automatic mode: ArrowRight dispatched on the disabled step advances selection past it', async () => {
      const { el, instance, flush } = await withDisabledStep1();
      triggerAt(el, 1).focus();
      await flush();
      pressKey(triggerAt(el, 1), 'ArrowRight');
      await flush();
      expect(document.activeElement).toBe(triggerAt(el, 2));
      expect(instance.selectedIndex()).toBe(2);
    });

    it('arrow-over-disabled reaches the disabled step without selecting it', async () => {
      const { el, instance, flush } = await withDisabledStep1();
      triggerAt(el, 0).focus();
      await flush();
      pressKey(triggerAt(el, 0), 'ArrowRight');
      await flush();
      expect(document.activeElement).toBe(triggerAt(el, 1));
      expect(instance.selectedIndex()).toBe(0);
    });
  });

  describe('navigate() with structurally hidden triggers (#1394 item 6)', () => {
    const withHiddenMiddle = async (activation: 'manual' | 'automatic') => {
      const r = renderHost(HiddenTriggerHost);
      r.instance.activationMode.set(activation);
      r.instance.hideMiddleTrigger.set(true);
      r.fixture.detectChanges();
      await r.flush();
      return r;
    };

    it('automatic mode: ArrowRight from a trigger before a hidden trigger selects the correct STEP index, not the trigger position', async () => {
      const { el, instance, flush } = await withHiddenMiddle('automatic');
      triggerAt(el, 0).focus();
      await flush();
      pressKey(triggerAt(el, 0), 'ArrowRight');
      await flush();
      expect(instance.selectedIndex()).toBe(2);
      expect(document.activeElement).toBe(triggerAt(el, 2));
    });

    it('automatic mode with hidden trigger: aria-selected/data-state land on the navigated step', async () => {
      const { el, flush } = await withHiddenMiddle('automatic');
      triggerAt(el, 0).focus();
      await flush();
      pressKey(triggerAt(el, 0), 'ArrowRight');
      await flush();
      expect(triggerAt(el, 2).getAttribute('aria-selected')).toBe('true');
      expect(triggerAt(el, 0).getAttribute('aria-selected')).toBe('false');
      expect(itemAt(el, 2).getAttribute('data-state')).toBe('active');
      expect(itemAt(el, 1).getAttribute('data-state')).not.toBe('active');
    });

    it('manual mode with hidden trigger: focus still moves to the next visible trigger and selection is untouched', async () => {
      const { el, instance, flush } = await withHiddenMiddle('manual');
      triggerAt(el, 0).focus();
      await flush();
      pressKey(triggerAt(el, 0), 'ArrowRight');
      await flush();
      expect(document.activeElement).toBe(triggerAt(el, 2));
      expect(instance.selectedIndex()).toBe(0);
    });
  });

  describe('item-keyed aria pairing and tab stop (#1430)', () => {
    const withHiddenMiddleTrigger = async (selected: number) => {
      const r = renderHost(HiddenTriggerHost);
      r.instance.hideMiddleTrigger.set(true);
      r.instance.selectedIndex.set(selected);
      r.fixture.detectChanges();
      await r.flush();
      return r;
    };

    it('panel aria-labelledby resolves to its own step trigger when an earlier trigger is hidden', async () => {
      const { el } = await withHiddenMiddleTrigger(0);
      expect(contentAt(el, 2).getAttribute('aria-labelledby')).toBe(triggerAt(el, 2).id);
      expect(contentAt(el, 0).getAttribute('aria-labelledby')).toBe(triggerAt(el, 0).id);
    });

    it('panel of the hidden-trigger step has no aria-labelledby instead of borrowing another trigger', async () => {
      const { el } = await withHiddenMiddleTrigger(0);
      expect(contentAt(el, 1).hasAttribute('aria-labelledby')).toBe(false);
    });

    it('the tablist keeps a resting tab stop when the selected step has no trigger', async () => {
      const { el } = await withHiddenMiddleTrigger(1);
      expect(triggerAt(el, 0).getAttribute('tabindex')).toBe('0');
      expect(triggerAt(el, 2).getAttribute('tabindex')).toBe('-1');
    });

    it('the selected step past a hidden trigger owns the only tab stop', async () => {
      const { el } = await withHiddenMiddleTrigger(2);
      expect(triggerAt(el, 2).getAttribute('tabindex')).toBe('0');
      expect(triggerAt(el, 0).getAttribute('tabindex')).toBe('-1');
    });

    it('the tab stop follows the selected step across a hidden trigger', async () => {
      const { el, instance, fixture, flush } = await withHiddenMiddleTrigger(2);
      instance.selectedIndex.set(1);
      fixture.detectChanges();
      await flush();
      expect(triggerAt(el, 0).getAttribute('tabindex')).toBe('0');
      expect(triggerAt(el, 2).getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('explicit [step] panel pairing (#1430)', () => {
    const mount = async (configure: (i: ExplicitStepPanelHost) => void) => {
      const r = renderHost(ExplicitStepPanelHost);
      configure(r.instance);
      r.fixture.detectChanges();
      await r.flush();
      return r;
    };

    it('trigger aria-controls resolves to its own panel when an earlier panel is absent', async () => {
      const { el } = await mount((i) => {
        i.hideMiddlePanel.set(true);
        i.selectedIndex.set(2);
      });
      expect(triggerAt(el, 2).getAttribute('aria-controls')).toBe(contentAt(el, 2).id);
    });

    it('trigger of the absent-panel step emits no aria-controls instead of a wrong panel id', async () => {
      const { el } = await mount((i) => {
        i.hideMiddlePanel.set(true);
        i.selectedIndex.set(1);
      });
      expect(triggerAt(el, 1).hasAttribute('aria-controls')).toBe(false);
    });

    it('panels declared in reverse DOM order still pair with their own step', async () => {
      @Component({
        imports: [ForStepper, ForStepperList, ForStepperItem, ForStepperTrigger, ForStepperContent],
        template: `
          <div forStepper [(selectedIndex)]="selectedIndex">
            <ol forStepperList>
              @for (s of steps(); track $index) {
                <li forStepperItem>
                  <button type="button" forStepperTrigger [attr.data-trigger]="$index">
                    {{ s }}
                  </button>
                </li>
              }
            </ol>
            <section forStepperContent [step]="2" data-content="2">C</section>
            <section forStepperContent [step]="1" data-content="1">B</section>
            <section forStepperContent [step]="0" data-content="0">A</section>
          </div>
        `,
      })
      class ReversedPanelHost {
        readonly selectedIndex = signal(0);
        readonly steps = signal(['A', 'B', 'C']);
      }

      const { el, instance, fixture, flush } = renderHost(ReversedPanelHost);
      await flush();
      expect(triggerAt(el, 0).getAttribute('aria-controls')).toBe(contentAt(el, 0).id);
      expect(contentAt(el, 2).getAttribute('aria-labelledby')).toBe(triggerAt(el, 2).id);
      expect(contentAt(el, 0).getAttribute('data-state')).toBe('active');
      expect(contentAt(el, 2).getAttribute('data-state')).toBe('inactive');

      instance.selectedIndex.set(2);
      fixture.detectChanges();
      await flush();
      expect(triggerAt(el, 2).getAttribute('aria-controls')).toBe(contentAt(el, 2).id);
      expect(contentAt(el, 2).getAttribute('data-state')).toBe('active');
      expect(contentAt(el, 0).getAttribute('data-state')).toBe('inactive');
    });

    it('a lone mounted panel is active for its own step, not for position 0', async () => {
      const { el, instance, fixture, flush } = await mount((i) => {
        i.onlyCurrentPanel.set(true);
        i.selectedIndex.set(2);
      });
      const panel = contentAt(el, 2);
      expect(panel.getAttribute('data-state')).toBe('active');
      expect(panel.hasAttribute('inert')).toBe(false);
      expect(panel.hasAttribute('aria-hidden')).toBe(false);
      expect(panel.getAttribute('aria-labelledby')).toBe(triggerAt(el, 2).id);

      instance.selectedIndex.set(1);
      fixture.detectChanges();
      await flush();
      const next = contentAt(el, 1);
      expect(next.getAttribute('data-state')).toBe('active');
      expect(next.hasAttribute('inert')).toBe(false);
      expect(next.getAttribute('aria-labelledby')).toBe(triggerAt(el, 1).id);
    });

    it('unset [step] keeps the positional pairing', async () => {
      const { el } = await mount((i) => i.explicitStep.set(false));
      expect(triggerAt(el, 0).getAttribute('aria-controls')).toBe(contentAt(el, 0).id);
      expect(contentAt(el, 1).getAttribute('aria-labelledby')).toBe(triggerAt(el, 1).id);
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
      instance.steps.update((ss) => ss.map((s, i) => (i === 0 ? { ...s, hasError: true } : s)));
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

    it('next is enabled on the last step and advances into the terminal completed state', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.selectedIndex.set(2);
      fixture.detectChanges();
      expect(nextBtn(el).hasAttribute('aria-disabled')).toBe(false);
      nextBtn(el).click();
      fixture.detectChanges();
      expect(instance.selectedIndex()).toBe(3);
    });

    it('next is aria-disabled at the terminal completed state', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.selectedIndex.set(3);
      fixture.detectChanges();
      expect(nextBtn(el).getAttribute('aria-disabled')).toBe('true');
    });

    it('clicking next while aria-disabled is a no-op', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.selectedIndex.set(3);
      fixture.detectChanges();
      nextBtn(el).click();
      fixture.detectChanges();
      expect(instance.selectedIndex()).toBe(3);
    });
  });

  describe('completed terminal state', () => {
    it('next() into terminal emits complete once and the completed panel becomes active', async () => {
      const { el, instance, fixture, flush } = renderHost(StepperHost);
      instance.selectedIndex.set(2);
      await flush();
      nextBtn(el).click();
      fixture.detectChanges();
      await flush();
      expect(instance.completeCount()).toBe(1);
      expect(completedEl(el).getAttribute('data-state')).toBe('active');
      expect(completedEl(el).hasAttribute('aria-hidden')).toBe(false);
      expect(completedEl(el).hasAttribute('inert')).toBe(false);
    });

    it('completed panel is the only active panel in the terminal state', async () => {
      const { el, instance, fixture, flush } = renderHost(StepperHost);
      instance.selectedIndex.set(3);
      fixture.detectChanges();
      await flush();
      for (let i = 0; i < 3; i++) {
        expect(contentAt(el, i).hasAttribute('inert')).toBe(true);
        expect(contentAt(el, i).getAttribute('data-state')).toBe('inactive');
      }
      expect(completedEl(el).getAttribute('data-state')).toBe('active');
    });

    it('completed panel is inactive while not completed', async () => {
      const { el, flush } = renderHost(StepperHost);
      await flush();
      expect(completedEl(el).getAttribute('data-state')).toBe('inactive');
      expect(completedEl(el).getAttribute('aria-hidden')).toBe('true');
      expect(completedEl(el).hasAttribute('inert')).toBe(true);
    });

    it('previous() from terminal returns to the last step and un-completes', async () => {
      const { el, instance, fixture, flush } = renderHost(StepperHost);
      instance.selectedIndex.set(3);
      fixture.detectChanges();
      await flush();
      prevBtn(el).click();
      fixture.detectChanges();
      expect(instance.selectedIndex()).toBe(2);
      expect(completedEl(el).getAttribute('data-state')).toBe('inactive');
    });

    it('complete fires exactly once across a stay in the terminal state', async () => {
      const { el, instance, fixture, flush } = renderHost(StepperHost);
      instance.selectedIndex.set(2);
      await flush();
      nextBtn(el).click();
      fixture.detectChanges();
      await flush();
      nextBtn(el).click();
      fixture.detectChanges();
      await flush();
      expect(instance.completeCount()).toBe(1);
    });

    it('a completed panel flips to active and complete fires', () => {
      const { el, instance, fixture } = renderHost(StepperHost);
      instance.selectedIndex.set(3);
      fixture.detectChanges();
      expect(completedEl(el).getAttribute('data-state')).toBe('active');
      expect(instance.completeCount()).toBe(1);
    });

    it('select(count) advances into the terminal completed state', async () => {
      const { el, fixture, flush } = renderHost(StepperHost);
      const stepper = fixture.debugElement.query(By.directive(ForStepper)).injector.get(ForStepper);

      stepper.select(3);
      await flush();

      expect(completedEl(el).getAttribute('data-state')).toBe('active');
      expect(completedEl(el).hasAttribute('aria-hidden')).toBe(false);
      expect(completedEl(el).hasAttribute('inert')).toBe(false);
    });
  });

  describe('defaults — provideForStepperDefaults', () => {
    it('overrides activationMode for a nested scope', async () => {
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
      await flush();
      const t0 = el.querySelector<HTMLElement>('[data-trigger="0"]')!;
      t0.focus();
      await flush();
      pressKey(t0, 'ArrowRight');
      await flush();
      expect(instance.idx()).toBe(1);
    });

    it('overrides loop=false for a nested scope', async () => {
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
      await flush();
      const t1 = el.querySelector<HTMLElement>('[data-trigger="1"]')!;
      t1.focus();
      await flush();
      pressKey(t1, 'ArrowRight');
      await flush();
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

    it('ForStepperCompletedContent throws when used outside [forStepper]', () => {
      @Component({
        imports: [ForStepperCompletedContent],
        template: `<section forStepperCompletedContent></section>`,
      })
      class OrphanCompleted {}

      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      expect(() => TestBed.createComponent(OrphanCompleted).detectChanges()).toThrow(
        /\[forty-cdk\/stepper\] ForStepperCompletedContent must be used inside a \[forStepper\] element/,
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

  describe('reactive updates', () => {
    it('external selectedIndex writes move aria-selected and drop inert', () => {
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

  describe('Signal Forms field-driven completion', () => {
    @Component({
      imports: [ForStepper, ForStepperList, ForStepperItem, ForStepperTrigger, ForStepperContent],
      template: `
        <div forStepper [(selectedIndex)]="idx" [linear]="linear()">
          <ol forStepperList>
            <li forStepperItem [field]="signup.name" [completed]="manualComplete()" data-step="0">
              <button type="button" forStepperTrigger data-trigger="0">A</button>
            </li>
            <li forStepperItem [field]="signup.email" data-step="1">
              <button type="button" forStepperTrigger data-trigger="1">B</button>
            </li>
          </ol>
          <section forStepperContent data-content="0">A</section>
          <section forStepperContent data-content="1">B</section>
        </div>
      `,
    })
    class FieldHost {
      readonly idx = signal(0);
      readonly linear = signal(true);
      readonly manualComplete = signal(false);
      readonly model = signal({ name: '', email: '' });
      readonly signup = form(this.model, (s) => {
        required(s.name);
        required(s.email);
      });
    }

    it('untouched field is not completed — linear gate stays closed', () => {
      const { el, instance, fixture } = renderHost(FieldHost);
      instance.model.update((m) => ({ ...m, name: 'Alice' }));
      fixture.detectChanges();
      expect(triggerAt(el, 1).getAttribute('aria-disabled')).toBe('true');
    });

    it('valid + touched field completes the step and opens the linear gate', () => {
      const { el, instance, fixture } = renderHost(FieldHost);
      instance.model.update((m) => ({ ...m, name: 'Alice' }));
      fixture.detectChanges();
      instance.signup.name().markAsTouched();
      fixture.detectChanges();
      expect(triggerAt(el, 1).hasAttribute('aria-disabled')).toBe(false);
      instance.idx.set(1);
      fixture.detectChanges();
      expect(itemAt(el, 0).getAttribute('data-state')).toBe('completed');
    });

    it('invalid + touched field reflects data-state="error" on a non-current step', () => {
      const { el, instance, fixture } = renderHost(FieldHost);
      instance.signup.email().markAsTouched();
      fixture.detectChanges();
      instance.idx.set(0);
      fixture.detectChanges();
      expect(itemAt(el, 1).getAttribute('data-state')).toBe('error');
    });

    it('manual [completed] overrides an invalid/untouched field', () => {
      const { el, instance, fixture } = renderHost(FieldHost);
      instance.manualComplete.set(true);
      fixture.detectChanges();
      expect(triggerAt(el, 1).hasAttribute('aria-disabled')).toBe(false);
    });

    it('field-driven state updates after markAsTouched', () => {
      const { el, instance, fixture } = renderHost(FieldHost);
      expect(itemAt(el, 0).getAttribute('data-state')).toBe('active');
      instance.model.update((m) => ({ ...m, name: 'Alice' }));
      instance.signup.name().markAsTouched();
      fixture.detectChanges();
      instance.idx.set(1);
      fixture.detectChanges();
      expect(itemAt(el, 0).getAttribute('data-state')).toBe('completed');
    });
  });
});

describe('ForStepperProgress', () => {
  @Component({
    imports: [ForStepper, ForStepperList, ForStepperItem, ForStepperTrigger, ForStepperProgress],
    template: `
      <div forStepper [(selectedIndex)]="selectedIndex" [orientation]="orientation()">
        <div
          forStepperProgress
          [valueBy]="valueBy()"
          [ariaLabel]="ariaLabel()"
          data-testid="progress"
        ></div>
        <ol forStepperList ariaLabel="Steps">
          @for (s of steps(); track $index) {
            <li forStepperItem [completed]="s.completed">
              <button type="button" forStepperTrigger>Step {{ $index }}</button>
            </li>
          }
        </ol>
      </div>
    `,
  })
  class ProgressHost {
    readonly selectedIndex = signal(0);
    readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
    readonly valueBy = signal<'index' | 'completed'>('index');
    readonly ariaLabel = signal<string | null>(null);
    readonly steps = signal([{ completed: false }, { completed: false }, { completed: false }]);
  }

  const progressEl = (el: HTMLElement) =>
    el.querySelector<HTMLElement>('[data-testid="progress"]')!;

  it('has role="progressbar", aria-valuemin="0", aria-valuemax="100"', () => {
    const { el } = renderHost(ProgressHost);
    const p = progressEl(el);
    expect(p.getAttribute('role')).toBe('progressbar');
    expect(p.getAttribute('aria-valuemin')).toBe('0');
    expect(p.getAttribute('aria-valuemax')).toBe('100');
  });

  it('index basis: selectedIndex=0 → aria-valuenow="0"', () => {
    const { el } = renderHost(ProgressHost);
    expect(progressEl(el).getAttribute('aria-valuenow')).toBe('0');
  });

  it('index basis: selectedIndex=1 of 3 → aria-valuenow="33"', () => {
    const { el, instance, fixture } = renderHost(ProgressHost);
    instance.selectedIndex.set(1);
    fixture.detectChanges();
    expect(progressEl(el).getAttribute('aria-valuenow')).toBe('33');
  });

  it('index basis: selectedIndex=2 of 3 (last, not completed) → aria-valuenow="67" (< 100)', () => {
    const { el, instance, fixture } = renderHost(ProgressHost);
    instance.selectedIndex.set(2);
    fixture.detectChanges();
    expect(progressEl(el).getAttribute('aria-valuenow')).toBe('67');
    expect(Number(progressEl(el).getAttribute('aria-valuenow'))).toBeLessThan(100);
  });

  it('index basis: last step reports < 100, terminal reports 100', () => {
    const { el, instance, fixture } = renderHost(ProgressHost);
    instance.selectedIndex.set(2);
    fixture.detectChanges();
    expect(progressEl(el).getAttribute('aria-valuenow')).toBe('67');
    instance.selectedIndex.set(3);
    fixture.detectChanges();
    expect(progressEl(el).getAttribute('aria-valuenow')).toBe('100');
  });

  it('aria-valuetext (index basis): selectedIndex=1 of 3 → "Step 2 of 3"', () => {
    const { el, instance, fixture } = renderHost(ProgressHost);
    instance.selectedIndex.set(1);
    fixture.detectChanges();
    expect(progressEl(el).getAttribute('aria-valuetext')).toBe('Step 2 of 3');
  });

  it('completed basis: 1 completed step of 3 → aria-valuenow="33", aria-valuetext="33% complete"', () => {
    const { el, instance, fixture } = renderHost(ProgressHost);
    instance.valueBy.set('completed');
    instance.steps.set([{ completed: true }, { completed: false }, { completed: false }]);
    instance.selectedIndex.set(1);
    fixture.detectChanges();
    expect(progressEl(el).getAttribute('aria-valuenow')).toBe('33');
    expect(progressEl(el).getAttribute('aria-valuetext')).toBe('33% complete');
  });

  it('completed basis: 2 of 3 completed → aria-valuenow="67" (< 100)', () => {
    const { el, instance, fixture } = renderHost(ProgressHost);
    instance.valueBy.set('completed');
    instance.steps.set([{ completed: true }, { completed: true }, { completed: false }]);
    instance.selectedIndex.set(2);
    fixture.detectChanges();
    expect(progressEl(el).getAttribute('aria-valuenow')).toBe('67');
    expect(Number(progressEl(el).getAttribute('aria-valuenow'))).toBeLessThan(100);
  });

  it('completed basis: all-completed → aria-valuenow="100"', () => {
    const { el, instance, fixture } = renderHost(ProgressHost);
    instance.valueBy.set('completed');
    instance.steps.set([{ completed: true }, { completed: true }, { completed: true }]);
    instance.selectedIndex.set(3);
    fixture.detectChanges();
    expect(progressEl(el).getAttribute('aria-valuenow')).toBe('100');
  });

  it('index basis: terminal selectedIndex=count clamps aria-valuenow to 100', () => {
    const { el, instance, fixture } = renderHost(ProgressHost);
    instance.selectedIndex.set(3);
    fixture.detectChanges();
    expect(progressEl(el).getAttribute('aria-valuenow')).toBe('100');
    expect(progressEl(el).getAttribute('aria-valuetext')).toBe('Step 3 of 3');
  });

  it('completed basis: terminal with all steps completed clamps aria-valuenow to 100', () => {
    const { el, instance, fixture } = renderHost(ProgressHost);
    instance.valueBy.set('completed');
    instance.steps.set([{ completed: true }, { completed: true }, { completed: true }]);
    instance.selectedIndex.set(3);
    fixture.detectChanges();
    expect(progressEl(el).getAttribute('aria-valuenow')).toBe('100');
  });

  it('edge — single step: aria-valuenow="0"', () => {
    const { el, instance, fixture } = renderHost(ProgressHost);
    instance.steps.set([{ completed: false }]);
    fixture.detectChanges();
    expect(progressEl(el).getAttribute('aria-valuenow')).toBe('0');
  });

  it('edge — single step terminal: aria-valuenow="100"', () => {
    const { el, instance, fixture } = renderHost(ProgressHost);
    instance.steps.set([{ completed: false }]);
    instance.selectedIndex.set(1);
    fixture.detectChanges();
    expect(progressEl(el).getAttribute('aria-valuenow')).toBe('100');
  });

  it('edge — zero steps: aria-valuenow="0", role="progressbar" present, no throw', () => {
    const { el, instance, fixture } = renderHost(ProgressHost);
    instance.steps.set([]);
    fixture.detectChanges();
    const p = progressEl(el);
    expect(p.getAttribute('role')).toBe('progressbar');
    expect(p.getAttribute('aria-valuenow')).toBe('0');
  });

  it('--for-stepper-progress custom property is 0.5 at 50%', () => {
    const { el, instance, fixture } = renderHost(ProgressHost);
    instance.steps.set([
      { completed: false },
      { completed: false },
      { completed: false },
      { completed: false },
    ]);
    instance.selectedIndex.set(2);
    fixture.detectChanges();
    const p = progressEl(el);
    const inlineStyle = p.getAttribute('style') ?? '';
    const fromProp = p.style.getPropertyValue('--for-stepper-progress');
    if (fromProp !== '') {
      expect(fromProp.trim()).toBe('0.5');
    } else {
      expect(inlineStyle).toContain('--for-stepper-progress: 0.5');
    }
  });

  it('data-orientation reflects the root orientation', () => {
    const { el, instance, fixture } = renderHost(ProgressHost);
    instance.orientation.set('vertical');
    fixture.detectChanges();
    expect(progressEl(el).getAttribute('data-orientation')).toBe('vertical');
  });

  it('ariaLabel is reflected when set', () => {
    const { el, instance, fixture } = renderHost(ProgressHost);
    instance.ariaLabel.set('Checkout progress');
    fixture.detectChanges();
    expect(progressEl(el).getAttribute('aria-label')).toBe('Checkout progress');
  });

  it('ariaLabel null → no aria-label attribute', () => {
    const { el } = renderHost(ProgressHost);
    expect(progressEl(el).hasAttribute('aria-label')).toBe(false);
  });

  it('ariaLabel empty string → no aria-label attribute', () => {
    const { el, instance, fixture } = renderHost(ProgressHost);
    instance.ariaLabel.set('');
    fixture.detectChanges();
    expect(progressEl(el).hasAttribute('aria-label')).toBe(false);
  });

  it('updating selectedIndex updates aria-valuenow', () => {
    @Component({
      imports: [ForStepper, ForStepperList, ForStepperItem, ForStepperTrigger, ForStepperProgress],
      template: `
        <div forStepper [(selectedIndex)]="idx">
          <div forStepperProgress data-testid="zl-progress"></div>
          <ol forStepperList ariaLabel="Steps">
            <li forStepperItem><button type="button" forStepperTrigger>A</button></li>
            <li forStepperItem><button type="button" forStepperTrigger>B</button></li>
            <li forStepperItem><button type="button" forStepperTrigger>C</button></li>
          </ol>
        </div>
      `,
    })
    class ZonelessProgressHost {
      readonly idx = signal(0);
    }

    const { el, instance, fixture } = renderHost(ZonelessProgressHost);
    expect(
      el.querySelector<HTMLElement>('[data-testid="zl-progress"]')!.getAttribute('aria-valuenow'),
    ).toBe('0');

    instance.idx.set(1);
    fixture.detectChanges();

    expect(
      el.querySelector<HTMLElement>('[data-testid="zl-progress"]')!.getAttribute('aria-valuenow'),
    ).toBe('33');
  });

  describe('aria-valuetext localization (issue #1159)', () => {
    @Component({
      imports: [ForStepper, ForStepperList, ForStepperItem, ForStepperTrigger, ForStepperProgress],
      providers: [
        provideForStepperDefaults({
          stepValueText: (current, total) => `Paso ${current} de ${total}`,
          progressValueText: (percent) => `${percent}% completado`,
        }),
      ],
      template: `
        <div forStepper [(selectedIndex)]="selectedIndex">
          <div forStepperProgress [valueBy]="valueBy()" data-testid="progress"></div>
          <ol forStepperList ariaLabel="Steps">
            @for (s of steps(); track $index) {
              <li forStepperItem [completed]="s.completed">
                <button type="button" forStepperTrigger>Step {{ $index }}</button>
              </li>
            }
          </ol>
        </div>
      `,
    })
    class LocalizedProgressHost {
      readonly selectedIndex = signal(0);
      readonly valueBy = signal<'index' | 'completed'>('index');
      readonly steps = signal([{ completed: false }, { completed: false }, { completed: false }]);
    }

    it('index basis uses the scope stepValueText override', () => {
      const { el, instance, fixture } = renderHost(LocalizedProgressHost);
      instance.selectedIndex.set(1);
      fixture.detectChanges();
      expect(progressEl(el).getAttribute('aria-valuetext')).toBe('Paso 2 de 3');
    });

    it('completed basis uses the scope progressValueText override', () => {
      const { el, instance, fixture } = renderHost(LocalizedProgressHost);
      instance.valueBy.set('completed');
      instance.steps.set([{ completed: true }, { completed: false }, { completed: false }]);
      instance.selectedIndex.set(1);
      fixture.detectChanges();
      expect(progressEl(el).getAttribute('aria-valuetext')).toBe('33% completado');
    });
  });

  it('orphan guard: ForStepperProgress outside [forStepper] throws', () => {
    @Component({
      imports: [ForStepperProgress],
      template: `<div forStepperProgress></div>`,
    })
    class OrphanProgress {}

    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    expect(() => TestBed.createComponent(OrphanProgress).detectChanges()).toThrow(
      /\[forty-cdk\/stepper\] ForStepperProgress must be used inside a \[forStepper\] element/,
    );
  });
});
