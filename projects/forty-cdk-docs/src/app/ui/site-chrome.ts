import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

import { sectionForUrl } from './site-sections';

type Theme = 'light' | 'dark';

const THEME_KEY = 'forty-cdk-docs-theme';

function readInitialTheme(): Theme {
  const stored = globalThis.localStorage?.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

@Injectable({ providedIn: 'root' })
export class SiteChrome {
  readonly #document = inject(DOCUMENT);
  readonly #router = inject(Router);

  readonly theme = signal<Theme>(readInitialTheme());
  readonly navOpen = signal(false);
  readonly paletteOpen = signal(false);

  readonly #url = toSignal(
    this.#router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.#router.url },
  );

  readonly section = computed(() => sectionForUrl(this.#url()));

  readonly dark = computed(() => this.theme() === 'dark');
  readonly themeLabel = computed(() =>
    this.dark() ? 'Switch to light theme' : 'Switch to dark theme',
  );

  constructor() {
    effect(() => {
      const theme = this.theme();
      this.#document.documentElement.setAttribute('data-theme', theme);
      globalThis.localStorage?.setItem(THEME_KEY, theme);
    });
  }

  setDark(dark: boolean): void {
    this.theme.set(dark ? 'dark' : 'light');
  }

  openPalette(event?: Event): void {
    event?.preventDefault();
    this.paletteOpen.set(true);
  }
}
