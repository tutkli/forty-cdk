import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { renderHost } from '../../test-utils/render';
import { ForSeparator } from './separator';

@Component({
  imports: [ForSeparator],
  template: ` <hr forSeparator [orientation]="orientation()" [decorative]="decorative()" /> `,
})
class SeparatorHost {
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
  readonly decorative = signal(false);
}

describe('ForSeparator', () => {
  describe('semantic mode (default)', () => {
    it('exposes role="separator" and omits aria-orientation for horizontal', () => {
      const { query } = renderHost(SeparatorHost);
      const el = query<HTMLElement>('[forSeparator]')!;

      expect(el.getAttribute('role')).toBe('separator');
      expect(el.hasAttribute('aria-orientation')).toBe(false);
      expect(el.getAttribute('data-orientation')).toBe('horizontal');
    });

    it('exposes aria-orientation="vertical" when orientation is vertical', () => {
      const { fixture, query, flush } = renderHost(SeparatorHost);
      fixture.componentInstance.orientation.set('vertical');
      flush();

      const el = query<HTMLElement>('[forSeparator]')!;

      expect(el.getAttribute('role')).toBe('separator');
      expect(el.getAttribute('aria-orientation')).toBe('vertical');
      expect(el.getAttribute('data-orientation')).toBe('vertical');
    });
  });

  describe('decorative mode', () => {
    it('uses role="none" and drops aria-orientation regardless of orientation', () => {
      const { fixture, query, flush } = renderHost(SeparatorHost);
      fixture.componentInstance.decorative.set(true);
      fixture.componentInstance.orientation.set('vertical');
      flush();

      const el = query<HTMLElement>('[forSeparator]')!;

      expect(el.getAttribute('role')).toBe('none');
      expect(el.hasAttribute('aria-orientation')).toBe(false);
      expect(el.getAttribute('data-orientation')).toBe('vertical');
    });
  });

  describe('reactivity', () => {
    it('flips role and aria-orientation when inputs change', () => {
      const { fixture, query, flush } = renderHost(SeparatorHost);
      const el = query<HTMLElement>('[forSeparator]')!;

      expect(el.getAttribute('role')).toBe('separator');

      fixture.componentInstance.decorative.set(true);
      flush();
      expect(el.getAttribute('role')).toBe('none');

      fixture.componentInstance.decorative.set(false);
      fixture.componentInstance.orientation.set('vertical');
      flush();
      expect(el.getAttribute('role')).toBe('separator');
      expect(el.getAttribute('aria-orientation')).toBe('vertical');
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects state changes after detectChanges without Zone.js', () => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });

      @Component({
        imports: [ForSeparator],
        template: `<div forSeparator [orientation]="o()"></div>`,
      })
      class Host {
        readonly o = signal<'horizontal' | 'vertical'>('horizontal');
      }

      const fixture = TestBed.createComponent(Host);
      fixture.detectChanges();

      const el = fixture.nativeElement.querySelector('[forSeparator]') as HTMLElement;
      expect(el.getAttribute('data-orientation')).toBe('horizontal');

      fixture.componentInstance.o.set('vertical');
      fixture.detectChanges();

      expect(el.getAttribute('data-orientation')).toBe('vertical');
      expect(el.getAttribute('aria-orientation')).toBe('vertical');
    });
  });
});
