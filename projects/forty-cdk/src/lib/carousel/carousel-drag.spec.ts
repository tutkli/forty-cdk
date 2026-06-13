import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { installObserverPolyfills, renderHost } from '../../test-utils';
import { ForCarousel } from './carousel';
import { ForCarouselDrag } from './carousel-drag';
import { ForCarouselSlide } from './carousel-slide';
import { ForCarouselTrack } from './carousel-track';
import { ForCarouselViewport } from './carousel-viewport';

@Component({
  imports: [ForCarousel, ForCarouselViewport, ForCarouselTrack, ForCarouselSlide, ForCarouselDrag],
  template: `
    <div forCarousel ariaLabel="Test carousel" [orientation]="orientation()">
      <div forCarouselViewport forCarouselDrag [disabled]="dragDisabled()" data-testid="viewport">
        <div forCarouselTrack>
          <div forCarouselSlide>A</div>
          <div forCarouselSlide>B</div>
          <div forCarouselSlide>C</div>
        </div>
      </div>
    </div>
  `,
})
class DragHost {
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
  readonly dragDisabled = signal(false);
}

const viewportEl = (host: HTMLElement) => host.querySelector<HTMLElement>('[forCarouselViewport]')!;

describe('ForCarouselDrag', () => {
  let restoreObservers: () => void;

  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  describe('touch-action reflects orientation', () => {
    it('horizontal carousel: viewport has touch-action pan-y', () => {
      const { el } = renderHost(DragHost);
      expect(viewportEl(el).style.touchAction).toBe('pan-y');
    });

    it('vertical carousel: viewport has touch-action pan-x', async () => {
      const { el, instance, fixture } = renderHost(DragHost);
      instance.orientation.set('vertical');
      fixture.detectChanges();
      await Promise.resolve();
      expect(viewportEl(el).style.touchAction).toBe('pan-x');
    });
  });

  describe('disabled removes touch-action', () => {
    it('dragDisabled=true removes touch-action from viewport', () => {
      const { el, instance, fixture } = renderHost(DragHost);
      instance.dragDisabled.set(true);
      fixture.detectChanges();
      expect(viewportEl(el).style.touchAction).toBe('');
    });
  });

  describe('at rest', () => {
    it('viewport has no data-dragging attribute at rest', () => {
      const { el } = renderHost(DragHost);
      expect(viewportEl(el).hasAttribute('data-dragging')).toBe(false);
    });

    it('viewport has no --for-carousel-drag var at rest', () => {
      const { el } = renderHost(DragHost);
      expect(viewportEl(el).style.getPropertyValue('--for-carousel-drag')).toBe('');
    });
  });

  describe('zoneless reactivity', () => {
    it('touch-action updates without Zone.js when orientation changes', async () => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      const fixture = TestBed.createComponent(DragHost);
      fixture.detectChanges();
      const host = fixture.nativeElement as HTMLElement;
      const vp = viewportEl(host);

      expect(vp.style.touchAction).toBe('pan-y');

      fixture.componentInstance.orientation.set('vertical');
      fixture.detectChanges();
      await Promise.resolve();

      expect(vp.style.touchAction).toBe('pan-x');
    });
  });
});
