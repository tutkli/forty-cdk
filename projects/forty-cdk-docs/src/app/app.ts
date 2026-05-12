import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { SearchBox } from './layout/search-box';
import { ThemeToggle } from './layout/theme-toggle';

@Component({
  selector: 'for-docs-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, SearchBox, ThemeToggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="docs-header">
      <a routerLink="/" class="docs-header__brand">forty-cdk</a>
      <nav class="docs-header__nav">
        <a routerLink="/docs/getting-started" routerLinkActive="is-active">Getting started</a>
        <a routerLink="/components" routerLinkActive="is-active">Components</a>
      </nav>
      <div class="docs-header__actions">
        <for-docs-search-box />
        <for-docs-theme-toggle />
      </div>
    </header>
    <main class="docs-main">
      <router-outlet />
    </main>
  `,
  styles: `
    .docs-header__nav a.is-active {
      color: var(--for-on-surface);
      font-weight: 600;
    }
  `,
})
export class App {}
