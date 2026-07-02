import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { renderHost } from '../../src/test-utils';
import { ForBreadcrumbItem } from './breadcrumb-item';
import { ForBreadcrumbSeparator } from './breadcrumb-separator';
import { ForBreadcrumbs } from './breadcrumbs';

@Component({
  imports: [ForBreadcrumbs, ForBreadcrumbItem, ForBreadcrumbSeparator],
  template: `
    <nav forBreadcrumbs [ariaLabel]="ariaLabel()">
      <ol>
        <li><a forBreadcrumbItem href="/">Home</a></li>
        <li forBreadcrumbSeparator>/</li>
        <li>
          <a forBreadcrumbItem href="/library" [current]="false">Library</a>
        </li>
        <li forBreadcrumbSeparator>/</li>
        <li>
          <a forBreadcrumbItem href="/library/data" [current]="dataCurrent()">Data</a>
        </li>
      </ol>
    </nav>
  `,
})
class BreadcrumbsHost {
  readonly ariaLabel = signal<string | null>(null);
  readonly dataCurrent = signal(true);
}

describe('ForBreadcrumbs', () => {
  describe('landmark', () => {
    it('exposes role="navigation" and the default "Breadcrumb" label', () => {
      const { query } = renderHost(BreadcrumbsHost);
      const nav = query<HTMLElement>('[forBreadcrumbs]')!;

      expect(nav.getAttribute('role')).toBe('navigation');
      expect(nav.getAttribute('aria-label')).toBe('Breadcrumb');
    });

    it('lets the consumer override the accessible label', () => {
      const { fixture, query, flush } = renderHost(BreadcrumbsHost);
      fixture.componentInstance.ariaLabel.set('Migas');
      flush();

      const nav = query<HTMLElement>('[forBreadcrumbs]')!;
      expect(nav.getAttribute('aria-label')).toBe('Migas');
    });

    it('falls back to the default label when the override is cleared to empty', () => {
      const { fixture, query, flush } = renderHost(BreadcrumbsHost);
      fixture.componentInstance.ariaLabel.set('');
      flush();

      const nav = query<HTMLElement>('[forBreadcrumbs]')!;
      expect(nav.getAttribute('aria-label')).toBe('Breadcrumb');
    });
  });

  describe('items', () => {
    it('reflects aria-current="page" only on the current item', () => {
      const { fixture } = renderHost(BreadcrumbsHost);
      const items = fixture.nativeElement.querySelectorAll(
        '[forBreadcrumbItem]',
      ) as NodeListOf<HTMLElement>;

      expect(items.length).toBe(3);
      expect(items[0]!.hasAttribute('aria-current')).toBe(false);
      expect(items[1]!.hasAttribute('aria-current')).toBe(false);
      expect(items[2]!.getAttribute('aria-current')).toBe('page');
    });

    it('drops aria-current when the current flag flips off', () => {
      const { fixture, flush } = renderHost(BreadcrumbsHost);
      const current = fixture.nativeElement.querySelectorAll(
        '[forBreadcrumbItem]',
      )[2] as HTMLElement;

      expect(current.getAttribute('aria-current')).toBe('page');

      fixture.componentInstance.dataCurrent.set(false);
      flush();

      expect(current.hasAttribute('aria-current')).toBe(false);
    });

    it('coerces the current input from a bare attribute', () => {
      @Component({
        imports: [ForBreadcrumbItem],
        template: `<a forBreadcrumbItem current href="/now">Now</a>`,
      })
      class BareCurrentHost {}

      const { query } = renderHost(BareCurrentHost);
      expect(query<HTMLElement>('[forBreadcrumbItem]')!.getAttribute('aria-current')).toBe('page');
    });
  });

  describe('separator', () => {
    it('hides the decorative separators from assistive technology', () => {
      const { fixture } = renderHost(BreadcrumbsHost);
      const separators = fixture.nativeElement.querySelectorAll(
        '[forBreadcrumbSeparator]',
      ) as NodeListOf<HTMLElement>;

      expect(separators.length).toBe(2);
      separators.forEach((sep) => {
        expect(sep.getAttribute('aria-hidden')).toBe('true');
      });
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects aria-current and aria-label changes after detectChanges without Zone.js', () => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });

      @Component({
        imports: [ForBreadcrumbs, ForBreadcrumbItem],
        template: `
          <nav forBreadcrumbs [ariaLabel]="label()">
            <a forBreadcrumbItem href="/now" [current]="current()">Now</a>
          </nav>
        `,
      })
      class Host {
        readonly label = signal<string | null>(null);
        readonly current = signal(false);
      }

      const fixture = TestBed.createComponent(Host);
      fixture.detectChanges();

      const nav = fixture.nativeElement.querySelector('[forBreadcrumbs]') as HTMLElement;
      const item = fixture.nativeElement.querySelector('[forBreadcrumbItem]') as HTMLElement;
      expect(nav.getAttribute('aria-label')).toBe('Breadcrumb');
      expect(item.hasAttribute('aria-current')).toBe(false);

      fixture.componentInstance.label.set('Trail');
      fixture.componentInstance.current.set(true);
      fixture.detectChanges();

      expect(nav.getAttribute('aria-label')).toBe('Trail');
      expect(item.getAttribute('aria-current')).toBe('page');
    });
  });
});
