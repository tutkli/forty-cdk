import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ForDrawer, ForDrawerBackdrop, ForDrawerClose, ForDrawerTrigger } from 'forty-cdk';

import { NavSidebar } from './layout/nav-sidebar';
import { SearchBox } from './layout/search-box';
import { ThemeToggle } from './layout/theme-toggle';

@Component({
  selector: 'for-docs-root',
  imports: [
    RouterLink,
    RouterOutlet,
    NavSidebar,
    SearchBox,
    ThemeToggle,
    ForDrawer,
    ForDrawerBackdrop,
    ForDrawerClose,
    ForDrawerTrigger,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="docs-header">
      <button
        forDrawerTrigger
        controls="docs-mobile-nav"
        [(open)]="mobileNavOpen"
        class="docs-header__mobile-trigger"
        aria-label="Open navigation"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <a routerLink="/" class="docs-header__brand">forty-cdk</a>
      <div class="docs-header__actions">
        <for-docs-search-box />
        <for-docs-theme-toggle />
      </div>
    </header>

    <div class="docs-shell">
      <aside class="docs-sidebar">
        <for-docs-nav-sidebar />
      </aside>
      <main class="docs-main">
        <router-outlet />
      </main>
    </div>

    @if (mobileNavOpen()) {
      <div
        forDrawer
        id="docs-mobile-nav"
        side="left"
        ariaLabel="Navigation"
        class="docs-mobile-drawer"
        (close)="mobileNavOpen.set(false)"
        animate.enter="slide-in"
        animate.leave="slide-out"
      >
        <div
          forDrawerBackdrop
          class="docs-mobile-drawer__backdrop"
          animate.enter="fade-in"
          animate.leave="fade-out"
        ></div>
        <div class="docs-mobile-drawer__header">
          <span class="docs-mobile-drawer__brand">forty-cdk</span>
          <button type="button" forDrawerClose aria-label="Close navigation">×</button>
        </div>
        <for-docs-nav-sidebar (navigate)="mobileNavOpen.set(false)" />
      </div>
    }
  `,
})
export class App {
  protected readonly mobileNavOpen = signal(false);
}
