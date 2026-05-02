import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { renderHost } from '../../test-utils/render';
import { ForAvatar } from './avatar';
import { ForAvatarFallback } from './avatar-fallback';
import { ForAvatarImage } from './avatar-image';
import type { ForAvatarStatus } from './avatar-context';

@Component({
  imports: [ForAvatar, ForAvatarImage, ForAvatarFallback],
  template: `
    <span forAvatar #a="forAvatar" [fallbackDelayMs]="delay()">
      <img forAvatarImage [src]="src()" alt="" (onLoadingStatusChange)="emitted.push($event)" />
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

const flushMicro = () => Promise.resolve();

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
      await flushMicro();

      const root = query<HTMLElement>('[forAvatar]')!;
      expect(root.getAttribute('data-status')).toBe('idle');
    });

    it('transitions to loading then loaded on the load event', async () => {
      const { fixture, query, flush } = renderHost(AvatarHost);
      fixture.componentInstance.src.set('https://example.test/me.png');
      flush();
      await flushMicro();
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
      await flushMicro();
      flush();

      const img = query<HTMLImageElement>('img')!;
      const root = query<HTMLElement>('[forAvatar]')!;

      img.dispatchEvent(new Event('error'));
      flush();

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
      await flushMicro();
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
      await flushMicro();
      flush();

      expect(query<HTMLElement>('[forAvatarFallback]')).toBeNull();

      vi.advanceTimersByTime(500);
      flush();

      expect(query<HTMLElement>('[forAvatarFallback]')).not.toBeNull();
      expect(query<HTMLElement>('[forAvatarFallback]')!.getAttribute('data-status')).toBe(
        'loading',
      );
    });

    it('shows immediately on error regardless of delayMs', async () => {
      const { fixture, query, flush } = renderHost(AvatarHost);
      fixture.componentInstance.delay.set(1000);
      fixture.componentInstance.src.set('https://example.test/missing.png');
      flush();
      await flushMicro();
      flush();

      query<HTMLImageElement>('img')!.dispatchEvent(new Event('error'));
      flush();

      const fallback = query<HTMLElement>('[forAvatarFallback]')!;
      expect(fallback).not.toBeNull();
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
      await flushMicro();
      flush();

      expect(root.getAttribute('data-status')).toBe('loading');

      query<HTMLImageElement>('img')!.dispatchEvent(new Event('load'));
      flush();
      expect(root.getAttribute('data-status')).toBe('loaded');
    });
  });
});
