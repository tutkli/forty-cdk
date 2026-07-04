import { Component, provideZonelessChangeDetection, signal, viewChild } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { TestBed } from '@angular/core/testing';

import { renderHost } from '../../src/test-utils/render';
import {
  assertFormControlContract,
  type FormControlMountResult,
} from '../../src/test-utils/contract';
import { ForFieldset } from 'forty-cdk/fieldset';
import { ForSlider } from './slider';
import { ForSliderRange } from './slider-range';
import { ForSliderThumb } from './slider-thumb';
import { ForSliderTrack } from './slider-track';

const SLIDER_IMPORTS = [ForSlider, ForSliderTrack, ForSliderRange, ForSliderThumb] as const;

@Component({
  imports: [...SLIDER_IMPORTS],
  template: `
    <div
      forSlider
      [(value)]="picked"
      [min]="min()"
      [max]="max()"
      [step]="step()"
      [largeStep]="largeStep()"
      [orientation]="orientation()"
      [dir]="dir()"
      [disabled]="disabled()"
      [readonly]="readonly()"
      [inverted]="inverted()"
      [minStepsBetweenThumbs]="gap()"
      [name]="name()"
      [touched]="touched()"
      (valueChange)="onValueChange($event)"
      (valueCommit)="onValueCommit($event)"
      (touchedChange)="onTouchedChange($event)"
      data-test-id="root"
    >
      <span forSliderTrack data-test-id="track">
        <span forSliderRange data-test-id="range"></span>
        @for (v of picked(); let i = $index; track i) {
          <span
            forSliderThumb
            [index]="i"
            [label]="thumbLabel(i)"
            [valueText]="valueText()"
            [attr.data-test-id]="'thumb-' + i"
          ></span>
        }
      </span>
    </div>
  `,
})
class SliderHost {
  readonly picked = signal<readonly number[]>([50]);
  readonly min = signal(0);
  readonly max = signal(100);
  readonly step = signal(1);
  readonly largeStep = signal(10);
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly inverted = signal(false);
  readonly gap = signal(0);
  readonly name = signal('');
  readonly touched = signal(false);
  readonly valueText = signal('');
  readonly valueChanges: (readonly number[])[] = [];
  readonly valueCommits: (readonly number[])[] = [];
  readonly touchedChanges: boolean[] = [];

  thumbLabel(i: number): string {
    return this.picked().length > 1 ? (i === 0 ? 'Min' : 'Max') : 'Volume';
  }

  onValueChange(v: readonly number[]): void {
    this.valueChanges.push(v);
  }
  onValueCommit(v: readonly number[]): void {
    this.valueCommits.push(v);
  }
  onTouchedChange(t: boolean): void {
    this.touchedChanges.push(t);
  }
}

@Component({
  imports: [...SLIDER_IMPORTS],
  template: `
    <div
      forSlider
      [(value)]="picked"
      [readonly]="isReadonly()"
      [required]="isRequired()"
      [invalid]="isInvalid()"
      [pending]="isPending()"
      [(touched)]="isTouched"
      [dirty]="isDirty()"
      data-test-id="root"
    >
      <span forSliderTrack>
        <span forSliderRange></span>
        @for (v of picked(); let i = $index; track i) {
          <span forSliderThumb [index]="i" label="Volume"></span>
        }
      </span>
    </div>
  `,
})
class SliderFormControlHost {
  readonly picked = signal<readonly number[]>([50]);
  readonly isReadonly = signal(false);
  readonly isRequired = signal(false);
  readonly isInvalid = signal(false);
  readonly isPending = signal(false);
  readonly isTouched = signal(false);
  readonly isDirty = signal(false);
}

const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-test-id="root"]')!;
const track = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-test-id="track"]')!;
const range = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-test-id="range"]')!;
const thumb = (host: HTMLElement, i: number) =>
  host.querySelector<HTMLElement>(`[data-test-id="thumb-${i}"]`)!;

const keyDown = (target: HTMLElement, key: string, init: KeyboardEventInit = {}) =>
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
  );

const keyUp = (target: HTMLElement, key: string, init: KeyboardEventInit = {}) =>
  target.dispatchEvent(
    new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true, ...init }),
  );

// Pointer / drag math is covered against real browser layout in
// `projects/forty-cdk-harness/e2e/slider.e2e.ts` — per CLAUDE.md "Testing
// notes", jsdom returns zeros from `getBoundingClientRect()` and stubbing it
// here would tautologically assert the math against the stubbed rect rather
// than a real laid-out track. The keyboard / ARIA / form-control coverage
// below does not need geometry and stays in Vitest.

describe('ForSlider', () => {
  assertFormControlContract(
    () => {
      const r = renderHost(SliderFormControlHost);
      const result: FormControlMountResult = {
        control: root(r.el),
        flush: r.flush,
        setFlag: (flag, value) => {
          switch (flag) {
            case 'readonly':
              r.instance.isReadonly.set(value);
              return;
            case 'required':
              r.instance.isRequired.set(value);
              return;
            case 'invalid':
              r.instance.isInvalid.set(value);
              return;
            case 'pending':
              r.instance.isPending.set(value);
              return;
            case 'touched':
              r.instance.isTouched.set(value);
              return;
            case 'dirty':
              r.instance.isDirty.set(value);
              return;
          }
        },
      };
      return result;
    },
    { flags: ['readonly', 'required', 'invalid', 'pending', 'touched', 'dirty'] },
  );

  describe('static accessibility', () => {
    it('sets role=group on root and role=slider on each thumb', () => {
      const { el } = renderHost(SliderHost);
      expect(root(el).getAttribute('role')).toBe('group');
      expect(thumb(el, 0).getAttribute('role')).toBe('slider');
    });

    it('exposes aria-valuemin / aria-valuemax / aria-valuenow / aria-orientation on the thumb', () => {
      const { el } = renderHost(SliderHost);
      const t = thumb(el, 0);
      expect(t.getAttribute('aria-valuemin')).toBe('0');
      expect(t.getAttribute('aria-valuemax')).toBe('100');
      expect(t.getAttribute('aria-valuenow')).toBe('50');
      expect(t.getAttribute('aria-orientation')).toBe('horizontal');
    });

    it('omits aria-valuetext by default so aria-valuenow is announced', () => {
      const { el } = renderHost(SliderHost);
      expect(thumb(el, 0).hasAttribute('aria-valuetext')).toBe(false);
    });

    it('reflects [valueText] as aria-valuetext when set', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.valueText.set('$50');
      await flush();
      expect(thumb(el, 0).getAttribute('aria-valuetext')).toBe('$50');
    });

    it('reflects [label] as aria-label', () => {
      const { el } = renderHost(SliderHost);
      expect(thumb(el, 0).getAttribute('aria-label')).toBe('Volume');
    });

    it('mirrors data-orientation on every piece', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.orientation.set('vertical');
      await flush();
      expect(root(el).getAttribute('data-orientation')).toBe('vertical');
      expect(track(el).getAttribute('data-orientation')).toBe('vertical');
      expect(range(el).getAttribute('data-orientation')).toBe('vertical');
      expect(thumb(el, 0).getAttribute('data-orientation')).toBe('vertical');
    });

    it('reflects data-disabled and dir=rtl on the root', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.disabled.set(true);
      fixture.componentInstance.dir.set('rtl');
      await flush();
      expect(root(el).hasAttribute('data-disabled')).toBe(true);
      expect(root(el).getAttribute('dir')).toBe('rtl');
    });

    it('disabled thumb has tabindex=-1 and aria-disabled=true', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.disabled.set(true);
      await flush();
      expect(thumb(el, 0).getAttribute('tabindex')).toBe('-1');
      expect(thumb(el, 0).getAttribute('aria-disabled')).toBe('true');
    });

    it('enabled thumb has tabindex=0', () => {
      const { el } = renderHost(SliderHost);
      expect(thumb(el, 0).getAttribute('tabindex')).toBe('0');
    });
  });

  describe('touch-action (#1152)', () => {
    it('sets touch-action:pan-y on the thumb of a horizontal slider (frees vertical scroll)', () => {
      const { el } = renderHost(SliderHost);
      expect(thumb(el, 0).style.touchAction).toBe('pan-y');
    });

    it('sets touch-action:pan-x on the thumb of a vertical slider (frees horizontal scroll)', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.orientation.set('vertical');
      await flush();
      expect(thumb(el, 0).style.touchAction).toBe('pan-x');
    });

    it('omits touch-action on a disabled thumb (no drag to protect)', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.disabled.set(true);
      await flush();
      expect(thumb(el, 0).style.touchAction).toBe('');
    });

    it('omits touch-action on a readonly thumb', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.readonly.set(true);
      await flush();
      expect(thumb(el, 0).style.touchAction).toBe('');
    });
  });

  describe('keyboard (single thumb, horizontal LTR)', () => {
    it('ArrowRight increases by step', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      keyDown(thumb(el, 0), 'ArrowRight');
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([51]);
    });

    it('ArrowLeft decreases by step', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      keyDown(thumb(el, 0), 'ArrowLeft');
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([49]);
    });

    it('ArrowUp increases, ArrowDown decreases', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      keyDown(thumb(el, 0), 'ArrowUp');
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([51]);
      keyDown(thumb(el, 0), 'ArrowDown');
      keyDown(thumb(el, 0), 'ArrowDown');
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([49]);
    });

    it('PageUp / PageDown use largeStep', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      keyDown(thumb(el, 0), 'PageUp');
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([60]);
      keyDown(thumb(el, 0), 'PageDown');
      keyDown(thumb(el, 0), 'PageDown');
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([40]);
    });

    it('Home / End jump to min / max', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      keyDown(thumb(el, 0), 'Home');
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([0]);
      keyDown(thumb(el, 0), 'End');
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([100]);
    });

    it('clamps below min and above max', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.picked.set([0]);
      await flush();
      keyDown(thumb(el, 0), 'ArrowLeft');
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([0]);
      fixture.componentInstance.picked.set([100]);
      await flush();
      keyDown(thumb(el, 0), 'ArrowRight');
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([100]);
    });

    it('respects custom step', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.step.set(5);
      fixture.componentInstance.picked.set([20]);
      await flush();
      keyDown(thumb(el, 0), 'ArrowRight');
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([25]);
    });

    it('snaps off-step values onto the step grid', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.step.set(10);
      fixture.componentInstance.picked.set([23]);
      await flush();
      keyDown(thumb(el, 0), 'ArrowRight');
      await flush();
      // 23 + 10 = 33 → snap to 30
      expect(fixture.componentInstance.picked()).toEqual([30]);
    });

    it('rounds a fractional step to clean values without float noise (#590 F5)', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.step.set(0.1);
      fixture.componentInstance.picked.set([0]);
      await flush();
      keyDown(thumb(el, 0), 'ArrowRight');
      keyDown(thumb(el, 0), 'ArrowRight');
      keyDown(thumb(el, 0), 'ArrowRight');
      await flush();
      // 0 + 0.1 * 3 would be 0.30000000000000004 without precision rounding.
      expect(fixture.componentInstance.picked()).toEqual([0.3]);
      expect(thumb(el, 0).getAttribute('aria-valuenow')).toBe('0.3');
    });
  });

  describe('keyboard (RTL)', () => {
    it('ArrowLeft increases and ArrowRight decreases under dir=rtl', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.dir.set('rtl');
      await flush();
      keyDown(thumb(el, 0), 'ArrowLeft');
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([51]);
      keyDown(thumb(el, 0), 'ArrowRight');
      keyDown(thumb(el, 0), 'ArrowRight');
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([49]);
    });

    it('vertical: ArrowUp / ArrowDown stay axis-positive under dir=rtl (dir does not flip vertical)', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.orientation.set('vertical');
      fixture.componentInstance.dir.set('rtl');
      await flush();
      keyDown(thumb(el, 0), 'ArrowUp');
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([51]);
      keyDown(thumb(el, 0), 'ArrowDown');
      keyDown(thumb(el, 0), 'ArrowDown');
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([49]);
    });
  });

  describe('keyboard (inverted)', () => {
    it('ArrowRight decreases when inverted', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.inverted.set(true);
      await flush();
      keyDown(thumb(el, 0), 'ArrowRight');
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([49]);
    });
  });

  describe('disabled / readonly', () => {
    it('disabled blocks keyboard', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.disabled.set(true);
      await flush();
      keyDown(thumb(el, 0), 'ArrowRight');
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([50]);
    });

    it('readonly blocks keyboard but keeps thumb focusable', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.readonly.set(true);
      await flush();
      expect(thumb(el, 0).getAttribute('tabindex')).toBe('0');
      keyDown(thumb(el, 0), 'ArrowRight');
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([50]);
    });
  });

  describe('range / multi-thumb', () => {
    it('renders one thumb per value entry', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.picked.set([20, 80]);
      await flush();
      expect(thumb(el, 0)).not.toBeNull();
      expect(thumb(el, 1)).not.toBeNull();
    });

    it('thumb aria-valuemin / aria-valuemax constrain to neighbors (non-passing)', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.picked.set([20, 80]);
      await flush();
      const lo = thumb(el, 0);
      const hi = thumb(el, 1);
      expect(lo.getAttribute('aria-valuemin')).toBe('0');
      expect(lo.getAttribute('aria-valuemax')).toBe('80');
      expect(hi.getAttribute('aria-valuemin')).toBe('20');
      expect(hi.getAttribute('aria-valuemax')).toBe('100');
    });

    it('lower thumb cannot move past upper thumb', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.picked.set([78, 80]);
      await flush();
      keyDown(thumb(el, 0), 'ArrowRight');
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([79, 80]);
      keyDown(thumb(el, 0), 'ArrowRight');
      keyDown(thumb(el, 0), 'ArrowRight');
      await flush();
      // 79 → 80 (clamped to upper neighbor), can't go to 81.
      expect(fixture.componentInstance.picked()).toEqual([80, 80]);
    });

    it('minStepsBetweenThumbs forces a gap', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.gap.set(5);
      fixture.componentInstance.picked.set([78, 90]);
      await flush();
      keyDown(thumb(el, 0), 'End');
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([85, 90]);
    });

    it('neighbor clamp is step-rounded — no float tail with a fractional step + gap (#1152)', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.step.set(0.1);
      fixture.componentInstance.gap.set(3);
      fixture.componentInstance.picked.set([0.1, 0.7]);
      await flush();
      fixture.componentInstance.valueCommits.length = 0;

      keyDown(thumb(el, 0), 'End');
      await flush();
      keyUp(thumb(el, 0), 'End');
      await flush();

      expect(fixture.componentInstance.picked()).toEqual([0.4, 0.7]);
      expect(thumb(el, 0).getAttribute('aria-valuenow')).toBe('0.4');
      expect(fixture.componentInstance.valueCommits).toEqual([[0.4, 0.7]]);
    });

    it('Home / End on a multi-thumb clamps to neighbor, not absolute extreme', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.picked.set([20, 80]);
      await flush();
      keyDown(thumb(el, 0), 'End');
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([80, 80]);
      keyDown(thumb(el, 1), 'Home');
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([80, 80]);
    });
  });

  // Pointer-driven value math (drag on thumb, track click, RTL flip,
  // vertical clientY mapping) is covered against real browser layout in
  // `projects/forty-cdk-harness/e2e/slider.e2e.ts`. The Vitest layer can't
  // assert it without stubbing `track.getBoundingClientRect()`, which would
  // tautologically check the math against the stub.

  describe('pointermove layout reads (#1153)', () => {
    const pointer = (type: string, init: PointerEventInit) =>
      new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, ...init });

    const stubRect = (el: HTMLElement, left: number, width: number): DOMRect =>
      ({
        left,
        width,
        right: left + width,
        top: 0,
        bottom: 0,
        height: 0,
        x: left,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;

    it('reads the track rect once at drag start, never per pointermove', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      const trackEl = track(el);
      const rectSpy = vi
        .spyOn(trackEl, 'getBoundingClientRect')
        .mockReturnValue(stubRect(trackEl, 0, 100));

      thumb(el, 0).dispatchEvent(pointer('pointerdown', { clientX: 50, clientY: 0 }));
      expect(rectSpy).toHaveBeenCalledTimes(1);

      document.dispatchEvent(pointer('pointermove', { clientX: 60, clientY: 0 }));
      document.dispatchEvent(pointer('pointermove', { clientX: 70, clientY: 0 }));
      document.dispatchEvent(pointer('pointermove', { clientX: 80, clientY: 0 }));
      await flush();

      expect(rectSpy).toHaveBeenCalledTimes(1);
      expect(fixture.componentInstance.picked()).toEqual([80]);

      document.dispatchEvent(pointer('pointerup', { clientX: 80, clientY: 0 }));
      rectSpy.mockRestore();
    });

    it('keeps updating the value across moves from the cached rect', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      const trackEl = track(el);
      const rectSpy = vi
        .spyOn(trackEl, 'getBoundingClientRect')
        .mockReturnValue(stubRect(trackEl, 0, 100));

      thumb(el, 0).dispatchEvent(pointer('pointerdown', { clientX: 20, clientY: 0 }));
      document.dispatchEvent(pointer('pointermove', { clientX: 20, clientY: 0 }));
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([20]);

      document.dispatchEvent(pointer('pointermove', { clientX: 90, clientY: 0 }));
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([90]);

      document.dispatchEvent(pointer('pointerup', { clientX: 90, clientY: 0 }));
      expect(rectSpy).toHaveBeenCalledTimes(1);
      rectSpy.mockRestore();
    });
  });

  describe('multi-touch pointer filter (#1228)', () => {
    const pointer = (type: string, init: PointerEventInit) =>
      new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, ...init });

    const stubRect = (el: HTMLElement, left: number, width: number): DOMRect =>
      ({
        left,
        width,
        right: left + width,
        top: 0,
        bottom: 0,
        height: 0,
        x: left,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;

    it('a second pointer cannot drive or commit an in-progress drag (inherited #1225 filter)', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      const trackEl = track(el);
      const rectSpy = vi
        .spyOn(trackEl, 'getBoundingClientRect')
        .mockReturnValue(stubRect(trackEl, 0, 100));

      thumb(el, 0).dispatchEvent(pointer('pointerdown', { pointerId: 1, clientX: 50, clientY: 0 }));
      document.dispatchEvent(pointer('pointermove', { pointerId: 1, clientX: 60, clientY: 0 }));
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([60]);

      document.dispatchEvent(pointer('pointermove', { pointerId: 2, clientX: 90, clientY: 0 }));
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([60]);

      fixture.componentInstance.valueCommits.length = 0;
      document.dispatchEvent(pointer('pointerup', { pointerId: 2, clientX: 90, clientY: 0 }));
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([60]);
      expect(fixture.componentInstance.valueCommits).toEqual([]);

      document.dispatchEvent(pointer('pointermove', { pointerId: 1, clientX: 70, clientY: 0 }));
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([70]);
      document.dispatchEvent(pointer('pointerup', { pointerId: 1, clientX: 70, clientY: 0 }));
      await flush();
      expect(fixture.componentInstance.valueCommits).toEqual([[70]]);

      rectSpy.mockRestore();
    });
  });

  describe('CSS variable exposure', () => {
    it('thumb exposes --for-slider-thumb-position as a fraction', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.picked.set([25]);
      await flush();
      const t = thumb(el, 0);
      expect(t.style.getPropertyValue('--for-slider-thumb-position')).toBe('0.25');
    });

    it('range exposes start / end / size as fractions', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.picked.set([20, 80]);
      await flush();
      const r = range(el);
      expect(r.style.getPropertyValue('--for-slider-range-start')).toBe('0.2');
      expect(r.style.getPropertyValue('--for-slider-range-end')).toBe('0.8');
      expect(parseFloat(r.style.getPropertyValue('--for-slider-range-size'))).toBeCloseTo(0.6, 5);
    });

    it('inverted flips the thumb position', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.picked.set([25]);
      fixture.componentInstance.inverted.set(true);
      await flush();
      const t = thumb(el, 0);
      expect(t.style.getPropertyValue('--for-slider-thumb-position')).toBe('0.75');
    });
  });

  describe('valueChange contract', () => {
    it('does not fire on consumer writes via [(value)]', async () => {
      const { fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.valueChanges.length = 0;
      fixture.componentInstance.picked.set([42]);
      await flush();
      expect(fixture.componentInstance.valueChanges.length).toBe(0);
    });

    it('fires only when the directive itself updates the model', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.valueChanges.length = 0;
      keyDown(thumb(el, 0), 'ArrowRight');
      await flush();
      expect(fixture.componentInstance.valueChanges).toEqual([[51]]);
    });
  });

  describe('valueCommit contract', () => {
    // Pointer-driven commit cases (commit-once-per-drag with the final value,
    // pointercancel commit, no commit without movement, track-click commit)
    // live in `slider.e2e.ts` — they require a laid-out track to map
    // clientX/Y back to a value. The keyboard-driven contract below stays
    // in Vitest because no geometry is involved.

    it('fires once on keyup after a navigation key', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.valueCommits.length = 0;
      keyDown(thumb(el, 0), 'ArrowRight');
      await flush();
      expect(fixture.componentInstance.valueCommits).toEqual([]);
      keyUp(thumb(el, 0), 'ArrowRight');
      await flush();
      expect(fixture.componentInstance.valueCommits).toEqual([[51]]);
    });

    it('fires once with the final value after a held arrow key (multiple keydowns, one keyup)', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.valueCommits.length = 0;
      keyDown(thumb(el, 0), 'ArrowRight');
      keyDown(thumb(el, 0), 'ArrowRight');
      keyDown(thumb(el, 0), 'ArrowRight');
      await flush();
      expect(fixture.componentInstance.valueCommits).toEqual([]);
      keyUp(thumb(el, 0), 'ArrowRight');
      await flush();
      expect(fixture.componentInstance.valueCommits).toEqual([[53]]);
    });

    it('does not fire on keyup of a non-navigation key', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.valueCommits.length = 0;
      keyUp(thumb(el, 0), 'Tab');
      keyUp(thumb(el, 0), 'a');
      await flush();
      expect(fixture.componentInstance.valueCommits).toEqual([]);
    });

    it('does not fire when keyboard interaction yields no change (clamped at extreme)', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.picked.set([100]);
      await flush();
      fixture.componentInstance.valueCommits.length = 0;
      keyDown(thumb(el, 0), 'ArrowRight');
      keyUp(thumb(el, 0), 'ArrowRight');
      await flush();
      expect(fixture.componentInstance.valueCommits).toEqual([]);
    });

    it('does not fire on consumer writes via [(value)]', async () => {
      const { fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.valueCommits.length = 0;
      fixture.componentInstance.picked.set([42]);
      await flush();
      expect(fixture.componentInstance.valueCommits).toEqual([]);
    });

    it('does not let a keyup on a different thumb steal another thumb pending commit (#590 F4)', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.picked.set([30, 70]);
      await flush();
      fixture.componentInstance.valueCommits.length = 0;

      // Thumb 0 arms a pending commit (keydown moved it) but is not released.
      keyDown(thumb(el, 0), 'ArrowRight');
      await flush();
      expect(fixture.componentInstance.valueCommits).toEqual([]);

      // A navigation keyup on thumb 1 (which did not arm anything) must not
      // commit thumb 0's pending change.
      keyUp(thumb(el, 1), 'ArrowRight');
      await flush();
      expect(fixture.componentInstance.valueCommits).toEqual([]);

      // Thumb 0's own keyup commits exactly once with the final value.
      keyUp(thumb(el, 0), 'ArrowRight');
      await flush();
      expect(fixture.componentInstance.valueCommits).toEqual([[31, 70]]);
    });
  });

  describe('touched contract', () => {
    it('marks touched when focus leaves the slider region', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      const t = thumb(el, 0);
      const outside = document.createElement('button');
      document.body.appendChild(outside);
      t.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
      await flush();
      expect(fixture.componentInstance.touchedChanges).toContain(true);
      outside.remove();
    });

    it('does not mark touched when focus stays inside the slider', async () => {
      const { el, fixture, flush } = renderHost(SliderHost);
      fixture.componentInstance.picked.set([20, 80]);
      await flush();
      const a = thumb(el, 0);
      const b = thumb(el, 1);
      fixture.componentInstance.touchedChanges.length = 0;
      a.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: b }));
      await flush();
      expect(fixture.componentInstance.touchedChanges).toEqual([]);
    });

    // "drag end marks touched" requires laid-out track geometry to drive a
    // pointer drag through `pointerToValue`, so it lives in `slider.e2e.ts`.
  });

  describe('focus()', () => {
    @Component({
      imports: [ForSlider, ForSliderTrack, ForSliderThumb],
      template: `
        <div forSlider [(value)]="picked" [disabled]="disabled()">
          <span forSliderTrack>
            @for (v of picked(); let i = $index; track i) {
              <span forSliderThumb [index]="i" [attr.data-test-id]="'thumb-' + i"></span>
            }
          </span>
        </div>
      `,
    })
    class FocusHost {
      readonly slider = viewChild.required(ForSlider);
      readonly picked = signal<readonly number[]>([50]);
      readonly disabled = signal(false);
    }

    it('focuses the first thumb', () => {
      const { el, instance } = renderHost(FocusHost);
      instance.slider().focus();
      expect(document.activeElement).toBe(thumb(el, 0));
    });

    it('focuses the first thumb in a multi-thumb slider', async () => {
      const { el, instance, flush } = renderHost(FocusHost);
      instance.picked.set([20, 80]);
      await flush();
      instance.slider().focus();
      expect(document.activeElement).toBe(thumb(el, 0));
    });

    it('is a no-op when the slider is disabled', async () => {
      const { instance, flush } = renderHost(FocusHost);
      instance.disabled.set(true);
      await flush();
      const before = document.activeElement;
      instance.slider().focus();
      expect(document.activeElement).toBe(before);
    });

    describe('Signal Forms focus-on-error', () => {
      @Component({
        imports: [ForSlider, ForSliderTrack, ForSliderThumb, FormField],
        template: `
          <div forSlider [formField]="settings.volume">
            <span forSliderTrack>
              @for (v of settings.volume().value(); let i = $index; track i) {
                <span forSliderThumb [index]="i" [attr.data-test-id]="'thumb-' + i"></span>
              }
            </span>
          </div>
        `,
      })
      class SignalFormsHost {
        readonly model = signal({ volume: [50] as readonly number[] });
        readonly settings = form(this.model);
      }

      it('moves focus onto a thumb, not the group host', async () => {
        const { el, fixture, flush } = renderHost(SignalFormsHost);
        await flush();
        fixture.componentInstance.settings.volume().focusBoundControl();
        expect(document.activeElement).toBe(thumb(el, 0));
      });
    });
  });

  describe('form integration', () => {
    @Component({
      imports: [ForSlider, ForSliderTrack, ForSliderThumb],
      template: `
        <form>
          <div forSlider [(value)]="picked" [name]="name()" [disabled]="disabled()">
            <span forSliderTrack>
              @for (v of picked(); let i = $index; track i) {
                <span forSliderThumb [index]="i" [attr.data-test-id]="'thumb-' + i"></span>
              }
            </span>
          </div>
        </form>
      `,
    })
    class FormHost {
      readonly picked = signal<readonly number[]>([42]);
      readonly name = signal('');
      readonly disabled = signal(false);
    }

    const hidden = (form: HTMLElement) =>
      Array.from(form.querySelectorAll<HTMLInputElement>('input[type="hidden"]'));

    it('emits no hidden inputs while name is empty', () => {
      const { el } = renderHost(FormHost);
      expect(hidden(el).length).toBe(0);
    });

    it('emits one hidden input per value once name is set', async () => {
      const { el, fixture, flush } = renderHost(FormHost);
      fixture.componentInstance.name.set('volume');
      await flush();
      const inputs = hidden(el);
      expect(inputs.length).toBe(1);
      expect(inputs[0]!.name).toBe('volume');
      expect(inputs[0]!.value).toBe('42');
    });

    it('emits N hidden inputs for multi-value', async () => {
      const { el, fixture, flush } = renderHost(FormHost);
      fixture.componentInstance.name.set('range');
      fixture.componentInstance.picked.set([10, 20, 30]);
      await flush();
      const inputs = hidden(el);
      expect(inputs.length).toBe(3);
      expect(inputs.map((i) => i.value)).toEqual(['10', '20', '30']);
    });

    it('disabled sets the disabled attribute on hidden inputs', async () => {
      const { el, fixture, flush } = renderHost(FormHost);
      fixture.componentInstance.name.set('volume');
      fixture.componentInstance.disabled.set(true);
      await flush();
      expect(hidden(el)[0]!.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('disabled fieldset', () => {
    @Component({
      imports: [ForSlider, ForSliderTrack, ForSliderThumb, ForFieldset],
      template: `
        <div forFieldset [disabled]="disabled()">
          <div forSlider [(value)]="picked" name="vol">
            <span forSliderTrack>
              @for (v of picked(); let i = $index; track i) {
                <span forSliderThumb [index]="i" [attr.data-test-id]="'thumb-' + i"></span>
              }
            </span>
          </div>
        </div>
      `,
    })
    class FieldsetHost {
      readonly disabled = signal(false);
      readonly picked = signal<readonly number[]>([42]);
    }

    const hiddenOf = (host: HTMLElement) =>
      host.querySelector<HTMLInputElement>('input[type="hidden"][name="vol"]')!;

    it('does not disable the hidden input while the fieldset is enabled', () => {
      const { el } = renderHost(FieldsetHost);
      expect(hiddenOf(el).hasAttribute('disabled')).toBe(false);
    });

    it('disables the hidden input when the surrounding fieldset is disabled', async () => {
      const { el, fixture, flush } = renderHost(FieldsetHost);
      fixture.componentInstance.disabled.set(true);
      await flush();
      expect(hiddenOf(el).hasAttribute('disabled')).toBe(true);
    });
  });

  describe('zoneless', () => {
    it('reactivity works without Zone.js', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      const fixture = TestBed.createComponent(SliderHost);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      keyDown(thumb(el, 0), 'ArrowRight');
      fixture.detectChanges();
      expect(thumb(el, 0).getAttribute('aria-valuenow')).toBe('51');
    });
  });
});
