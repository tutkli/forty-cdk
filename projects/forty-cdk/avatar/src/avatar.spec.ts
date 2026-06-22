import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { renderHost } from '../../src/test-utils/render';
import { ForAvatar } from './avatar';
import { ForAvatarFallback } from './avatar-fallback';
import { ForAvatarImage } from './avatar-image';
import type { ForAvatarStatus } from './avatar-context';

@Component({
  imports: [ForAvatar, ForAvatarImage, ForAvatarFallback],
  template: `
    <span forAvatar #a="forAvatar" [fallbackDelayMs]="delay()">
      <img forAvatarImage [src]="src()" alt="" (loadStatusChanged)="emitted.push($event)" />
      @if (a.shouldShowFallback()) {
        <span forAvatarFallback>fallback</span>
      }
    </span>
  `,
})
class AvatarHost {
  readonly src = signal<string>('');
  readonly delay = signal(0);
  readonly emitted: ForAvatarStatus[] = [];
}

// `ForAvatarImage` reports its initial lifecycle status from an
// `afterNextRender` callback, which re-enters on the next microtask. These
// specs run under `vi.useFakeTimers()`, so the canonical `flush(fixture)`
// (which awaits a `setTimeout(0)` macrotask) would hang — a single microtask
// hop is exactly the boundary we need. Spell it inline (`await Promise.resolve()`)
// so future readers see the WHY.

describe('ForAvatar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('image lifecycle', () => {
    it('starts in idle when src is empty', async () => {
      const { query, flush } = renderHost(AvatarHost);
      flush();
      await Promise.resolve();

      const root = query<HTMLElement>('[forAvatar]')!;
      expect(root.getAttribute('data-status')).toBe('idle');
    });

    it('transitions to loading then loaded on the load event', async () => {
      const { fixture, query, flush } = renderHost(AvatarHost);
      fixture.componentInstance.src.set('https://example.test/me.png');
      flush();
      await Promise.resolve();
      flush();

      const img = query<HTMLImageElement>('img')!;
      const root = query<HTMLElement>('[forAvatar]')!;

      expect(root.getAttribute('data-status')).toBe('loading');

      img.dispatchEvent(new Event('load'));
      flush();

      expect(root.getAttribute('data-status')).toBe('loaded');
      expect(fixture.componentInstance.emitted).toContain('loading');
      expect(fixture.componentInstance.emitted).toContain('loaded');
    });

    it('transitions to error on the error event', async () => {
      const { fixture, query, flush } = renderHost(AvatarHost);
      fixture.componentInstance.src.set('https://example.test/missing.png');
      flush();
      await Promise.resolve();
      flush();

      const img = query<HTMLImageElement>('img')!;
      const root = query<HTMLElement>('[forAvatar]')!;

      img.dispatchEvent(new Event('error'));
      flush();

      expect(root.getAttribute('data-status')).toBe('error');
    });

    it('reports loaded for a cached image with a positive naturalWidth', async () => {
      const { fixture, query, flush } = renderHost(AvatarHost);
      const img = query<HTMLImageElement>('img')!;
      Object.defineProperty(img, 'complete', { configurable: true, get: () => true });
      Object.defineProperty(img, 'naturalWidth', { configurable: true, get: () => 48 });

      fixture.componentInstance.src.set('https://example.test/cached.png');
      flush();
      await Promise.resolve();
      flush();

      const root = query<HTMLElement>('[forAvatar]')!;
      expect(root.getAttribute('data-status')).toBe('loaded');
    });

    it('does not classify a cached zero-intrinsic-size SVG as error (verifies via decode)', async () => {
      const { fixture, query, flush } = renderHost(AvatarHost);
      const img = query<HTMLImageElement>('img')!;
      // Cached, complete, but zero intrinsic size — a valid SVG without
      // explicit width/height looks identical to a broken image by
      // naturalWidth alone. decode() resolves, so it must end up loaded.
      Object.defineProperty(img, 'complete', { configurable: true, get: () => true });
      Object.defineProperty(img, 'naturalWidth', { configurable: true, get: () => 0 });
      img.decode = (): Promise<void> => Promise.resolve();

      fixture.componentInstance.src.set('https://example.test/icon.svg');
      flush();
      await Promise.resolve();
      flush();

      const root = query<HTMLElement>('[forAvatar]')!;
      // Stays loading until decode() settles — never flips to error.
      expect(root.getAttribute('data-status')).toBe('loading');

      await Promise.resolve();
      await Promise.resolve();
      flush();

      expect(root.getAttribute('data-status')).toBe('loaded');
      expect(fixture.componentInstance.emitted).not.toContain('error');
    });

    it('reports error for a cached zero-size image whose decode rejects', async () => {
      const { fixture, query, flush } = renderHost(AvatarHost);
      const img = query<HTMLImageElement>('img')!;
      Object.defineProperty(img, 'complete', { configurable: true, get: () => true });
      Object.defineProperty(img, 'naturalWidth', { configurable: true, get: () => 0 });
      img.decode = (): Promise<void> => Promise.reject(new Error('broken'));

      fixture.componentInstance.src.set('https://example.test/broken.png');
      flush();
      await Promise.resolve();
      flush();

      await Promise.resolve();
      await Promise.resolve();
      flush();

      const root = query<HTMLElement>('[forAvatar]')!;
      expect(root.getAttribute('data-status')).toBe('error');
    });

    it('re-reports the lifecycle for a new cached src even when it resolves to the same status (#590 F2)', async () => {
      const { fixture, query, flush } = renderHost(AvatarHost);
      const img = query<HTMLImageElement>('img')!;
      // Both images are cached + complete with a positive naturalWidth, so each
      // src settles straight to `loaded` with no intervening `loading`. The
      // status-only de-dupe would swallow the second `loaded`; the per-request
      // token must let it through.
      Object.defineProperty(img, 'complete', { configurable: true, get: () => true });
      Object.defineProperty(img, 'naturalWidth', { configurable: true, get: () => 48 });

      fixture.componentInstance.src.set('https://example.test/first.png');
      flush();
      await Promise.resolve();
      flush();
      expect(fixture.componentInstance.emitted).toContain('loaded');
      fixture.componentInstance.emitted.length = 0;

      fixture.componentInstance.src.set('https://example.test/second.png');
      flush();
      await Promise.resolve();
      flush();
      expect(fixture.componentInstance.emitted).toEqual(['loaded']);
    });

    it('ignores a stale load event whose src no longer matches the in-flight request (#590 F2)', async () => {
      const { fixture, query, flush } = renderHost(AvatarHost);
      const img = query<HTMLImageElement>('img')!;

      fixture.componentInstance.src.set('https://example.test/me.png');
      flush();
      await Promise.resolve();
      flush();
      fixture.componentInstance.emitted.length = 0;

      // Simulate a stale request: the resource the host now points at differs
      // from the one the directive last observed. A late `load`/`error` for the
      // superseded resource must not be forwarded. Assert synchronously, before
      // the MutationObserver microtask processes the attribute change and opens
      // a fresh request.
      img.setAttribute('src', 'https://example.test/superseded.png');
      img.dispatchEvent(new Event('load'));
      img.dispatchEvent(new Event('error'));
      expect(fixture.componentInstance.emitted).toEqual([]);
    });

    it('throws a prefixed error when [forAvatarImage] is used without [forAvatar]', () => {
      @Component({
        imports: [ForAvatarImage],
        template: `<img forAvatarImage src="x" alt="" />`,
      })
      class Orphan {}

      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });

      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/avatar\] ForAvatarImage must be used inside a \[forAvatar\] element\./,
      );
    });
  });

  describe('fallback gating', () => {
    it('shows the fallback immediately when delay is 0 and src is empty', () => {
      const { query, flush } = renderHost(AvatarHost);
      flush();

      expect(query<HTMLElement>('[forAvatarFallback]')).not.toBeNull();
    });

    it('honors fallbackDelayMs while loading and skips when load resolves first', async () => {
      const { fixture, query, flush } = renderHost(AvatarHost);
      fixture.componentInstance.delay.set(500);
      fixture.componentInstance.src.set('https://example.test/me.png');
      flush();
      await Promise.resolve();
      flush();

      vi.advanceTimersByTime(100);
      flush();
      expect(query<HTMLElement>('[forAvatarFallback]')).toBeNull();

      query<HTMLImageElement>('img')!.dispatchEvent(new Event('load'));
      flush();
      vi.advanceTimersByTime(500);
      flush();

      expect(query<HTMLElement>('[forAvatarFallback]')).toBeNull();
    });

    it('mounts the fallback once the delay elapses while loading', async () => {
      const { fixture, query, flush } = renderHost(AvatarHost);
      fixture.componentInstance.delay.set(500);
      fixture.componentInstance.src.set('https://example.test/slow.png');
      flush();
      await Promise.resolve();
      flush();

      expect(query<HTMLElement>('[forAvatarFallback]')).toBeNull();

      vi.advanceTimersByTime(500);
      flush();

      expect(query<HTMLElement>('[forAvatarFallback]')!.getAttribute('data-status')).toBe(
        'loading',
      );
    });

    it('shows immediately on error regardless of delayMs', async () => {
      const { fixture, query, flush } = renderHost(AvatarHost);
      fixture.componentInstance.delay.set(1000);
      fixture.componentInstance.src.set('https://example.test/missing.png');
      flush();
      await Promise.resolve();
      flush();

      query<HTMLImageElement>('img')!.dispatchEvent(new Event('error'));
      flush();

      const fallback = query<HTMLElement>('[forAvatarFallback]')!;
      expect(fallback.getAttribute('data-status')).toBe('error');
    });

    it('throws a prefixed error when used outside [forAvatar]', () => {
      @Component({
        imports: [ForAvatarFallback],
        template: `<span forAvatarFallback></span>`,
      })
      class Orphan {}

      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });

      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/avatar\] ForAvatarFallback must be used inside a \[forAvatar\] element\./,
      );
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects status changes after detectChanges without Zone.js', async () => {
      const { fixture, query, flush } = renderHost(AvatarHost);
      const root = query<HTMLElement>('[forAvatar]')!;
      expect(root.getAttribute('data-status')).toBe('idle');

      fixture.componentInstance.src.set('https://example.test/me.png');
      flush();
      await Promise.resolve();
      flush();

      expect(root.getAttribute('data-status')).toBe('loading');

      query<HTMLImageElement>('img')!.dispatchEvent(new Event('load'));
      flush();
      expect(root.getAttribute('data-status')).toBe('loaded');
    });
  });
});
