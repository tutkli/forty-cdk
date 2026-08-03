import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { renderHost } from '../../src/test-utils';
import { ForBreadcrumbItem } from './breadcrumb-item';
import { ForBreadcrumbSeparator } from './breadcrumb-separator';
import { provideForBreadcrumbsDefaults } from './breadcrumbs-defaults';
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
      @Component({
        imports: [ForBreadcrumbs, ForBreadcrumbItem],
        template: `<nav forBreadcrumbs><a forBreadcrumbItem href="/">Home</a></nav>`,
      })
      class BareHost {}

      const { query } = renderHost(BareHost);
      const nav = query<HTMLElement>('[forBreadcrumbs]')!;

      expect(nav.getAttribute('role')).toBe('navigation');
      expect(nav.getAttribute('aria-label')).toBe('Breadcrumb');
    });

    it('localizes the default label via provideForBreadcrumbsDefaults', () => {
      @Component({
        imports: [ForBreadcrumbs, ForBreadcrumbItem],
        providers: [provideForBreadcrumbsDefaults({ label: 'Ruta' })],
        template: `<nav forBreadcrumbs><a forBreadcrumbItem href="/">Home</a></nav>`,
      })
      class LocalizedHost {}

      const { query } = renderHost(LocalizedHost);
      expect(query<HTMLElement>('[forBreadcrumbs]')!.getAttribute('aria-label')).toBe('Ruta');
    });

    it('lets a per-instance [ariaLabel] win over the scope default', () => {
      @Component({
        imports: [ForBreadcrumbs, ForBreadcrumbItem],
        providers: [provideForBreadcrumbsDefaults({ label: 'Ruta' })],
        template: `
          <nav forBreadcrumbs ariaLabel="Site sections">
            <a forBreadcrumbItem href="/">Home</a>
          </nav>
        `,
      })
      class OverrideHost {}

      const { query } = renderHost(OverrideHost);
      expect(query<HTMLElement>('[forBreadcrumbs]')!.getAttribute('aria-label')).toBe(
        'Site sections',
      );
    });

    it('drops the attribute when [ariaLabel] is null', () => {
      @Component({
        imports: [ForBreadcrumbs, ForBreadcrumbItem],
        template: `
          <nav forBreadcrumbs [ariaLabel]="null"><a forBreadcrumbItem href="/">Home</a></nav>
        `,
      })
      class NullLabelHost {}

      const { query } = renderHost(NullLabelHost);
      expect(query<HTMLElement>('[forBreadcrumbs]')!.hasAttribute('aria-label')).toBe(false);
    });

    it('lets the consumer override the accessible label reactively', async () => {
      const { fixture, query, flush } = renderHost(BreadcrumbsHost);
      fixture.componentInstance.ariaLabel.set('Migas');
      await flush();

      const nav = query<HTMLElement>('[forBreadcrumbs]')!;
      expect(nav.getAttribute('aria-label')).toBe('Migas');
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

    it('drops aria-current when the current flag flips off', async () => {
      const { fixture, flush } = renderHost(BreadcrumbsHost);
      const current = fixture.nativeElement.querySelectorAll(
        '[forBreadcrumbItem]',
      )[2] as HTMLElement;

      expect(current.getAttribute('aria-current')).toBe('page');

      fixture.componentInstance.dataCurrent.set(false);
      await flush();

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

  describe('reactive updates', () => {
    it('reflects aria-current and aria-label changes', () => {
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
        readonly label = signal('Breadcrumb');
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
