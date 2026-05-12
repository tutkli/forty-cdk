import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

interface TocEntry {
  readonly id: string;
  readonly text: string;
  readonly level: 2 | 3;
}

/**
 * "On this page" sticky right column. Scans the page `<main>` for h2/h3
 * elements that already carry an `id` (markdown rendering supplies them
 * via slugified anchors; the page templates set them explicitly on
 * "Examples", "Usage", "API reference", and each API piece header).
 *
 * Three coordination concerns:
 *
 * - **Re-scan**: a `MutationObserver` on `<main>` reacts to async content
 *   landing (markdown finishing, API metadata resolving). The callback
 *   is debounced to a single rAF tick so a burst of inserts collapses to
 *   one rescan.
 * - **Scroll-spy**: a single `scroll` listener on `window`, throttled
 *   to one rAF, re-derives the active id by picking the last heading
 *   whose top has crossed the 80px offset line (header height + a bit);
 *   if none have, the first heading is active. A scroll listener wins
 *   over an `IntersectionObserver` here because programmatic
 *   `scrollTo` jumps past the spy zone in a single frame and the
 *   observer never sees an intermediate "intersecting" state, so its
 *   callback never fires. Recomputation per frame is ~13 reads of
 *   `getBoundingClientRect` which the browser already caches between
 *   layout passes — cheap, robust, no edge cases.
 * - **Empty / off-route**: the component renders nothing when no
 *   id-bearing headings exist (landing, components index).
 *
 * Heading display text prefers `data-toc-title` over `textContent` so
 * pieces that wrap extra content in their h3 (chevron glyph, selector)
 * can publish a clean label without affecting the rendered heading.
 */
@Component({
  selector: 'for-docs-toc',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (entries().length > 0) {
      <nav class="docs-toc-container" aria-label="On this page">
        <h3 class="docs-eyebrow mb-3">On this page</h3>
        <ul class="m-0 flex list-none flex-col p-0">
          @for (entry of entries(); track entry.id) {
            <li>
              <a
                [routerLink]="[]"
                [fragment]="entry.id"
                class="docs-toc-link"
                [class.is-active]="entry.id === activeId()"
                [attr.data-level]="entry.level"
              >
                {{ entry.text }}
              </a>
            </li>
          }
        </ul>
      </nav>
    }
  `,
})
export class TableOfContents {
  readonly #doc = inject(DOCUMENT);
  readonly #platformId = inject(PLATFORM_ID);
  readonly #destroyRef = inject(DestroyRef);

  protected readonly entries = signal<readonly TocEntry[]>([]);
  protected readonly activeId = signal<string>('');

  #mutation: MutationObserver | null = null;
  #rescanScheduled = false;
  #spyScheduled = false;
  #headings: HTMLElement[] = [];
  #scrollListener: (() => void) | null = null;
  #scrollTarget: Window | null = null;

  constructor() {
    if (!isPlatformBrowser(this.#platformId)) return;

    afterNextRender(() => {
      const main = this.#doc.querySelector('main');
      if (!main) return;

      this.#scrollTarget = this.#doc.defaultView;
      if (this.#scrollTarget) {
        this.#scrollListener = () => this.#scheduleUpdateActive();
        this.#scrollTarget.addEventListener('scroll', this.#scrollListener, { passive: true });
      }

      this.#rescan(main);

      this.#mutation = new MutationObserver(() => this.#scheduleRescan(main));
      this.#mutation.observe(main, { childList: true, subtree: true });

      this.#destroyRef.onDestroy(() => {
        this.#mutation?.disconnect();
        if (this.#scrollTarget && this.#scrollListener) {
          this.#scrollTarget.removeEventListener('scroll', this.#scrollListener);
        }
      });
    });
  }

  #scheduleRescan(main: Element): void {
    if (this.#rescanScheduled) return;
    this.#rescanScheduled = true;
    const win = this.#doc.defaultView;
    const schedule = win?.requestAnimationFrame ?? ((cb: FrameRequestCallback) => setTimeout(cb, 16));
    schedule(() => {
      this.#rescanScheduled = false;
      this.#rescan(main);
    });
  }

  #rescan(main: Element): void {
    const headings = Array.from(main.querySelectorAll<HTMLElement>('h2[id], h3[id]')).filter(
      (h) => h.id.length > 0,
    );

    const next: TocEntry[] = headings.map((h) => ({
      id: h.id,
      text: (h.dataset['tocTitle'] ?? h.textContent ?? '').trim(),
      level: h.tagName === 'H3' ? 3 : 2,
    }));

    const prev = this.entries();
    const unchanged =
      prev.length === next.length && prev.every((e, i) => e.id === next[i]?.id && e.text === next[i]?.text);
    if (!unchanged) {
      this.entries.set(next);
    }

    this.#headings = headings;
    if (headings.length === 0) {
      this.activeId.set('');
      return;
    }
    this.#updateActive();
  }

  #scheduleUpdateActive(): void {
    if (this.#spyScheduled) return;
    this.#spyScheduled = true;
    const win = this.#doc.defaultView;
    const schedule = win?.requestAnimationFrame ?? ((cb: FrameRequestCallback) => setTimeout(cb, 16));
    schedule(() => {
      this.#spyScheduled = false;
      this.#updateActive();
    });
  }

  #updateActive(): void {
    const headings = this.#headings;
    if (headings.length === 0) return;
    let active = headings[0]!;
    for (const h of headings) {
      if (h.getBoundingClientRect().top - 80 <= 0) {
        active = h;
      } else {
        break;
      }
    }
    if (this.activeId() !== active.id) {
      this.activeId.set(active.id);
    }
  }
}
