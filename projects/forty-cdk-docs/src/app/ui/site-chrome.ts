import { DOCUMENT, isPlatformBrowser, LocationStrategy } from '@angular/common';
import {
  computed,
  effect,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
  type Signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, fromEvent, map } from 'rxjs';

import { sectionForUrl } from './site-sections';
import {
  darkMediaQuery,
  readStoredTheme,
  resolveTheme,
  type Theme,
  writeStoredTheme,
} from './theme-preference';

/**
 * The id of the documentation's `<main>`, which the skip link focuses. It
 * carries `tabindex="-1"` so it can take focus without becoming a tab stop.
 */
export const CONTENT_ID = 'main-content';

function systemDark(): Signal<boolean> {
  const query = darkMediaQuery();
  if (query === undefined) {
    return signal(false);
  }
  return toSignal(
    fromEvent<MediaQueryListEvent>(query, 'change').pipe(map((event) => event.matches)),
    { initialValue: query.matches },
  );
}

function appleKeyboard(document: Document): boolean {
  return /mac|iphone|ipad|ipod/i.test(document.defaultView?.navigator.platform ?? '');
}

@Injectable({ providedIn: 'root' })
export class SiteChrome {
  readonly #document = inject(DOCUMENT);
  readonly #router = inject(Router);
  readonly #location = inject(LocationStrategy);
  readonly #browser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly #chosen = signal<Theme | null>(readStoredTheme());
  readonly #systemDark = systemDark();

  /**
   * The theme the site paints with: the visitor's explicit choice where they
   * made one, and the system preference — live, so a scheduled switch lands
   * without a reload — where they did not.
   */
  readonly theme = computed(() => resolveTheme(this.#chosen(), this.#systemDark()));

  readonly navOpen = signal(false);
  readonly paletteOpen = signal(false);

  readonly searchShortcut = this.#browser && appleKeyboard(this.#document) ? '⌘K' : 'Ctrl K';

  readonly #url = toSignal(
    this.#router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.#router.url },
  );

  readonly section = computed(() => sectionForUrl(this.#url()));

  /**
   * Where the skip link points: the content of the current route, so a copied
   * or middle-clicked link lands there rather than on the base href.
   */
  readonly contentHref = computed(() => {
    const path = this.#url().split(/[?#]/)[0] ?? '';
    return this.#location.prepareExternalUrl(`${path}#${CONTENT_ID}`);
  });

  readonly dark = computed(() => this.theme() === 'dark');
  readonly themeLabel = computed(() =>
    this.dark() ? 'Switch to light theme' : 'Switch to dark theme',
  );

  constructor() {
    if (this.#browser) {
      effect(() => {
        this.#document.documentElement.setAttribute('data-theme', this.theme());
      });
    }
  }

  /**
   * Records the visitor's choice, which is the only thing ever persisted — a
   * theme that came from nothing but the system preference stays unstored, so
   * the site keeps following it.
   */
  setDark(dark: boolean): void {
    const theme: Theme = dark ? 'dark' : 'light';
    writeStoredTheme(theme);
    this.#chosen.set(theme);
  }

  openPalette(event?: Event): void {
    event?.preventDefault();
    this.paletteOpen.set(true);
  }

  /**
   * Activates the skip link in place, without the history entry that following
   * its fragment would add.
   */
  skipToContent(event: Event): void {
    const content = this.#document.getElementById(CONTENT_ID);
    if (content !== null) {
      event.preventDefault();
      content.focus();
    }
  }
}
