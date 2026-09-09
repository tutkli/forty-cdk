import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  inject,
  PLATFORM_ID,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { ForDrawer, ForDrawerBackdrop, ForDrawerWrapper } from 'forty-cdk/drawer';
import { ForToastViewport } from 'forty-cdk/toast';
import { filter } from 'rxjs';

import { AppNav } from './ui/app-nav';
import { CommandPalette } from './ui/command-palette';
import { SectionSwitcher } from './ui/section-switcher';
import { SiteChrome } from './ui/site-chrome';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    ForDrawer,
    ForDrawerBackdrop,
    ForDrawerWrapper,
    ForToastViewport,
    AppNav,
    CommandPalette,
    SectionSwitcher,
  ],
  host: {
    '(document:keydown.meta.k)': 'chrome.openPalette($event)',
    '(document:keydown.control.k)': 'chrome.openPalette($event)',
  },
  template: `
    <div class="app-shell" forDrawerWrapper #shell>
      <router-outlet />
    </div>

    @if (chrome.navOpen()) {
      <div
        forDrawer
        class="pg-nav-drawer"
        side="left"
        ariaLabel="Site navigation"
        (dismiss)="chrome.navOpen.set(false)"
        animate.enter="pg-drawer-in-left"
        animate.leave="pg-drawer-out-left"
      >
        <div
          forDrawerBackdrop
          class="pg-drawer-backdrop"
          animate.enter="pg-backdrop-in"
          animate.leave="pg-backdrop-out"
        ></div>
        <section-switcher class="drawer-sections" />
        <app-nav (navigate)="chrome.navOpen.set(false)" />
      </div>
    }

    <command-palette [(open)]="chrome.paletteOpen" />

    <for-toast-viewport class="pg-toast-viewport" data-position="bottom-right" />
  `,
  styles: `
    :host {
      display: block;
    }

    /*
     * The shell carries [forDrawerWrapper], so [scaleBackground] drawers
     * transform it. transform breaks position: fixed (fixed children anchor
     * to the transformed ancestor and reposition against scroll), so each
     * layout's chrome is normal-flow with position: sticky — header and
     * sidebar scale uniformly with the shell instead of escaping it. The shell
     * is also the scroll container (see styles.css for why + the
     * BodyScrollLock bridge), and it stays unpainted so a layout decides its
     * own ground: paper on the landing, a sheet in the documentation.
     */
    .app-shell {
      height: 100dvh;
      overflow-y: auto;
      scrollbar-gutter: stable;
      display: flex;
      flex-direction: column;
    }

    router-outlet {
      display: none;
    }

    .drawer-sections {
      margin: 0 0.75rem 0.9rem;
      padding-bottom: 0.9rem;
      border-bottom: 1px solid var(--pg-border);
    }
  `,
})
export class App {
  readonly #router = inject(Router);
  readonly #platformId = inject(PLATFORM_ID);

  protected readonly chrome = inject(SiteChrome);
  protected readonly shell = viewChild<ElementRef<HTMLElement>>('shell');

  constructor() {
    this.#router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        if (isPlatformBrowser(this.#platformId) && !event.urlAfterRedirects.includes('#')) {
          this.shell()?.nativeElement.scrollTo({ top: 0, left: 0 });
        }
      });
  }
}
