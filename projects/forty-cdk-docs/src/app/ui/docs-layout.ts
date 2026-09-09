import { LocationStrategy } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

import { AppNav } from './app-nav';
import { GITHUB_REPO } from './github';
import { Icon } from './icon';
import { ScrollPane } from './scroll-pane';
import { SectionSwitcher } from './section-switcher';
import { SiteChrome } from './site-chrome';
import { ThemeToggle } from './theme-toggle';

@Component({
  selector: 'docs-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, AppNav, ScrollPane, Icon, SectionSwitcher, ThemeToggle],
  template: `
    <header class="topbar">
      <button
        type="button"
        class="pg-icon-btn menu-btn"
        (click)="chrome.navOpen.set(true)"
        aria-label="Open navigation"
      >
        <app-icon name="bars-3" />
      </button>

      <a class="brand" [routerLink]="['/']">
        <span class="brand-name">forty-cdk</span>
        <span class="brand-tag">docs</span>
      </a>

      <section-switcher class="sections" />

      <div class="topbar-actions">
        <button type="button" class="search-btn" (click)="chrome.openPalette()" aria-label="Search">
          <app-icon name="magnifying-glass" />
          <span class="search-btn-text">Search</span>
          <kbd class="search-btn-kbd">⌘K</kbd>
        </button>
        <a
          class="llms-link"
          [href]="llmsTxt"
          target="_blank"
          rel="noreferrer noopener"
          title="The documentation as markdown, for AI assistants"
        >
          llms.txt
        </a>
        <a
          class="pg-icon-btn"
          [href]="repo"
          target="_blank"
          rel="noreferrer noopener"
          aria-label="GitHub repository"
        >
          <app-icon name="github" />
        </a>
        <theme-toggle />
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
  `,
  styles: `
    :host {
      flex: 1 0 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      background: var(--pg-surface);
    }

    .topbar {
      position: sticky;
      top: 0;
      z-index: 40;
      flex: none;
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
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--pg-secondary);
      background: color-mix(in srgb, var(--pg-secondary) 16%, transparent);
      padding: 0.1rem 0.45rem;
      border-radius: 999px;
    }

    .sections {
      margin-left: 1.25rem;
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
      border-radius: var(--pg-radius-xs);
      background: var(--pg-surface);
      border: 1px solid var(--pg-border-strong);
      color: var(--pg-text-muted);
    }

    .llms-link {
      flex: none;
      display: inline-flex;
      align-items: center;
      height: 34px;
      padding: 0 0.6rem;
      font-family: var(--pg-font-mono);
      font-size: 0.72rem;
      text-decoration: none;
      color: var(--pg-text-muted);
      background: var(--pg-surface);
      border: 1px solid var(--pg-border-strong);
      border-radius: var(--pg-radius-sm);
    }

    .llms-link:hover {
      background: var(--pg-surface-2);
      color: var(--pg-text);
    }

    .menu-btn {
      display: none;
    }

    .shell-body {
      flex: 1 0 auto;
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

      .sections {
        display: none;
      }

      .search-btn-text,
      .llms-link {
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
export class DocsLayout {
  protected readonly chrome = inject(SiteChrome);

  protected readonly repo = GITHUB_REPO;
  protected readonly llmsTxt = inject(LocationStrategy).prepareExternalUrl('/llms.txt');
}
