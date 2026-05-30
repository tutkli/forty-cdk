import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { PLAYGROUND_GROUPS } from './primitives';

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
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-name">forty-cdk</span>
        <span class="brand-tag">playground</span>
        <button
          type="button"
          class="theme"
          (click)="toggleTheme()"
          [attr.aria-label]="theme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
        >
          {{ theme() === 'dark' ? '☀' : '☾' }}
        </button>
      </div>

      <nav>
        @for (group of groups; track group.label) {
          <div class="group">
            <h2>{{ group.label }}</h2>
            <ul>
              @for (item of group.primitives; track item.slug) {
                <li>
                  @if (item.ready) {
                    <a
                      [routerLink]="['/', item.slug]"
                      routerLinkActive="active"
                      class="link"
                    >
                      {{ item.title }}
                    </a>
                  } @else {
                    <span class="link disabled" title="Coming soon">
                      {{ item.title }}
                      <span class="soon">soon</span>
                    </span>
                  }
                </li>
              }
            </ul>
          </div>
        }
      </nav>
    </aside>

    <main class="content">
      <router-outlet />
    </main>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: var(--pg-sidebar-width) 1fr;
      min-height: 100vh;
    }

    .sidebar {
      position: sticky;
      top: 0;
      align-self: start;
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
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    .brand-tag {
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--pg-text-muted);
    }

    .theme {
      margin-left: auto;
      width: 30px;
      height: 30px;
      display: grid;
      place-items: center;
      font-size: 0.95rem;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      cursor: pointer;
    }

    .theme:hover {
      background: var(--pg-surface-2);
    }

    .group {
      margin-bottom: 1.25rem;
    }

    .group h2 {
      margin: 0 0 0.4rem;
      padding: 0 0.75rem;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--pg-text-muted);
    }

    ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.75rem;
      border-radius: var(--pg-radius-sm);
      font-size: 0.9rem;
      color: var(--pg-text);
      text-decoration: none;
    }

    a.link:hover {
      background: var(--pg-surface-2);
    }

    a.link.active {
      background: color-mix(in srgb, var(--pg-primary) 14%, transparent);
      color: var(--pg-primary);
      font-weight: 600;
    }

    .link.disabled {
      color: var(--pg-text-muted);
      opacity: 0.65;
      cursor: not-allowed;
    }

    .soon {
      margin-left: auto;
      font-size: 0.62rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.05rem 0.35rem;
      border-radius: 999px;
      background: var(--pg-surface-2);
      color: var(--pg-text-muted);
    }

    .content {
      padding: 2.5rem 2rem 4rem;
    }

    @media (max-width: 720px) {
      :host {
        grid-template-columns: 1fr;
      }

      .sidebar {
        position: static;
        height: auto;
      }
    }
  `,
})
export class App {
  readonly #document = inject(DOCUMENT);

  protected readonly groups = PLAYGROUND_GROUPS;
  protected readonly theme = signal<Theme>(readInitialTheme());

  constructor() {
    effect(() => {
      const theme = this.theme();
      this.#document.documentElement.setAttribute('data-theme', theme);
      globalThis.localStorage?.setItem(THEME_KEY, theme);
    });
  }

  protected toggleTheme(): void {
    this.theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }
}
