import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  type ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { ForDrawer, ForDrawerBackdrop, ForDrawerWrapper } from 'forty-cdk/drawer';
import { ForSwitch } from 'forty-cdk/switch';
import { ForToastViewport } from 'forty-cdk/toast';
import { filter } from 'rxjs';

import { AppNav } from './ui/app-nav';
import { CommandPalette } from './ui/command-palette';
import { GITHUB_REPO } from './ui/github';
import { Icon } from './ui/icon';
import { ScrollPane } from './ui/scroll-pane';

type Theme = 'light' | 'dark';

const THEME_KEY = 'forty-cdk-playground-theme';

function readInitialTheme(): Theme {
  const stored = globalThis.localStorage?.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    ForSwitch,
    ForDrawer,
    ForDrawerBackdrop,
    ForDrawerWrapper,
    ForToastViewport,
    AppNav,
    ScrollPane,
    CommandPalette,
    Icon,
  ],
  host: {
    '(document:keydown.meta.k)': 'openPalette($event)',
    '(document:keydown.control.k)': 'openPalette($event)',
  },
  template: `
    <div class="app-shell" forDrawerWrapper #shell>
      <header class="topbar">
        <button
          type="button"
          class="icon-btn menu-btn"
          (click)="navOpen.set(true)"
          aria-label="Open navigation"
        >
          <app-icon name="bars-3" />
        </button>

        <a class="brand" [routerLink]="['/']">
          <span class="brand-name">forty-cdk</span>
          <span class="brand-tag">docs</span>
        </a>

        <div class="topbar-actions">
          <button type="button" class="search-btn" (click)="openPalette()" aria-label="Search">
            <app-icon name="magnifying-glass" />
            <span class="search-btn-text">Search</span>
            <kbd class="search-btn-kbd">⌘K</kbd>
          </button>
          <a
            class="icon-btn"
            [href]="repo"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="GitHub repository"
          >
            <app-icon name="github" />
          </a>
          <button
            forSwitch
            type="button"
            class="icon-btn theme"
            [checked]="dark()"
            (checkedChange)="setDark($event)"
            [attr.aria-label]="themeLabel()"
          >
            <app-icon [name]="dark() ? 'sun' : 'moon'" />
          </button>
        </div>
      </header>

      <div class="shell-body">
        <aside class="sidebar">
          <scroll-pane>
            <app-nav />
          </scroll-pane>
        </aside>

        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>

    @if (navOpen()) {
      <div
        forDrawer
        class="pg-nav-drawer"
        side="left"
        ariaLabel="Primitives navigation"
        (dismiss)="navOpen.set(false)"
        animate.enter="pg-drawer-in-left"
        animate.leave="pg-drawer-out-left"
      >
        <div
          forDrawerBackdrop
          class="pg-drawer-backdrop"
          animate.enter="pg-backdrop-in"
          animate.leave="pg-backdrop-out"
        ></div>
        <app-nav (navigate)="navOpen.set(false)" />
      </div>
    }

    <command-palette [(open)]="paletteOpen" />

    <for-toast-viewport class="pg-toast-viewport" data-position="bottom-right" />
  `,
  styles: `
    :host {
      display: block;
    }

    /*
     * The shell carries [forDrawerWrapper], so [scaleBackground] drawers
     * transform it. transform breaks position: fixed (fixed children anchor
     * to the transformed ancestor and reposition against scroll), so the
     * layout is normal-flow with position: sticky chrome — header and sidebar
     * scale uniformly with the shell instead of escaping it. The shell is also
     * the scroll container (see styles.css for why + the BodyScrollLock bridge).
     */
    .app-shell {
      height: 100dvh;
      overflow-y: auto;
      scrollbar-gutter: stable;
      display: flex;
      flex-direction: column;
    }

    .topbar {
      position: sticky;
      top: 0;
      z-index: 40;
      display: flex;
      align-items: center;
      gap: 1rem;
      height: var(--pg-header-height);
      padding: 0 1.25rem;
      background: color-mix(in srgb, var(--pg-surface) 88%, transparent);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--pg-border);
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      text-decoration: none;
      color: var(--pg-text);
    }

    .brand-name {
      font-weight: 800;
      letter-spacing: -0.01em;
      white-space: nowrap;
    }

    .brand-tag {
      font-size: 0.66rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--pg-secondary);
      background: color-mix(in srgb, var(--pg-secondary) 16%, transparent);
      padding: 0.1rem 0.45rem;
      border-radius: 999px;
    }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-left: auto;
    }

    .search-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      height: 34px;
      padding: 0 0.7rem;
      font: inherit;
      font-size: 0.85rem;
      color: var(--pg-text-muted);
      background: var(--pg-surface-2);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      cursor: pointer;
    }

    .search-btn:hover {
      background: var(--pg-surface);
      border-color: var(--pg-border-strong);
    }

    .search-btn app-icon {
      width: 16px;
      height: 16px;
    }

    .search-btn-kbd {
      font-family: var(--pg-font-mono);
      font-size: 0.7rem;
      padding: 0.1rem 0.35rem;
      border-radius: 6px;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border-strong);
      color: var(--pg-text-muted);
    }

    .icon-btn {
      flex: none;
      width: 34px;
      height: 34px;
      display: grid;
      place-items: center;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      cursor: pointer;
    }

    .icon-btn app-icon {
      width: 18px;
      height: 18px;
    }

    .icon-btn:hover {
      background: var(--pg-surface-2);
    }

    .menu-btn {
      display: none;
    }

    .shell-body {
      flex: 1;
      min-height: 0;
      display: grid;
      grid-template-columns: var(--pg-sidebar-width) 1fr;
    }

    .sidebar {
      position: sticky;
      top: var(--pg-header-height);
      align-self: start;
      height: calc(100dvh - var(--pg-header-height));
      padding: 0.75rem 0.4rem 0.75rem 0.75rem;
      background: var(--pg-surface);
      border-right: 1px solid var(--pg-border);
    }

    .content {
      min-width: 0;
      padding: 2.25rem 2rem 4rem;
    }

    @media (max-width: 820px) {
      .menu-btn {
        display: grid;
      }

      .search-btn-text {
        display: none;
      }

      .shell-body {
        grid-template-columns: 1fr;
      }

      .sidebar {
        display: none;
      }

      .content {
        padding: 1.5rem 1rem 3rem;
      }
    }
  `,
})
export class App {
  readonly #document = inject(DOCUMENT);
  readonly #router = inject(Router);

  protected readonly shell = viewChild<ElementRef<HTMLElement>>('shell');

  protected readonly repo = GITHUB_REPO;
  protected readonly theme = signal<Theme>(readInitialTheme());
  protected readonly navOpen = signal(false);
  protected readonly paletteOpen = signal(false);

  protected readonly dark = computed(() => this.theme() === 'dark');
  protected readonly themeLabel = computed(() =>
    this.dark() ? 'Switch to light theme' : 'Switch to dark theme',
  );

  constructor() {
    effect(() => {
      const theme = this.theme();
      this.#document.documentElement.setAttribute('data-theme', theme);
      globalThis.localStorage?.setItem(THEME_KEY, theme);
    });

    this.#router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        if (!event.urlAfterRedirects.includes('#')) {
          this.shell()?.nativeElement.scrollTo({ top: 0, left: 0 });
        }
      });
  }

  protected setDark(dark: boolean): void {
    this.theme.set(dark ? 'dark' : 'light');
  }

  protected openPalette(event?: Event): void {
    event?.preventDefault();
    this.paletteOpen.set(true);
  }
}
