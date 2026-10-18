import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, RouterOutlet, type Routes, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from './app.routes';
import { ERROR_CODE_INDEX } from './doc/error-codes';
import { SiteTitleStrategy } from './site-title-strategy';

@Component({ imports: [RouterOutlet], template: '<router-outlet />' })
class Outlet {}

function withoutPages(tree: Routes): Routes {
  return tree.map(({ loadComponent, resolve: _resolve, children, ...route }) => ({
    ...route,
    ...(loadComponent === undefined ? {} : { component: Outlet }),
    ...(children === undefined ? {} : { children: withoutPages(children) }),
  }));
}

function leavesOf(tree: Routes): Routes {
  return tree.flatMap((route) =>
    route.children === undefined ? [route] : leavesOf(route.children),
  );
}

async function titleAt(...urls: string[]): Promise<string> {
  const harness = await RouterTestingHarness.create();
  for (const url of urls) {
    await harness.navigateByUrl(url);
  }
  return TestBed.inject(Title).getTitle();
}

describe('the document title', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter(withoutPages(routes)),
        { provide: TitleStrategy, useClass: SiteTitleStrategy },
      ],
    });
  });

  it('is declared by every page route the site serves', () => {
    const untitled = leavesOf(routes).filter((route) => route.title === undefined);

    expect(leavesOf(routes).length).toBeGreaterThan(40);
    expect(untitled.map((route) => route.path)).toEqual([]);
  });

  it('names the landing page by its heading', async () => {
    expect(await titleAt('/')).toBe('Headless UI primitives for modern Angular · forty-cdk');
  });

  it('names a primitive page by the title its README declares', async () => {
    expect(await titleAt('/otp-input')).toBe('OTP Input · forty-cdk');
  });

  it('names the guide index', async () => {
    expect(await titleAt('/guides')).toBe('Guides · forty-cdk');
  });

  it('names the error code index', async () => {
    expect(await titleAt('/errors')).toBe('Error codes · forty-cdk');
  });

  it('names an error code page by its code', async () => {
    const [entry] = ERROR_CODE_INDEX;

    expect(await titleAt(`/errors/${entry?.code}`)).toBe(`${entry?.code} · forty-cdk`);
  });

  it('names an error code page for a code no version reports as unknown', async () => {
    expect(await titleAt('/errors/FORCDK-NOPE-999')).toBe('Unknown error code · forty-cdk');
  });

  it('names a URL matching no page as not found', async () => {
    expect(await titleAt('/acordion')).toBe('Page not found · forty-cdk');
  });

  it('follows a client navigation from one page to the next', async () => {
    expect(await titleAt('/guides', '/accordion')).toBe('Accordion · forty-cdk');
  });
});
