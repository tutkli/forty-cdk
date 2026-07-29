import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { pointerEvent, pressKey, renderHost } from '../../src/test-utils';
import { ForPaneResizer } from './pane-resizer';

@Component({
  imports: [ForPaneResizer],
  template: `
    <div
      forPaneResizer
      [orientation]="orientation()"
      [dir]="dir()"
      [disabled]="disabled()"
      [collapsible]="collapsible()"
      [(value)]="value"
      [min]="min()"
      [max]="max()"
      [step]="step()"
      [largeStep]="largeStep()"
      [valueText]="valueText()"
      [controls]="controls()"
      (resizing)="resizeEvents.push($event)"
      (resizeCommit)="commitEvents.push($event)"
    ></div>
  `,
})
class PaneResizerHost {
  readonly orientation = signal<'horizontal' | 'vertical'>('vertical');
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
  readonly disabled = signal(false);
  readonly collapsible = signal(false);
  readonly value = signal(50);
  readonly min = signal(0);
  readonly max = signal(100);
  readonly step = signal(1);
  readonly largeStep = signal(10);
  readonly valueText = signal<string | null>(null);
  readonly controls = signal<string | null>(null);
  readonly resizeEvents: number[] = [];
  readonly commitEvents: number[] = [];
}

@Component({
  imports: [ForPaneResizer],
  template: `
    @if (show()) {
      <div
        forPaneResizer
        orientation="vertical"
        [(value)]="value"
        [min]="0"
        [max]="100"
        [valueRevert]="onValueRevert"
        (resizeCommit)="commitEvents.push($event)"
      ></div>
    }
  `,
})
class RemovablePaneResizerHost {
  readonly show = signal(true);
  readonly value = signal(50);
  readonly commitEvents: number[] = [];
  readonly reverts: number[] = [];
  readonly onValueRevert = (value: number): void => {
    this.reverts.push(value);
    this.value.set(value);
  };
}

/**
 * Pane resizers react to both keydown (the actual step) and keyup (the
 * "release" that fires `(resizeCommit)`). The shared `pressKey` helper only
 * dispatches one event; this spec wraps it to dispatch the full cycle.
 */
function press(el: HTMLElement, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const down = pressKey(el, key, init);
  pressKey(el, key, { ...init, type: 'keyup' });
  return down;
}

describe('ForPaneResizer', () => {
  describe('ARIA', () => {
    it('exposes role="separator", tabindex, aria-orientation, and aria-value*', () => {
      const { query } = renderHost(PaneResizerHost);
      const el = query<HTMLElement>('[forPaneResizer]')!;

      expect(el.getAttribute('role')).toBe('separator');
      expect(el.getAttribute('tabindex')).toBe('0');
      expect(el.getAttribute('aria-orientation')).toBe('vertical');
      expect(el.getAttribute('aria-valuenow')).toBe('50');
      expect(el.getAttribute('aria-valuemin')).toBe('0');
      expect(el.getAttribute('aria-valuemax')).toBe('100');
    });

    it('reflects aria-orientation="horizontal" explicitly', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      fixture.componentInstance.orientation.set('horizontal');
      await flush();
      const el = query<HTMLElement>('[forPaneResizer]')!;
      expect(el.getAttribute('aria-orientation')).toBe('horizontal');
    });

    it('reflects aria-valuetext and aria-controls when set', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      fixture.componentInstance.valueText.set('30 percent of viewport');
      fixture.componentInstance.controls.set('pane-a pane-b');
      await flush();
      const el = query<HTMLElement>('[forPaneResizer]')!;

      expect(el.getAttribute('aria-valuetext')).toBe('30 percent of viewport');
      expect(el.getAttribute('aria-controls')).toBe('pane-a pane-b');
    });

    it('emits no aria-valuetext attribute for null or an empty string', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      const el = query<HTMLElement>('[forPaneResizer]')!;

      expect(el.hasAttribute('aria-valuetext')).toBe(false);

      fixture.componentInstance.valueText.set('');
      await flush();
      expect(el.hasAttribute('aria-valuetext')).toBe(false);
    });

    it('reflects disabled via tabindex/aria-disabled/data-disabled', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      fixture.componentInstance.disabled.set(true);
      await flush();
      const el = query<HTMLElement>('[forPaneResizer]')!;

      expect(el.hasAttribute('tabindex')).toBe(false);
      expect(el.getAttribute('aria-disabled')).toBe('true');
      expect(el.getAttribute('data-disabled')).toBe('');
    });

    it('reflects dir to the native dir attribute for both ltr and rtl', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      const el = query<HTMLElement>('[forPaneResizer]')!;
      expect(el.getAttribute('dir')).toBe('ltr');

      fixture.componentInstance.dir.set('rtl');
      await flush();
      expect(el.getAttribute('dir')).toBe('rtl');
    });
  });

  describe('touch-action (#1152)', () => {
    it('sets touch-action:pan-y on a vertical separator (resize axis is x)', () => {
      const { query } = renderHost(PaneResizerHost);
      const el = query<HTMLElement>('[forPaneResizer]')!;
      expect(el.style.touchAction).toBe('pan-y');
    });

    it('sets touch-action:pan-x on a horizontal separator (resize axis is y)', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      fixture.componentInstance.orientation.set('horizontal');
      await flush();
      const el = query<HTMLElement>('[forPaneResizer]')!;
      expect(el.style.touchAction).toBe('pan-x');
    });

    it('omits touch-action while disabled (no drag to protect)', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      fixture.componentInstance.disabled.set(true);
      await flush();
      const el = query<HTMLElement>('[forPaneResizer]')!;
      expect(el.style.touchAction).toBe('');
    });
  });

  describe('keyboard (vertical separator, LTR)', () => {
    it('ArrowRight increments by step, ArrowLeft decrements', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      const el = query<HTMLElement>('[forPaneResizer]')!;

      press(el, 'ArrowRight');
      await flush();
      expect(fixture.componentInstance.value()).toBe(51);

      press(el, 'ArrowLeft');
      await flush();
      expect(fixture.componentInstance.value()).toBe(50);
    });

    it('ArrowUp/ArrowDown are no-ops on a vertical separator', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      const el = query<HTMLElement>('[forPaneResizer]')!;

      press(el, 'ArrowUp');
      press(el, 'ArrowDown');
      await flush();
      expect(fixture.componentInstance.value()).toBe(50);
    });

    it('rounds a fractional step to clean values without float noise (#590 F5)', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      fixture.componentInstance.value.set(0);
      fixture.componentInstance.step.set(0.1);
      await flush();
      const el = query<HTMLElement>('[forPaneResizer]')!;

      press(el, 'ArrowRight');
      press(el, 'ArrowRight');
      press(el, 'ArrowRight');
      await flush();
      // 0 + 0.1 * 3 would be 0.30000000000000004 without precision rounding.
      expect(fixture.componentInstance.value()).toBe(0.3);
    });

    it('PageUp/PageDown apply largeStep', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      const el = query<HTMLElement>('[forPaneResizer]')!;

      press(el, 'PageDown');
      await flush();
      expect(fixture.componentInstance.value()).toBe(60);

      press(el, 'PageUp');
      press(el, 'PageUp');
      await flush();
      expect(fixture.componentInstance.value()).toBe(40);
    });

    it('Home/End snap to min/max', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      const el = query<HTMLElement>('[forPaneResizer]')!;

      press(el, 'Home');
      await flush();
      expect(fixture.componentInstance.value()).toBe(0);

      press(el, 'End');
      await flush();
      expect(fixture.componentInstance.value()).toBe(100);
    });

    it('clamps to [min, max]', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      fixture.componentInstance.value.set(99);
      await flush();

      const el = query<HTMLElement>('[forPaneResizer]')!;
      press(el, 'PageDown'); // would land on 109
      await flush();
      expect(fixture.componentInstance.value()).toBe(100);
    });

    it('preventDefault is called on handled keys', () => {
      const { query } = renderHost(PaneResizerHost);
      const el = query<HTMLElement>('[forPaneResizer]')!;

      const ev = press(el, 'ArrowRight');
      expect(ev.defaultPrevented).toBe(true);
    });

    it('emits (resizing) on every step and (resizeCommit) on keyup', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      const el = query<HTMLElement>('[forPaneResizer]')!;
      const inst = fixture.componentInstance;

      press(el, 'ArrowRight');
      press(el, 'ArrowRight');
      await flush();

      expect(inst.resizeEvents).toEqual([51, 52]);
      expect(inst.commitEvents).toEqual([51, 52]); // one commit per keyup
    });
  });

  describe('keyboard (vertical separator, RTL)', () => {
    it('ArrowLeft increments and ArrowRight decrements when dir="rtl"', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      fixture.componentInstance.dir.set('rtl');
      await flush();
      const el = query<HTMLElement>('[forPaneResizer]')!;

      press(el, 'ArrowLeft');
      await flush();
      expect(fixture.componentInstance.value()).toBe(51);

      press(el, 'ArrowRight');
      await flush();
      expect(fixture.componentInstance.value()).toBe(50);
    });
  });

  describe('keyboard (horizontal separator)', () => {
    it('ArrowDown/ArrowUp resize, ArrowLeft/Right are no-ops', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      fixture.componentInstance.orientation.set('horizontal');
      await flush();
      const el = query<HTMLElement>('[forPaneResizer]')!;

      press(el, 'ArrowDown');
      await flush();
      expect(fixture.componentInstance.value()).toBe(51);

      press(el, 'ArrowUp');
      await flush();
      expect(fixture.componentInstance.value()).toBe(50);

      press(el, 'ArrowLeft');
      press(el, 'ArrowRight');
      await flush();
      expect(fixture.componentInstance.value()).toBe(50);
    });
  });

  describe('keyboard commit flush (#1392 item 10)', () => {
    it('flushes a pending resizeCommit on blur when focus leaves before keyup', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      const el = query<HTMLElement>('[forPaneResizer]')!;
      const inst = fixture.componentInstance;

      pressKey(el, 'ArrowRight');
      await flush();
      expect(inst.value()).toBe(51);
      expect(inst.commitEvents).toEqual([]);

      el.dispatchEvent(new FocusEvent('blur'));
      await flush();
      expect(inst.value()).toBe(51);
      expect(inst.commitEvents).toEqual([51]);
    });

    it('emits exactly one resizeCommit when blur follows a keyup that already committed', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      const el = query<HTMLElement>('[forPaneResizer]')!;
      const inst = fixture.componentInstance;

      press(el, 'ArrowRight');
      el.dispatchEvent(new FocusEvent('blur'));
      await flush();
      expect(inst.commitEvents).toEqual([51]);
    });

    it('emits no resizeCommit on a blur with no pending keyboard mutation', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      const el = query<HTMLElement>('[forPaneResizer]')!;
      const inst = fixture.componentInstance;

      el.dispatchEvent(new FocusEvent('blur'));
      await flush();
      expect(inst.commitEvents).toEqual([]);
      expect(inst.resizeEvents).toEqual([]);
    });

    it('emits no resizeCommit on blur after a key that did not change the value', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      const inst = fixture.componentInstance;
      inst.value.set(100);
      await flush();
      const el = query<HTMLElement>('[forPaneResizer]')!;

      pressKey(el, 'End');
      el.dispatchEvent(new FocusEvent('blur'));
      await flush();
      expect(inst.commitEvents).toEqual([]);
    });
  });

  describe('collapsible', () => {
    it('Enter toggles between min and the previous value when collapsible', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      fixture.componentInstance.collapsible.set(true);
      fixture.componentInstance.value.set(70);
      await flush();
      const el = query<HTMLElement>('[forPaneResizer]')!;

      press(el, 'Enter');
      await flush();
      expect(fixture.componentInstance.value()).toBe(0);

      press(el, 'Enter');
      await flush();
      expect(fixture.componentInstance.value()).toBe(70);
    });

    it('Enter is a no-op when collapsible=false', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      fixture.componentInstance.value.set(70);
      await flush();
      const el = query<HTMLElement>('[forPaneResizer]')!;

      press(el, 'Enter');
      await flush();
      expect(fixture.componentInstance.value()).toBe(70);
    });

    it('Enter at min restores to max when no prior non-min value exists', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      fixture.componentInstance.collapsible.set(true);
      fixture.componentInstance.value.set(0);
      await flush();
      const el = query<HTMLElement>('[forPaneResizer]')!;

      press(el, 'Enter');
      await flush();
      expect(fixture.componentInstance.value()).toBe(100);
    });

    it('Enter after a drag to min restores the pre-drag size, not max (#1392 item 11)', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      const inst = fixture.componentInstance;
      inst.collapsible.set(true);
      inst.value.set(50);
      await flush();
      const el = query<HTMLElement>('[forPaneResizer]')!;

      el.dispatchEvent(pointerEvent('pointerdown', { clientX: 100 }));
      document.dispatchEvent(pointerEvent('pointermove', { clientX: 40 }));
      document.dispatchEvent(pointerEvent('pointerup', { clientX: 40 }));
      await flush();
      expect(inst.value()).toBe(0);

      press(el, 'Enter');
      await flush();
      expect(inst.value()).toBe(50);
      expect(inst.commitEvents).toEqual([0, 50]);
    });

    it('Enter after a keyboard Home to min restores the pre-Home size', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      const inst = fixture.componentInstance;
      inst.collapsible.set(true);
      inst.value.set(50);
      await flush();
      const el = query<HTMLElement>('[forPaneResizer]')!;

      press(el, 'Home');
      await flush();
      expect(inst.value()).toBe(0);

      press(el, 'Enter');
      await flush();
      expect(inst.value()).toBe(50);
    });

    it('Enter after one held keyboard burst down to min restores the burst-start size', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      const inst = fixture.componentInstance;
      inst.collapsible.set(true);
      inst.value.set(3);
      inst.step.set(1);
      await flush();
      const el = query<HTMLElement>('[forPaneResizer]')!;

      pressKey(el, 'ArrowLeft');
      pressKey(el, 'ArrowLeft');
      pressKey(el, 'ArrowLeft');
      pressKey(el, 'ArrowLeft', { type: 'keyup' });
      await flush();
      expect(inst.value()).toBe(0);

      press(el, 'Enter');
      await flush();
      expect(inst.value()).toBe(3);
    });

    it('Enter after a drag that settles above min restores that committed size, not the pre-drag one', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      const inst = fixture.componentInstance;
      inst.collapsible.set(true);
      inst.value.set(50);
      await flush();
      const el = query<HTMLElement>('[forPaneResizer]')!;

      el.dispatchEvent(pointerEvent('pointerdown', { clientX: 100 }));
      document.dispatchEvent(pointerEvent('pointermove', { clientX: 120 }));
      document.dispatchEvent(pointerEvent('pointerup', { clientX: 120 }));
      await flush();
      expect(inst.value()).toBe(70);

      inst.value.set(0);
      await flush();

      press(el, 'Enter');
      await flush();
      expect(inst.value()).toBe(70);
    });

    it('an Escape-reverted drag does not become the collapse restore target', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      const inst = fixture.componentInstance;
      inst.collapsible.set(true);
      inst.value.set(0);
      await flush();
      const el = query<HTMLElement>('[forPaneResizer]')!;

      el.dispatchEvent(pointerEvent('pointerdown', { clientX: 100 }));
      document.dispatchEvent(pointerEvent('pointermove', { clientX: 130 }));
      await flush();
      expect(inst.value()).toBe(30);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await flush();
      expect(inst.value()).toBe(0);

      press(el, 'Enter');
      await flush();
      expect(inst.value()).toBe(100);
    });
  });

  describe('disabled', () => {
    it('blocks keyboard mutations', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      fixture.componentInstance.disabled.set(true);
      await flush();
      const el = query<HTMLElement>('[forPaneResizer]')!;

      press(el, 'ArrowRight');
      press(el, 'End');
      await flush();
      expect(fixture.componentInstance.value()).toBe(50);
      expect(fixture.componentInstance.resizeEvents).toEqual([]);
      expect(fixture.componentInstance.commitEvents).toEqual([]);
    });
  });

  describe('pointer drag', () => {
    it('does not start a drag when disabled', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      fixture.componentInstance.disabled.set(true);
      await flush();
      const el = query<HTMLElement>('[forPaneResizer]')!;

      el.dispatchEvent(pointerEvent('pointerdown', { clientX: 100 }));
      document.dispatchEvent(pointerEvent('pointermove', { clientX: 200 }));
      await flush();
      expect(fixture.componentInstance.value()).toBe(50);
      expect(fixture.componentInstance.resizeEvents).toEqual([]);
    });

    it('ignores non-primary mouse buttons', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      const el = query<HTMLElement>('[forPaneResizer]')!;

      el.dispatchEvent(pointerEvent('pointerdown', { clientX: 100, button: 2 }));
      document.dispatchEvent(pointerEvent('pointermove', { clientX: 200 }));
      await flush();
      expect(fixture.componentInstance.value()).toBe(50);
      expect(fixture.componentInstance.resizeEvents).toEqual([]);
    });

    it('focuses the separator on pointerdown so arrows fine-tune after a drag (#1392 item 3)', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      const el = query<HTMLElement>('[forPaneResizer]')!;
      const inst = fixture.componentInstance;

      el.dispatchEvent(pointerEvent('pointerdown', { clientX: 100 }));
      await flush();
      expect(document.activeElement).toBe(el);

      press(el, 'ArrowRight');
      await flush();
      expect(inst.value()).toBe(51);
    });

    it('does not focus the separator when disabled', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      fixture.componentInstance.disabled.set(true);
      await flush();
      const el = query<HTMLElement>('[forPaneResizer]')!;
      const before = document.activeElement;

      el.dispatchEvent(pointerEvent('pointerdown', { clientX: 100 }));
      await flush();
      expect(document.activeElement).toBe(before);
    });

    it('focuses the separator even on a press that never crosses the dead zone', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      const el = query<HTMLElement>('[forPaneResizer]')!;
      const inst = fixture.componentInstance;

      el.dispatchEvent(pointerEvent('pointerdown', { clientX: 100 }));
      document.dispatchEvent(pointerEvent('pointermove', { clientX: 102 }));
      await flush();
      expect(document.activeElement).toBe(el);
      expect(inst.resizeEvents).toEqual([]);
    });

    it('does not commit a mid-drag pointer value on blur (#1392 item 10)', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      const el = query<HTMLElement>('[forPaneResizer]')!;
      const inst = fixture.componentInstance;

      el.dispatchEvent(pointerEvent('pointerdown', { clientX: 100 }));
      document.dispatchEvent(pointerEvent('pointermove', { clientX: 120 }));
      el.dispatchEvent(new FocusEvent('blur'));
      await flush();
      expect(inst.value()).toBe(70);
      expect(inst.commitEvents).toEqual([]);
    });

    it('does not mutate the value on a stray sub-dead-zone pointermove (#590 F6)', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      const el = query<HTMLElement>('[forPaneResizer]')!;

      el.dispatchEvent(pointerEvent('pointerdown', { clientX: 100 }));
      document.dispatchEvent(pointerEvent('pointermove', { clientX: 102 }));
      await flush();
      expect(fixture.componentInstance.resizeEvents).toEqual([]);
      expect(fixture.componentInstance.value()).toBe(50);

      document.dispatchEvent(pointerEvent('pointermove', { clientX: 110 }));
      await flush();
      expect(fixture.componentInstance.resizeEvents.length).toBeGreaterThan(0);
    });

    it('widens the value on an armed drag and commits once on pointerup', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      const el = query<HTMLElement>('[forPaneResizer]')!;
      const inst = fixture.componentInstance;

      el.dispatchEvent(pointerEvent('pointerdown', { clientX: 100 }));
      document.dispatchEvent(pointerEvent('pointermove', { clientX: 120 }));
      await flush();
      expect(inst.value()).toBe(70);
      expect(inst.commitEvents).toEqual([]);

      document.dispatchEvent(pointerEvent('pointerup', { clientX: 120 }));
      await flush();
      expect(inst.commitEvents).toEqual([70]);
    });

    it('Escape mid-drag restores the pre-drag value and emits no resizeCommit', async () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      const el = query<HTMLElement>('[forPaneResizer]')!;
      const inst = fixture.componentInstance;

      el.dispatchEvent(pointerEvent('pointerdown', { clientX: 100 }));
      document.dispatchEvent(pointerEvent('pointermove', { clientX: 120 }));
      await flush();
      expect(inst.value()).toBe(70);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await flush();
      expect(inst.value()).toBe(50);
      expect(inst.commitEvents).toEqual([]);
    });

    it('destroying the resizer mid-drag reverts through [valueRevert] with no destroyed-output warning', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { fixture, query, flush } = renderHost(RemovablePaneResizerHost);
      const inst = fixture.componentInstance;
      const el = query<HTMLElement>('[forPaneResizer]')!;

      el.dispatchEvent(pointerEvent('pointerdown', { clientX: 100 }));
      document.dispatchEvent(pointerEvent('pointermove', { clientX: 120 }));
      await flush();
      expect(inst.value()).toBe(70);

      inst.show.set(false);
      await flush();
      expect(inst.reverts).toEqual([50]);
      expect(inst.value()).toBe(50);
      expect(inst.commitEvents).toEqual([]);
      expect(warn.mock.calls.flat().join(' ')).not.toContain('NG0953');
    });

    it('destroying the resizer while idle fires no [valueRevert]', async () => {
      const { fixture, flush } = renderHost(RemovablePaneResizerHost);
      const inst = fixture.componentInstance;
      await flush();
      inst.show.set(false);
      await flush();
      expect(inst.reverts).toEqual([]);
      expect(inst.value()).toBe(50);
    });

    it('Escape mid-drag reverts through [(value)] and does not fire [valueRevert]', async () => {
      const { fixture, query, flush } = renderHost(RemovablePaneResizerHost);
      const inst = fixture.componentInstance;
      const el = query<HTMLElement>('[forPaneResizer]')!;

      el.dispatchEvent(pointerEvent('pointerdown', { clientX: 100 }));
      document.dispatchEvent(pointerEvent('pointermove', { clientX: 120 }));
      await flush();
      expect(inst.value()).toBe(70);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await flush();
      expect(inst.value()).toBe(50);
      expect(inst.reverts).toEqual([]);
    });

    it('suppresses the click that follows an armed pointer release', async () => {
      const { query, flush } = renderHost(PaneResizerHost);
      const el = query<HTMLElement>('[forPaneResizer]')!;

      el.dispatchEvent(pointerEvent('pointerdown', { clientX: 100 }));
      document.dispatchEvent(pointerEvent('pointermove', { clientX: 120 }));
      document.dispatchEvent(pointerEvent('pointerup', { clientX: 120 }));
      await flush();

      const click = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: 120,
        clientY: 0,
      });
      document.dispatchEvent(click);
      expect(click.defaultPrevented).toBe(true);
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects aria-value* under provideZonelessChangeDetection', () => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });

      @Component({
        imports: [ForPaneResizer],
        template: `<div forPaneResizer [value]="v()" [min]="0" [max]="100"></div>`,
      })
      class Host {
        readonly v = signal(40);
      }

      const fixture = TestBed.createComponent(Host);
      fixture.detectChanges();

      const el = fixture.nativeElement.querySelector('[forPaneResizer]') as HTMLElement;
      expect(el.getAttribute('aria-valuenow')).toBe('40');
      expect(el.getAttribute('tabindex')).toBe('0');

      fixture.componentInstance.v.set(72);
      fixture.detectChanges();
      expect(el.getAttribute('aria-valuenow')).toBe('72');
    });
  });
});
