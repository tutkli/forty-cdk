import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { ForDrawer, ForDrawerBackdrop, ForDrawerClose, ForDrawerTrigger } from 'forty-cdk';
import { filter, map } from 'rxjs/operators';

import { NavSidebar } from './layout/nav-sidebar';
import { SearchBox } from './layout/search-box';
import { ThemeToggle } from './layout/theme-toggle';
import { TableOfContents } from './layout/toc';

@Component({
  selector: 'for-docs-root',
  imports: [
    RouterLink,
    RouterOutlet,
    NavSidebar,
    SearchBox,
    ThemeToggle,
    TableOfContents,
    ForDrawer,
    ForDrawerBackdrop,
    ForDrawerClose,
    ForDrawerTrigger,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header
      class="
        sticky top-0 z-20 box-border flex min-h-14 items-center gap-4
        border-b border-border-soft bg-surface/80 px-4 py-2.5
        backdrop-blur backdrop-saturate-150
        nav:px-6 nav:py-3
      "
    >
      @if (showSidebar()) {
        <button
          forDrawerTrigger
          controls="docs-mobile-nav"
          [(open)]="mobileNavOpen"
          aria-label="Open navigation"
          class="
            inline-flex items-center justify-center rounded-sm
            border border-border-soft bg-transparent p-1.5
            text-on-surface hover:bg-surface-muted
            nav:hidden
          "
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
      }
      <a
        routerLink="/"
        class="flex-1 text-base font-bold tracking-tight text-on-surface no-underline"
      >
        forty-cdk
      </a>
      <div class="flex items-center gap-2">
        <for-docs-search-box />
        <for-docs-theme-toggle />
      </div>
    </header>

    <div [class]="shellClasses()">
      @if (showSidebar()) {
        <aside
          class="
            hidden self-start
            nav:sticky nav:top-14 nav:block nav:h-[calc(100vh-3.5rem)]
            nav:overflow-y-auto nav:border-r nav:border-border-soft
            nav:py-7 nav:pl-6 nav:pr-4
            [scrollbar-color:var(--for-border-strong)_transparent]
            [scrollbar-width:thin]
            [&::-webkit-scrollbar]:w-2
            [&::-webkit-scrollbar-thumb]:rounded-sm
            [&::-webkit-scrollbar-thumb]:bg-border-strong
          "
        >
          <for-docs-nav-sidebar />
        </aside>
      }
      <main [class]="mainClasses()">
        <router-outlet />
      </main>
      @if (showToc()) {
        <for-docs-toc class="hidden xl:block" />
      }
    </div>

    @if (mobileNavOpen()) {
      <div
        forDrawer
        id="docs-mobile-nav"
        side="left"
        ariaLabel="Navigation"
        animate.enter="docs-anim-slide-in"
        animate.leave="docs-anim-slide-out"
        (close)="mobileNavOpen.set(false)"
        class="
          fixed inset-y-0 left-0 z-50 flex w-[min(86vw,320px)]
          flex-col gap-4 overflow-y-auto
          border-r border-border-soft bg-surface
          px-4 pb-8 pt-5
        "
      >
        <div
          forDrawerBackdrop
          animate.enter="docs-anim-fade-in"
          animate.leave="docs-anim-fade-out"
          class="fixed inset-0 z-40 bg-black/50"
        ></div>
        <div class="flex items-center justify-between border-b border-border-soft pb-2">
          <span class="font-bold tracking-tight">forty-cdk</span>
          <button
            type="button"
            forDrawerClose
            aria-label="Close navigation"
            class="
              cursor-pointer rounded-sm border-0 bg-transparent
              px-2 py-1 text-2xl leading-none text-on-surface
              hover:bg-surface-muted
            "
          >
            ×
          </button>
        </div>
        <for-docs-nav-sidebar (navigate)="mobileNavOpen.set(false)" />
      </div>
    }
  `,
})
export class App {
  readonly #router = inject(Router);

  protected readonly mobileNavOpen = signal(false);

  /**
   * Current URL, tracked off the router so we can collapse the chrome
   * (sidebar + mobile hamburger) on routes that don't need a docs nav.
   * Marketing landing today; same hook can hide it on future 404 / changelog
   * pages without touching the route definitions.
   */
  readonly #url = toSignal(
    this.#router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.#router.url },
  );

  /** Sidebar shows on docs routes (everywhere except the marketing landing). */
  protected readonly showSidebar = computed(() => {
    const url = this.#url().split('?')[0]?.split('#')[0] ?? '/';
    return url !== '/' && url !== '';
  });

  /**
   * TOC shows on content-bearing routes: `/docs/*` (markdown) and
   * `/components/:slug` (primitive page). Omitted on the landing and the
   * `/components` cards index where there are no in-page sections worth
   * scrolling between. The TOC also self-hides if it finds no
   * id-bearing headings, so a stricter URL check is unnecessary.
   */
  protected readonly showToc = computed(() => {
    const url = this.#url().split('?')[0]?.split('#')[0] ?? '/';
    return url.startsWith('/docs/') || /^\/components\/[^/]+/.test(url);
  });

  /**
   * Layout shell classes. Three modes:
   *
   * - Landing (no sidebar): single centered container.
   * - Docs without TOC (`/components` index, `/docs`): two-column grid
   *   above `nav:` (260px sidebar + main).
   * - Docs with TOC (`/docs/*`, `/components/:slug`): two-column grid
   *   above `nav:` (sidebar + main), three-column above `xl:` (sidebar +
   *   main + TOC). The TOC drops out below `xl:` so the main column
   *   doesn't get squeezed.
   */
  protected readonly shellClasses = computed(() => {
    if (!this.showSidebar()) return 'mx-auto max-w-[1440px]';
    return this.showToc()
      ? 'mx-auto grid max-w-[1440px] grid-cols-1 nav:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_220px]'
      : 'mx-auto grid max-w-[1440px] grid-cols-1 nav:grid-cols-[260px_minmax(0,1fr)]';
  });

  /**
   * Main-column classes. The reading max-width is narrower on docs pages
   * (better line length next to a sidebar) and wider on the landing.
   */
  protected readonly mainClasses = computed(() =>
    this.showSidebar()
      ? 'mx-auto box-border w-full max-w-[60rem] px-4 pb-16 pt-6 nav:px-8 nav:pb-24 nav:pt-10'
      : 'mx-auto box-border w-full max-w-[72rem] px-4 pb-16 pt-6 nav:px-8 nav:pb-24 nav:pt-10',
  );
}
