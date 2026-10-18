import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Icon } from './icon';
import { SiteChrome } from './site-chrome';

@Component({
  selector: 'search-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <button
      type="button"
      class="search-btn"
      aria-label="Search"
      aria-haspopup="dialog"
      [attr.aria-expanded]="chrome.paletteOpen()"
      aria-keyshortcuts="Control+K Meta+K"
      (click)="chrome.openPalette()"
    >
      <app-icon name="magnifying-glass" />
      <span class="search-btn-text">Search</span>
      <kbd class="search-btn-kbd">{{ chrome.searchShortcut }}</kbd>
    </button>
  `,
  styles: `
    :host {
      display: contents;
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
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      cursor: pointer;
    }

    .search-btn:hover {
      background: var(--pg-surface-2);
      border-color: var(--pg-border-strong);
    }

    .search-btn app-icon {
      width: 16px;
      height: 16px;
    }

    .search-btn-kbd {
      font-family: var(--pg-font-mono);
      font-size: 0.7rem;
      white-space: nowrap;
      padding: 0.1rem 0.35rem;
      border-radius: var(--pg-radius-xs);
      background: var(--pg-surface-2);
      border: 1px solid var(--pg-border-strong);
      color: var(--pg-text-muted);
    }

    @media (max-width: 820px) {
      .search-btn-text {
        display: none;
      }
    }

    @media (hover: none) {
      .search-btn-kbd {
        display: none;
      }
    }
  `,
})
export class SearchButton {
  protected readonly chrome = inject(SiteChrome);
}
