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
      <img forAvatarImage [src]="src()" alt="" (loadStatusChange)="emitted.push($event)" />
      @if (a.shouldShowFallback()) {
        <span forAvatarFallback>fallback</span>
      }
    </span>
  `,
})
class AvatarHost {
  readonly src = signal<string>('');
  readonly delay = signal<number | string>(0);
  readonly emitted: ForAvatarStatus[] = [];
}

// `ForAvatarImage` reports its lifecycle status from an `afterNextRender`
// callback and a `src` MutationObserver, both of which re-enter on a microtask.
// These specs run under `vi.useFakeTimers()`, where a single awaited `flush()`
// is safe and sufficient: its macrotask hop advances the faked clock by 0ms
// (rather than awaiting a real `setTimeout`, which never fires while timers are
// faked) and drains the pending microtasks, so the status settles in one hop.

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
      await flush();

      const root = query<HTMLElement>('[forAvatar]')!;
      expect(root.getAttribute('data-status')).toBe('idle');
    });

    it('transitions to loading then loaded on the load event', async () => {
      const { fixture, query, flush } = renderHost(AvatarHost);
      fixture.componentInstance.src.set('https://example.test/me.png');
      await flush();

      const img = query<HTMLImageElement>('img')!;
      const root = query<HTMLElement>('[forAvatar]')!;

      expect(root.getAttribute('data-status')).toBe('loading');

      Object.defineProperty(img, 'complete', { configurable: true, get: () => true });
      img.dispatchEvent(new Event('load'));
      await flush();

      expect(root.getAttribute('data-status')).toBe('loaded');
      expect(fixture.componentInstance.emitted).toContain('loading');
      expect(fixture.componentInstance.emitted).toContain('loaded');
    });

    it('transitions to error on the error event', async () => {
      const { fixture, query, flush } = renderHost(AvatarHost);
      fixture.componentInstance.src.set('https://example.test/missing.png');
      await flush();

      const img = query<HTMLImageElement>('img')!;
      const root = query<HTMLElement>('[forAvatar]')!;

      Object.defineProperty(img, 'complete', { configurable: true, get: () => true });
      img.dispatchEvent(new Event('error'));
      await flush();

      expect(root.getAttribute('data-status')).toBe('error');
    });

    it('reports loaded for a cached image with a positive naturalWidth', async () => {
      const { fixture, query, flush } = renderHost(AvatarHost);
      const img = query<HTMLImageElement>('img')!;
      Object.defineProperty(img, 'complete', { configurable: true, get: () => true });
      Object.defineProperty(img, 'naturalWidth', { configurable: true, get: () => 48 });

      fixture.componentInstance.src.set('https://example.test/cached.png');
      await flush();

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
      let settleDecode!: () => void;
      img.decode = (): Promise<void> => new Promise<void>((resolve) => (settleDecode = resolve));

      fixture.componentInstance.src.set('https://example.test/icon.svg');
      await flush();

      const root = query<HTMLElement>('[forAvatar]')!;
      // Stays loading until decode() settles — never flips to error.
      expect(root.getAttribute('data-status')).toBe('loading');

      settleDecode();
      await flush();

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
      await flush();

      const root = query<HTMLElement>('[forAvatar]')!;
      expect(root.getAttribute('data-status')).toBe('error');
    });

    it('does not emit loadStatusChange after the directive is destroyed while decode is pending (#1163)', async () => {
      const { fixture, query, flush } = renderHost(AvatarHost);
      const img = query<HTMLImageElement>('img')!;
      Object.defineProperty(img, 'complete', { configurable: true, get: () => true });
      Object.defineProperty(img, 'naturalWidth', { configurable: true, get: () => 0 });
      let settleDecode!: () => void;
      img.decode = (): Promise<void> => new Promise<void>((resolve) => (settleDecode = resolve));

      fixture.componentInstance.src.set('https://example.test/pending.svg');
      await flush();

      fixture.componentInstance.emitted.length = 0;

      fixture.destroy();
      expect(() => {
        settleDecode();
      }).not.toThrow();
      await Promise.resolve();
      await Promise.resolve();

      expect(fixture.componentInstance.emitted).toEqual([]);
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
      await flush();
      expect(fixture.componentInstance.emitted).toContain('loaded');
      fixture.componentInstance.emitted.length = 0;

      fixture.componentInstance.src.set('https://example.test/second.png');
      await flush();
      expect(fixture.componentInstance.emitted).toEqual(['loaded']);
    });

    it('ignores a stale load event whose src no longer matches the in-flight request (#590 F2)', async () => {
      const { fixture, query, flush } = renderHost(AvatarHost);
      const img = query<HTMLImageElement>('img')!;

      fixture.componentInstance.src.set('https://example.test/me.png');
      await flush();
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

    it('does not mark the second request loaded when a late load from the previous src fires (#1394)', async () => {
      const { fixture, query, flush } = renderHost(AvatarHost);
      const img = query<HTMLImageElement>('img')!;
      const root = query<HTMLElement>('[forAvatar]')!;

      fixture.componentInstance.src.set('https://example.test/first.png');
      await flush();
      expect(root.getAttribute('data-status')).toBe('loading');

      fixture.componentInstance.src.set('https://example.test/second.png');
      await flush();
      expect(root.getAttribute('data-status')).toBe('loading');
      fixture.componentInstance.emitted.length = 0;

      img.dispatchEvent(new Event('load'));
      expect(root.getAttribute('data-status')).toBe('loading');
      expect(fixture.componentInstance.emitted).toEqual([]);

      Object.defineProperty(img, 'complete', { configurable: true, get: () => true });
      img.dispatchEvent(new Event('load'));
      await flush();

      expect(root.getAttribute('data-status')).toBe('loaded');
      expect(fixture.componentInstance.emitted).toEqual(['loaded']);
    });

    it('ignores a late error from the previous src while the current request is still loading (#1394)', async () => {
      const { fixture, query, flush } = renderHost(AvatarHost);
      const img = query<HTMLImageElement>('img')!;
      const root = query<HTMLElement>('[forAvatar]')!;

      fixture.componentInstance.src.set('https://example.test/first.png');
      await flush();
      fixture.componentInstance.src.set('https://example.test/second.png');
      await flush();
      expect(root.getAttribute('data-status')).toBe('loading');
      fixture.componentInstance.emitted.length = 0;

      img.dispatchEvent(new Event('error'));
      expect(root.getAttribute('data-status')).toBe('loading');
      expect(fixture.componentInstance.emitted).toEqual([]);

      Object.defineProperty(img, 'complete', { configurable: true, get: () => true });
      img.dispatchEvent(new Event('error'));
      await flush();

      expect(root.getAttribute('data-status')).toBe('error');
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
        /\[forty-cdk\/avatar\] FORCDK-AVATAR-002: ForAvatarImage must be used inside a \[forAvatar\] element\./,
      );
    });
  });

  describe('fallback gating', () => {
    it('shows the fallback immediately when delay is 0 and src is empty', async () => {
      const { query, flush } = renderHost(AvatarHost);
      await flush();

      expect(query<HTMLElement>('[forAvatarFallback]')).not.toBeNull();
    });

    it('coerces a non-numeric fallbackDelayMs to the default and shows the fallback during idle', async () => {
      const { fixture, query, flush } = renderHost(AvatarHost);
      fixture.componentInstance.delay.set('not-a-number');
      await flush();

      expect(query<HTMLElement>('[forAvatarFallback]')).not.toBeNull();
    });

    it('coerces a non-numeric fallbackDelayMs to the default while loading', async () => {
      const { fixture, query, flush } = renderHost(AvatarHost);
      fixture.componentInstance.delay.set('abc');
      fixture.componentInstance.src.set('https://example.test/slow.png');
      await flush();

      const fallback = query<HTMLElement>('[forAvatarFallback]')!;
      expect(fallback.getAttribute('data-status')).toBe('loading');
    });

    it('coerces Infinity to the default rather than arming an unbounded timer', async () => {
      const { fixture, query, flush } = renderHost(AvatarHost);
      fixture.componentInstance.delay.set(Infinity as unknown as number);
      await flush();

      expect(query<HTMLElement>('[forAvatarFallback]')).not.toBeNull();
    });

    it('honors fallbackDelayMs while loading and skips when load resolves first', async () => {
      const { fixture, query, flush } = renderHost(AvatarHost);
      fixture.componentInstance.delay.set(500);
      fixture.componentInstance.src.set('https://example.test/me.png');
      await flush();

      vi.advanceTimersByTime(100);
      await flush();
      expect(query<HTMLElement>('[forAvatarFallback]')).toBeNull();

      const img = query<HTMLImageElement>('img')!;
      Object.defineProperty(img, 'complete', { configurable: true, get: () => true });
      img.dispatchEvent(new Event('load'));
      await flush();
      vi.advanceTimersByTime(500);
      await flush();

      expect(query<HTMLElement>('[forAvatarFallback]')).toBeNull();
    });

    it('mounts the fallback once the delay elapses while loading', async () => {
      const { fixture, query, flush } = renderHost(AvatarHost);
      fixture.componentInstance.delay.set(500);
      fixture.componentInstance.src.set('https://example.test/slow.png');
      await flush();

      expect(query<HTMLElement>('[forAvatarFallback]')).toBeNull();

      vi.advanceTimersByTime(500);
      await flush();

      expect(query<HTMLElement>('[forAvatarFallback]')!.getAttribute('data-status')).toBe(
        'loading',
      );
    });

    it('shows immediately on error regardless of delayMs', async () => {
      const { fixture, query, flush } = renderHost(AvatarHost);
      fixture.componentInstance.delay.set(1000);
      fixture.componentInstance.src.set('https://example.test/missing.png');
      await flush();

      const img = query<HTMLImageElement>('img')!;
      Object.defineProperty(img, 'complete', { configurable: true, get: () => true });
      img.dispatchEvent(new Event('error'));
      await flush();

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
        /\[forty-cdk\/avatar\] FORCDK-AVATAR-001: ForAvatarFallback must be used inside a \[forAvatar\] element\./,
      );
    });
  });

  describe('reactive updates', () => {
    it('tracks data-status across the image load lifecycle', async () => {
      const { fixture, query, flush } = renderHost(AvatarHost);
      const root = query<HTMLElement>('[forAvatar]')!;
      expect(root.getAttribute('data-status')).toBe('idle');

      fixture.componentInstance.src.set('https://example.test/me.png');
      await flush();

      expect(root.getAttribute('data-status')).toBe('loading');

      const img = query<HTMLImageElement>('img')!;
      Object.defineProperty(img, 'complete', { configurable: true, get: () => true });
      img.dispatchEvent(new Event('load'));
      await flush();
      expect(root.getAttribute('data-status')).toBe('loaded');
    });
  });
});
