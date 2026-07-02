import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { renderHost } from '../../src/test-utils/render';
import { ForMeter } from './meter';
import { ForMeterIndicator } from './meter-indicator';

@Component({
  imports: [ForMeter, ForMeterIndicator],
  template: `
    <div
      forMeter
      [value]="value()"
      [min]="min()"
      [max]="max()"
      [low]="low()"
      [high]="high()"
      [optimum]="optimum()"
      [getValueLabel]="getLabel()"
    >
      <div forMeterIndicator></div>
    </div>
  `,
})
class MeterHost {
  readonly value = signal(0);
  readonly min = signal(0);
  readonly max = signal(100);
  readonly low = signal<number | null>(null);
  readonly high = signal<number | null>(null);
  readonly optimum = signal<number | null>(null);
  readonly getLabel = signal<((v: number, lo: number, hi: number) => string) | null>(null);
}

describe('ForMeter', () => {
  describe('ARIA + reflection', () => {
    it('exposes role="meter" with valuemin / valuemax / valuenow', async () => {
      const { fixture, query, flush } = renderHost(MeterHost);
      fixture.componentInstance.value.set(40);
      await flush();

      const el = query<HTMLElement>('[forMeter]')!;
      expect(el.getAttribute('role')).toBe('meter');
      expect(el.getAttribute('aria-valuemin')).toBe('0');
      expect(el.getAttribute('aria-valuemax')).toBe('100');
      expect(el.getAttribute('aria-valuenow')).toBe('40');
    });

    it('clamps values outside [min, max] in the reflected aria-valuenow', async () => {
      const { fixture, query, flush } = renderHost(MeterHost);
      fixture.componentInstance.value.set(150);
      await flush();

      const el = query<HTMLElement>('[forMeter]')!;
      expect(el.getAttribute('aria-valuenow')).toBe('100');

      fixture.componentInstance.value.set(-5);
      await flush();
      expect(el.getAttribute('aria-valuenow')).toBe('0');
    });

    it('feeds aria-valuetext with the consumer label', async () => {
      const { fixture, query, flush } = renderHost(MeterHost);
      fixture.componentInstance.getLabel.set((v, lo, hi) => `${v} (range ${lo}-${hi})`);
      fixture.componentInstance.value.set(60);
      await flush();

      const el = query<HTMLElement>('[forMeter]')!;
      expect(el.getAttribute('aria-valuetext')).toBe('60 (range 0-100)');
    });
  });

  describe('quality algorithm (HTML5 §<meter>)', () => {
    it('treats whole range as optimum when low/high/optimum are unset', async () => {
      const { fixture, query, flush } = renderHost(MeterHost);
      fixture.componentInstance.value.set(50);
      await flush();
      expect(query<HTMLElement>('[forMeter]')!.getAttribute('data-quality')).toBe('optimum');
    });

    it('optimum in middle: in [low, high] is optimum, outside is sub-optimum', async () => {
      const { fixture, query, flush } = renderHost(MeterHost);
      fixture.componentInstance.low.set(20);
      fixture.componentInstance.high.set(80);
      fixture.componentInstance.optimum.set(50);

      const el = query<HTMLElement>('[forMeter]')!;

      fixture.componentInstance.value.set(50);
      await flush();
      expect(el.getAttribute('data-quality')).toBe('optimum');

      fixture.componentInstance.value.set(10);
      await flush();
      expect(el.getAttribute('data-quality')).toBe('sub-optimum');

      fixture.componentInstance.value.set(95);
      await flush();
      expect(el.getAttribute('data-quality')).toBe('sub-optimum');
    });

    it('optimum below low: below low = optimum, in [low,high] = sub-optimum, above high = even-less-good', async () => {
      const { fixture, query, flush } = renderHost(MeterHost);
      fixture.componentInstance.low.set(40);
      fixture.componentInstance.high.set(80);
      fixture.componentInstance.optimum.set(10);

      const el = query<HTMLElement>('[forMeter]')!;

      fixture.componentInstance.value.set(20);
      await flush();
      expect(el.getAttribute('data-quality')).toBe('optimum');

      fixture.componentInstance.value.set(60);
      await flush();
      expect(el.getAttribute('data-quality')).toBe('sub-optimum');

      fixture.componentInstance.value.set(90);
      await flush();
      expect(el.getAttribute('data-quality')).toBe('even-less-good');
    });

    it('optimum above high: above high = optimum, in [low,high] = sub-optimum, below low = even-less-good', async () => {
      const { fixture, query, flush } = renderHost(MeterHost);
      fixture.componentInstance.low.set(40);
      fixture.componentInstance.high.set(80);
      fixture.componentInstance.optimum.set(95);

      const el = query<HTMLElement>('[forMeter]')!;

      fixture.componentInstance.value.set(90);
      await flush();
      expect(el.getAttribute('data-quality')).toBe('optimum');

      fixture.componentInstance.value.set(60);
      await flush();
      expect(el.getAttribute('data-quality')).toBe('sub-optimum');

      fixture.componentInstance.value.set(10);
      await flush();
      expect(el.getAttribute('data-quality')).toBe('even-less-good');
    });
  });

  describe('indicator', () => {
    it('reflects data-quality and CSS custom property on the indicator', async () => {
      const { fixture, query, flush } = renderHost(MeterHost);
      fixture.componentInstance.value.set(40);
      await flush();

      const indicator = query<HTMLElement>('[forMeterIndicator]')!;
      expect(indicator.getAttribute('data-percentage')).toBe('40');
      expect(indicator.getAttribute('data-quality')).toBe('optimum');
    });

    it('throws a prefixed error when used outside [forMeter]', () => {
      @Component({
        imports: [ForMeterIndicator],
        template: `<div forMeterIndicator></div>`,
      })
      class Orphan {}

      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });

      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/meter\] ForMeterIndicator must be used inside a \[forMeter\] element\./,
      );
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects state changes after detectChanges without Zone.js', async () => {
      const { fixture, query, flush } = renderHost(MeterHost);
      fixture.componentInstance.low.set(20);
      fixture.componentInstance.high.set(80);
      fixture.componentInstance.optimum.set(50);
      fixture.componentInstance.value.set(50);
      await flush();

      const el = query<HTMLElement>('[forMeter]')!;
      expect(el.getAttribute('data-quality')).toBe('optimum');

      fixture.componentInstance.value.set(10);
      await flush();
      expect(el.getAttribute('data-quality')).toBe('sub-optimum');
    });
  });
});
