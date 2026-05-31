import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ForDrawer, ForDrawerBackdrop, ForToggle } from 'forty-cdk';

import { AppNav } from './ui/app-nav';

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
  imports: [RouterOutlet, ForToggle, ForDrawer, ForDrawerBackdrop, AppNav],
  template: `
    <header class="topbar">
      <button type="button" class="icon-btn" (click)="navOpen.set(true)" aria-label="Open navigation">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
          <path d="M2 4h12M2 8h12M2 12h12" />
        </svg>
      </button>
      <div class="brand">
        <span class="brand-name">forty-cdk</span>
        <span class="brand-tag">playground</span>
      </div>
      <button
        forToggle
        type="button"
        class="icon-btn theme"
        [pressed]="dark()"
        (pressedChange)="setDark($event)"
        [attr.aria-label]="themeLabel()"
      >
        {{ glyph() }}
      </button>
    </header>

    <aside class="sidebar">
      <div class="brand">
        <span class="brand-name">forty-cdk</span>
        <span class="brand-tag">playground</span>
        <button
          forToggle
          type="button"
          class="icon-btn theme"
          [pressed]="dark()"
          (pressedChange)="setDark($event)"
          [attr.aria-label]="themeLabel()"
        >
          {{ glyph() }}
        </button>
      </div>
      <app-nav />
    </aside>

    <main class="content">
      <router-outlet />
    </main>

    @if (navOpen()) {
      <div
        forDrawer
        class="pg-nav-drawer"
        side="left"
        ariaLabel="Primitives navigation"
        (close)="navOpen.set(false)"
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
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
    }

    .topbar {
      display: none;
    }

    .sidebar {
      position: fixed;
      top: 0;
      left: 0;
      width: var(--pg-sidebar-width);
      height: 100vh;
      overflow-y: auto;
      padding: 1rem 0.75rem 2rem;
      background: var(--pg-surface);
      border-right: 1px solid var(--pg-border);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem 1.25rem;
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

    .icon-btn svg {
      width: 18px;
      height: 18px;
    }

    .icon-btn:hover {
      background: var(--pg-surface-2);
    }

    .theme {
      margin-left: auto;
      font-size: 0.95rem;
    }

    .content {
      margin-left: var(--pg-sidebar-width);
      padding: 2.5rem 2rem 4rem;
    }

    @media (max-width: 820px) {
      .topbar {
        position: sticky;
        top: 0;
        z-index: 40;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.6rem 0.9rem;
        background: var(--pg-surface);
        border-bottom: 1px solid var(--pg-border);
      }

      .topbar .brand {
        padding: 0;
      }

      .sidebar {
        display: none;
      }

      .content {
        margin-left: 0;
        padding: 1.5rem 1rem 3rem;
      }
    }
  `,
})
export class App {
  readonly #document = inject(DOCUMENT);

  protected readonly theme = signal<Theme>(readInitialTheme());
  protected readonly navOpen = signal(false);

  protected readonly dark = computed(() => this.theme() === 'dark');
  protected readonly glyph = computed(() => (this.dark() ? '☀' : '☾'));
  protected readonly themeLabel = computed(() =>
    this.dark() ? 'Switch to light theme' : 'Switch to dark theme',
  );

  constructor() {
    effect(() => {
      const theme = this.theme();
      this.#document.documentElement.setAttribute('data-theme', theme);
      globalThis.localStorage?.setItem(THEME_KEY, theme);
    });
  }

  protected setDark(dark: boolean): void {
    this.theme.set(dark ? 'dark' : 'light');
  }
}
