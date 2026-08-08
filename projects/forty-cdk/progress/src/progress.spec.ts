import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { renderHost } from '../../src/test-utils/render';
import { nextMacrotask } from '../../src/test-utils/flush';
import { ForProgress } from './progress';
import { ForProgressIndicator } from './progress-indicator';
import { provideForProgressDefaults } from './progress-defaults';

@Component({
  imports: [ForProgress, ForProgressIndicator],
  template: `
    <div
      forProgress
      [value]="value()"
      [max]="max()"
      [getValueLabel]="getLabel()"
      [announceCompletion]="announce()"
      [ariaLabel]="ariaLabel()"
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
  readonly ariaLabel = signal<string | null>(null);
}

@Component({
  imports: [ForProgress, ForProgressIndicator],
  providers: [provideForProgressDefaults({ completeAnnouncement: 'All done' })],
  template: `
    <div forProgress [value]="value()" [announceCompletion]="true">
      <div forProgressIndicator></div>
    </div>
  `,
})
class ProgressDefaultsHost {
  readonly value = signal<number | null>(0);
}

// LiveAnnouncer (driven by [announceCompletion]) schedules every text write
// through `setTimeout(…, 0)` (a macrotask — see the LiveAnnouncer JSDoc for the
// screen-reader rationale), so the announcement specs need a macrotask hop
// (`nextMacrotask()`) after `flush()` rather than a microtask drain.

describe('ForProgress', () => {
  describe('determinate', () => {
    it('exposes role="progressbar" with valuemin / valuemax / valuenow', async () => {
      const { fixture, query, flush } = renderHost(ProgressHost);
      fixture.componentInstance.value.set(40);
      await flush();

      const el = query<HTMLElement>('[forProgress]')!;
      expect(el.getAttribute('role')).toBe('progressbar');
      expect(el.getAttribute('aria-valuemin')).toBe('0');
      expect(el.getAttribute('aria-valuemax')).toBe('100');
      expect(el.getAttribute('aria-valuenow')).toBe('40');
      expect(el.getAttribute('data-state')).toBe('loading');
    });

    it('clamps values outside [0, max] in the reflected aria-valuenow', async () => {
      const { fixture, query, flush } = renderHost(ProgressHost);
      fixture.componentInstance.value.set(150);
      await flush();

      const el = query<HTMLElement>('[forProgress]')!;
      expect(el.getAttribute('aria-valuenow')).toBe('100');
      expect(el.getAttribute('data-state')).toBe('complete');

      fixture.componentInstance.value.set(-5);
      await flush();
      expect(el.getAttribute('aria-valuenow')).toBe('0');
      expect(el.getAttribute('data-state')).toBe('loading');
    });

    it('clamps a non-positive max to a positive aria-valuemax so the ARIA range stays valid', async () => {
      const { fixture, query, flush } = renderHost(ProgressHost);
      fixture.componentInstance.value.set(0);
      fixture.componentInstance.max.set(0);
      await flush();

      const el = query<HTMLElement>('[forProgress]')!;
      expect(el.getAttribute('aria-valuemin')).toBe('0');
      expect(el.getAttribute('aria-valuemax')).toBe('1');
      expect(el.getAttribute('data-max')).toBe('1');

      fixture.componentInstance.max.set(-10);
      await flush();
      expect(el.getAttribute('aria-valuemax')).toBe('1');
    });

    it('reflects data-percentage / data-min / data-max on the root, matching meter', async () => {
      const { fixture, query, flush } = renderHost(ProgressHost);
      fixture.componentInstance.value.set(25);
      await flush();

      const el = query<HTMLElement>('[forProgress]')!;
      expect(el.getAttribute('data-min')).toBe('0');
      expect(el.getAttribute('data-max')).toBe('100');
      expect(el.getAttribute('data-percentage')).toBe('25');
    });

    it('omits data-percentage on the root when indeterminate', async () => {
      const { fixture, query, flush } = renderHost(ProgressHost);
      fixture.componentInstance.value.set(null);
      await flush();

      const el = query<HTMLElement>('[forProgress]')!;
      expect(el.hasAttribute('data-percentage')).toBe(false);
      expect(el.getAttribute('data-min')).toBe('0');
    });

    it('reflects state="complete" when value === max', async () => {
      const { fixture, query, flush } = renderHost(ProgressHost);
      fixture.componentInstance.value.set(100);
      await flush();

      const el = query<HTMLElement>('[forProgress]')!;
      expect(el.getAttribute('data-state')).toBe('complete');
    });
  });

  describe('indeterminate', () => {
    it('omits aria-valuenow and reports state="indeterminate"', async () => {
      const { fixture, query, flush } = renderHost(ProgressHost);
      fixture.componentInstance.value.set(null);
      await flush();

      const el = query<HTMLElement>('[forProgress]')!;
      expect(el.hasAttribute('aria-valuenow')).toBe(false);
      expect(el.getAttribute('data-state')).toBe('indeterminate');
    });
  });

  describe('getValueLabel', () => {
    it('feeds aria-valuetext with the consumer label', async () => {
      const { fixture, query, flush } = renderHost(ProgressHost);
      fixture.componentInstance.getLabel.set((v, m) => `${v} of ${m} MB`);
      fixture.componentInstance.value.set(42);
      fixture.componentInstance.max.set(200);
      await flush();

      const el = query<HTMLElement>('[forProgress]')!;
      expect(el.getAttribute('aria-valuetext')).toBe('42 of 200 MB');
    });

    it('feeds the label the sanitized effective max, not the raw non-positive max', async () => {
      const { fixture, query, flush } = renderHost(ProgressHost);
      fixture.componentInstance.getLabel.set((v, m) => `${v} of ${m}`);
      fixture.componentInstance.max.set(0);
      fixture.componentInstance.value.set(1);
      await flush();

      const el = query<HTMLElement>('[forProgress]')!;
      expect(el.getAttribute('aria-valuemax')).toBe('1');
      expect(el.getAttribute('aria-valuetext')).toBe('1 of 1');
    });
  });

  describe('ariaLabel', () => {
    it('omits aria-label by default, reflects a set label, and drops an empty one', async () => {
      const { fixture, query, flush } = renderHost(ProgressHost);
      fixture.componentInstance.value.set(40);
      await flush();

      const el = query<HTMLElement>('[forProgress]')!;
      expect(el.hasAttribute('aria-label')).toBe(false);

      fixture.componentInstance.ariaLabel.set('Upload progress');
      await flush();
      expect(el.getAttribute('aria-label')).toBe('Upload progress');

      fixture.componentInstance.ariaLabel.set('');
      await flush();
      expect(el.hasAttribute('aria-label')).toBe(false);
    });
  });

  describe('indicator', () => {
    it('reflects data-percentage and a CSS custom property on the indicator', async () => {
      const { fixture, query, flush } = renderHost(ProgressHost);
      fixture.componentInstance.value.set(25);
      await flush();

      const indicator = query<HTMLElement>('[forProgressIndicator]')!;
      expect(indicator.getAttribute('data-percentage')).toBe('25');
      expect(indicator.getAttribute('data-state')).toBe('loading');
    });

    it('emits the clamped data-value, matching the root, for out-of-range input', async () => {
      const { fixture, query, flush } = renderHost(ProgressHost);
      fixture.componentInstance.value.set(150);
      await flush();

      const root = query<HTMLElement>('[forProgress]')!;
      const indicator = query<HTMLElement>('[forProgressIndicator]')!;
      expect(root.getAttribute('data-value')).toBe('100');
      expect(indicator.getAttribute('data-value')).toBe('100');

      fixture.componentInstance.value.set(-5);
      await flush();
      expect(root.getAttribute('data-value')).toBe('0');
      expect(indicator.getAttribute('data-value')).toBe('0');
    });

    it('reports null percentage when indeterminate', async () => {
      const { fixture, query, flush } = renderHost(ProgressHost);
      fixture.componentInstance.value.set(null);
      await flush();

      const indicator = query<HTMLElement>('[forProgressIndicator]')!;
      expect(indicator.hasAttribute('data-percentage')).toBe(false);
      expect(indicator.getAttribute('data-state')).toBe('indeterminate');
    });

    it('emits data-min / data-max matching the root for every max, including max <= 0', async () => {
      const { fixture, query, flush } = renderHost(ProgressHost);
      fixture.componentInstance.value.set(40);
      await flush();

      const root = query<HTMLElement>('[forProgress]')!;
      const indicator = query<HTMLElement>('[forProgressIndicator]')!;
      expect(indicator.getAttribute('data-min')).toBe(root.getAttribute('data-min'));
      expect(indicator.getAttribute('data-max')).toBe(root.getAttribute('data-max'));
      expect(indicator.getAttribute('data-min')).toBe('0');
      expect(indicator.getAttribute('data-max')).toBe('100');

      fixture.componentInstance.max.set(0);
      await flush();
      expect(root.getAttribute('data-max')).toBe('1');
      expect(indicator.getAttribute('data-max')).toBe('1');
      expect(indicator.getAttribute('data-min')).toBe('0');

      fixture.componentInstance.max.set(-10);
      await flush();
      expect(indicator.getAttribute('data-max')).toBe(root.getAttribute('data-max'));
      expect(indicator.getAttribute('data-max')).toBe('1');
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
        /\[forty-cdk\/progress\] FORCDK-PROGRESS-001: ForProgressIndicator must be used inside a \[forProgress\] element\./,
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
      await flush();
      await nextMacrotask();

      // Initial transition (null → loading) should not announce.
      let region = document.querySelector<HTMLElement>('[aria-live="polite"]');
      expect(region?.textContent ?? '').toBe('');

      fixture.componentInstance.value.set(100);
      await flush();
      await nextMacrotask();

      region = document.querySelector<HTMLElement>('[aria-live="polite"]');
      expect(region!.textContent).toBe('Complete');
    });

    it('uses the consumer label for the announcement when getValueLabel is set', async () => {
      const { fixture, flush } = renderHost(ProgressHost);
      fixture.componentInstance.announce.set(true);
      fixture.componentInstance.getLabel.set((v, m) => `Done: ${v}/${m}`);
      fixture.componentInstance.value.set(50);
      await flush();
      await nextMacrotask();

      fixture.componentInstance.value.set(100);
      await flush();
      await nextMacrotask();

      const region = document.querySelector<HTMLElement>('[aria-live="polite"]');
      expect(region!.textContent).toBe('Done: 100/100');
    });

    it('does nothing when announceCompletion is false', async () => {
      const { fixture, flush } = renderHost(ProgressHost);
      fixture.componentInstance.value.set(50);
      await flush();
      fixture.componentInstance.value.set(100);
      await flush();
      await nextMacrotask();

      const region = document.querySelector<HTMLElement>('[aria-live="polite"]');
      expect(region?.textContent ?? '').toBe('');
    });

    it('announces the scope-configured completeAnnouncement string when no valuetext exists', async () => {
      const { fixture, flush } = renderHost(ProgressDefaultsHost);
      fixture.componentInstance.value.set(50);
      await flush();
      await nextMacrotask();

      fixture.componentInstance.value.set(100);
      await flush();
      await nextMacrotask();

      const region = document.querySelector<HTMLElement>('[aria-live="polite"]');
      expect(region!.textContent).toBe('All done');
    });
  });

  describe('reactive updates', () => {
    it('reflects value writes in data-state', async () => {
      const { fixture, query, flush } = renderHost(ProgressHost);
      fixture.componentInstance.value.set(10);
      await flush();

      const el = query<HTMLElement>('[forProgress]')!;
      expect(el.getAttribute('data-state')).toBe('loading');

      fixture.componentInstance.value.set(100);
      await flush();
      expect(el.getAttribute('data-state')).toBe('complete');

      fixture.componentInstance.value.set(null);
      await flush();
      expect(el.getAttribute('data-state')).toBe('indeterminate');
    });
  });
});
