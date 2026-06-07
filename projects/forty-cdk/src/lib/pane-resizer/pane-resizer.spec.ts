import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { pressKey, renderHost } from '../../test-utils';
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
      (resize)="resizeEvents.push($event)"
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

    it('reflects aria-orientation="horizontal" explicitly', () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      fixture.componentInstance.orientation.set('horizontal');
      flush();
      const el = query<HTMLElement>('[forPaneResizer]')!;
      expect(el.getAttribute('aria-orientation')).toBe('horizontal');
    });

    it('reflects aria-valuetext and aria-controls when set', () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      fixture.componentInstance.valueText.set('30 percent of viewport');
      fixture.componentInstance.controls.set('pane-a pane-b');
      flush();
      const el = query<HTMLElement>('[forPaneResizer]')!;

      expect(el.getAttribute('aria-valuetext')).toBe('30 percent of viewport');
      expect(el.getAttribute('aria-controls')).toBe('pane-a pane-b');
    });

    it('reflects disabled via tabindex/aria-disabled/data-disabled', () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      fixture.componentInstance.disabled.set(true);
      flush();
      const el = query<HTMLElement>('[forPaneResizer]')!;

      expect(el.hasAttribute('tabindex')).toBe(false);
      expect(el.getAttribute('aria-disabled')).toBe('true');
      expect(el.getAttribute('data-disabled')).toBe('');
    });

    it('reflects dir to the native dir attribute for both ltr and rtl', () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      const el = query<HTMLElement>('[forPaneResizer]')!;
      expect(el.getAttribute('dir')).toBe('ltr');

      fixture.componentInstance.dir.set('rtl');
      flush();
      expect(el.getAttribute('dir')).toBe('rtl');
    });
  });

  describe('keyboard (vertical separator, LTR)', () => {
    it('ArrowRight increments by step, ArrowLeft decrements', () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      const el = query<HTMLElement>('[forPaneResizer]')!;

      press(el, 'ArrowRight');
      flush();
      expect(fixture.componentInstance.value()).toBe(51);

      press(el, 'ArrowLeft');
      flush();
      expect(fixture.componentInstance.value()).toBe(50);
    });

    it('ArrowUp/ArrowDown are no-ops on a vertical separator', () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      const el = query<HTMLElement>('[forPaneResizer]')!;

      press(el, 'ArrowUp');
      press(el, 'ArrowDown');
      flush();
      expect(fixture.componentInstance.value()).toBe(50);
    });

    it('PageUp/PageDown apply largeStep', () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      const el = query<HTMLElement>('[forPaneResizer]')!;

      press(el, 'PageDown');
      flush();
      expect(fixture.componentInstance.value()).toBe(60);

      press(el, 'PageUp');
      press(el, 'PageUp');
      flush();
      expect(fixture.componentInstance.value()).toBe(40);
    });

    it('Home/End snap to min/max', () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      const el = query<HTMLElement>('[forPaneResizer]')!;

      press(el, 'Home');
      flush();
      expect(fixture.componentInstance.value()).toBe(0);

      press(el, 'End');
      flush();
      expect(fixture.componentInstance.value()).toBe(100);
    });

    it('clamps to [min, max]', () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      fixture.componentInstance.value.set(99);
      flush();

      const el = query<HTMLElement>('[forPaneResizer]')!;
      press(el, 'PageDown'); // would land on 109
      flush();
      expect(fixture.componentInstance.value()).toBe(100);
    });

    it('preventDefault is called on handled keys', () => {
      const { query } = renderHost(PaneResizerHost);
      const el = query<HTMLElement>('[forPaneResizer]')!;

      const ev = press(el, 'ArrowRight');
      expect(ev.defaultPrevented).toBe(true);
    });

    it('emits (resize) on every step and (resizeCommit) on keyup', () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      const el = query<HTMLElement>('[forPaneResizer]')!;
      const inst = fixture.componentInstance;

      press(el, 'ArrowRight');
      press(el, 'ArrowRight');
      flush();

      expect(inst.resizeEvents).toEqual([51, 52]);
      expect(inst.commitEvents).toEqual([51, 52]); // one commit per keyup
    });
  });

  describe('keyboard (vertical separator, RTL)', () => {
    it('ArrowLeft increments and ArrowRight decrements when dir="rtl"', () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      fixture.componentInstance.dir.set('rtl');
      flush();
      const el = query<HTMLElement>('[forPaneResizer]')!;

      press(el, 'ArrowLeft');
      flush();
      expect(fixture.componentInstance.value()).toBe(51);

      press(el, 'ArrowRight');
      flush();
      expect(fixture.componentInstance.value()).toBe(50);
    });
  });

  describe('keyboard (horizontal separator)', () => {
    it('ArrowDown/ArrowUp resize, ArrowLeft/Right are no-ops', () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      fixture.componentInstance.orientation.set('horizontal');
      flush();
      const el = query<HTMLElement>('[forPaneResizer]')!;

      press(el, 'ArrowDown');
      flush();
      expect(fixture.componentInstance.value()).toBe(51);

      press(el, 'ArrowUp');
      flush();
      expect(fixture.componentInstance.value()).toBe(50);

      press(el, 'ArrowLeft');
      press(el, 'ArrowRight');
      flush();
      expect(fixture.componentInstance.value()).toBe(50);
    });
  });

  describe('collapsible', () => {
    it('Enter toggles between min and the previous value when collapsible', () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      fixture.componentInstance.collapsible.set(true);
      fixture.componentInstance.value.set(70);
      flush();
      const el = query<HTMLElement>('[forPaneResizer]')!;

      press(el, 'Enter');
      flush();
      expect(fixture.componentInstance.value()).toBe(0);

      press(el, 'Enter');
      flush();
      expect(fixture.componentInstance.value()).toBe(70);
    });

    it('Enter is a no-op when collapsible=false', () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      fixture.componentInstance.value.set(70);
      flush();
      const el = query<HTMLElement>('[forPaneResizer]')!;

      press(el, 'Enter');
      flush();
      expect(fixture.componentInstance.value()).toBe(70);
    });

    it('Enter at min restores to max when no prior non-min value exists', () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      fixture.componentInstance.collapsible.set(true);
      fixture.componentInstance.value.set(0);
      flush();
      const el = query<HTMLElement>('[forPaneResizer]')!;

      press(el, 'Enter');
      flush();
      expect(fixture.componentInstance.value()).toBe(100);
    });
  });

  describe('disabled', () => {
    it('blocks keyboard mutations', () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      fixture.componentInstance.disabled.set(true);
      flush();
      const el = query<HTMLElement>('[forPaneResizer]')!;

      press(el, 'ArrowRight');
      press(el, 'End');
      flush();
      expect(fixture.componentInstance.value()).toBe(50);
      expect(fixture.componentInstance.resizeEvents).toEqual([]);
      expect(fixture.componentInstance.commitEvents).toEqual([]);
    });
  });

  describe('pointer drag (wiring guards)', () => {
    function pointerEvent(
      type: string,
      init: { clientX?: number; clientY?: number; button?: number; pointerId?: number } = {},
    ): PointerEvent {
      const ev = new Event(type, { bubbles: true, cancelable: true }) as PointerEvent;
      Object.defineProperty(ev, 'clientX', { value: init.clientX ?? 0 });
      Object.defineProperty(ev, 'clientY', { value: init.clientY ?? 0 });
      Object.defineProperty(ev, 'button', { value: init.button ?? 0 });
      Object.defineProperty(ev, 'pointerId', { value: init.pointerId ?? 1 });
      return ev;
    }

    it('does not start a drag when disabled', () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      fixture.componentInstance.disabled.set(true);
      flush();
      const el = query<HTMLElement>('[forPaneResizer]')!;

      el.dispatchEvent(pointerEvent('pointerdown', { clientX: 100 }));
      el.dispatchEvent(pointerEvent('pointermove', { clientX: 200 }));
      flush();
      expect(fixture.componentInstance.value()).toBe(50);
      expect(fixture.componentInstance.resizeEvents).toEqual([]);
    });

    it('ignores non-primary mouse buttons', () => {
      const { fixture, query, flush } = renderHost(PaneResizerHost);
      const el = query<HTMLElement>('[forPaneResizer]')!;

      el.dispatchEvent(pointerEvent('pointerdown', { clientX: 100, button: 2 }));
      el.dispatchEvent(pointerEvent('pointermove', { clientX: 200 }));
      flush();
      expect(fixture.componentInstance.value()).toBe(50);
      expect(fixture.componentInstance.resizeEvents).toEqual([]);
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
