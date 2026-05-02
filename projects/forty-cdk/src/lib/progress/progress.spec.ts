import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { renderHost } from '../../test-utils/render';
import { ForProgress } from './progress';
import { ForProgressIndicator } from './progress-indicator';

@Component({
  imports: [ForProgress, ForProgressIndicator],
  template: `
    <div
      forProgress
      [value]="value()"
      [max]="max()"
      [getValueLabel]="getLabel()"
      [announceCompletion]="announce()"
    >
      <div forProgressIndicator></div>
    </div>
  `,
})
class ProgressHost {
  readonly value = signal<number | null>(0);
  readonly max = signal(100);
  readonly getLabel = signal<((v: number, m: number) => string) | null>(null);
  readonly announce = signal(false);
}

const flushMicrotasks = () => Promise.resolve();

describe('ForProgress', () => {
  describe('determinate', () => {
    it('exposes role="progressbar" with valuemin / valuemax / valuenow', () => {
      const { fixture, query, flush } = renderHost(ProgressHost);
      fixture.componentInstance.value.set(40);
      flush();

      const el = query<HTMLElement>('[forProgress]')!;
      expect(el.getAttribute('role')).toBe('progressbar');
      expect(el.getAttribute('aria-valuemin')).toBe('0');
      expect(el.getAttribute('aria-valuemax')).toBe('100');
      expect(el.getAttribute('aria-valuenow')).toBe('40');
      expect(el.getAttribute('data-state')).toBe('loading');
    });

    it('clamps values outside [0, max] in the reflected aria-valuenow', () => {
      const { fixture, query, flush } = renderHost(ProgressHost);
      fixture.componentInstance.value.set(150);
      flush();

      const el = query<HTMLElement>('[forProgress]')!;
      expect(el.getAttribute('aria-valuenow')).toBe('100');
      expect(el.getAttribute('data-state')).toBe('complete');

      fixture.componentInstance.value.set(-5);
      flush();
      expect(el.getAttribute('aria-valuenow')).toBe('0');
      expect(el.getAttribute('data-state')).toBe('loading');
    });

    it('reflects state="complete" when value === max', () => {
      const { fixture, query, flush } = renderHost(ProgressHost);
      fixture.componentInstance.value.set(100);
      flush();

      const el = query<HTMLElement>('[forProgress]')!;
      expect(el.getAttribute('data-state')).toBe('complete');
    });
  });

  describe('indeterminate', () => {
    it('omits aria-valuenow and reports state="indeterminate"', () => {
      const { fixture, query, flush } = renderHost(ProgressHost);
      fixture.componentInstance.value.set(null);
      flush();

      const el = query<HTMLElement>('[forProgress]')!;
      expect(el.hasAttribute('aria-valuenow')).toBe(false);
      expect(el.getAttribute('data-state')).toBe('indeterminate');
    });
  });

  describe('getValueLabel', () => {
    it('feeds aria-valuetext with the consumer label', () => {
      const { fixture, query, flush } = renderHost(ProgressHost);
      fixture.componentInstance.getLabel.set((v, m) => `${v} of ${m} MB`);
      fixture.componentInstance.value.set(42);
      fixture.componentInstance.max.set(200);
      flush();

      const el = query<HTMLElement>('[forProgress]')!;
      expect(el.getAttribute('aria-valuetext')).toBe('42 of 200 MB');
    });
  });

  describe('indicator', () => {
    it('reflects data-percentage and a CSS custom property on the indicator', () => {
      const { fixture, query, flush } = renderHost(ProgressHost);
      fixture.componentInstance.value.set(25);
      flush();

      const indicator = query<HTMLElement>('[forProgressIndicator]')!;
      expect(indicator.getAttribute('data-percentage')).toBe('25');
      expect(indicator.getAttribute('data-state')).toBe('loading');
    });

    it('reports null percentage when indeterminate', () => {
      const { fixture, query, flush } = renderHost(ProgressHost);
      fixture.componentInstance.value.set(null);
      flush();

      const indicator = query<HTMLElement>('[forProgressIndicator]')!;
      expect(indicator.hasAttribute('data-percentage')).toBe(false);
      expect(indicator.getAttribute('data-state')).toBe('indeterminate');
    });

    it('throws a prefixed error when used outside [forProgress]', () => {
      @Component({
        imports: [ForProgressIndicator],
        template: `<div forProgressIndicator></div>`,
      })
      class Orphan {}

      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });

      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/progress\] ForProgressIndicator must be used inside a \[forProgress\] element\./,
      );
    });
  });

  describe('announceCompletion', () => {
    beforeEach(() => {
      document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
    });

    it('announces when transitioning to complete', async () => {
      const { fixture, flush } = renderHost(ProgressHost);
      fixture.componentInstance.announce.set(true);
      fixture.componentInstance.value.set(50);
      flush();
      await flushMicrotasks();

      // Initial transition (null → loading) should not announce.
      let region = document.querySelector<HTMLElement>('[aria-live="polite"]');
      expect(region?.textContent ?? '').toBe('');

      fixture.componentInstance.value.set(100);
      flush();
      await flushMicrotasks();

      region = document.querySelector<HTMLElement>('[aria-live="polite"]');
      expect(region!.textContent).toBe('Complete');
    });

    it('uses the consumer label for the announcement when getValueLabel is set', async () => {
      const { fixture, flush } = renderHost(ProgressHost);
      fixture.componentInstance.announce.set(true);
      fixture.componentInstance.getLabel.set((v, m) => `Done: ${v}/${m}`);
      fixture.componentInstance.value.set(50);
      flush();
      await flushMicrotasks();

      fixture.componentInstance.value.set(100);
      flush();
      await flushMicrotasks();

      const region = document.querySelector<HTMLElement>('[aria-live="polite"]');
      expect(region!.textContent).toBe('Done: 100/100');
    });

    it('does nothing when announceCompletion is false', async () => {
      const { fixture, flush } = renderHost(ProgressHost);
      fixture.componentInstance.value.set(50);
      flush();
      fixture.componentInstance.value.set(100);
      flush();
      await flushMicrotasks();

      const region = document.querySelector<HTMLElement>('[aria-live="polite"]');
      expect(region?.textContent ?? '').toBe('');
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects state changes after detectChanges without Zone.js', () => {
      const { fixture, query, flush } = renderHost(ProgressHost);
      fixture.componentInstance.value.set(10);
      flush();

      const el = query<HTMLElement>('[forProgress]')!;
      expect(el.getAttribute('data-state')).toBe('loading');

      fixture.componentInstance.value.set(100);
      flush();
      expect(el.getAttribute('data-state')).toBe('complete');

      fixture.componentInstance.value.set(null);
      flush();
      expect(el.getAttribute('data-state')).toBe('indeterminate');
    });
  });
});
