import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import type { TocEntry } from './doc-toc-rail';

@Component({
  selector: 'doc-toc',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <nav class="pg-toc" aria-label="On this page">
      <p class="pg-toc-title">On this page</p>
      <ul class="pg-toc-list">
        @for (item of items(); track item.slug ?? item.title; let index = $index) {
          <li>
            @if (item.disclosure) {
              <p class="pg-toc-group">
                @if (item.slug; as slug) {
                  <a
                    class="pg-toc-link pg-toc-grouplink"
                    [class.active]="slug === activeSlug()"
                    [routerLink]="[]"
                    [fragment]="slug"
                    >{{ item.title }}</a
                  >
                } @else {
                  <span class="pg-toc-link pg-toc-grouplink">{{ item.title }}</span>
                }
                <button
                  type="button"
                  class="pg-toc-toggle"
                  [attr.aria-label]="item.title"
                  [attr.aria-expanded]="expanded()"
                  [attr.aria-controls]="groupListId(index)"
                  (click)="toggle()"
                >
                  <span class="pg-toc-caret" aria-hidden="true"></span>
                </button>
              </p>
            } @else if (item.slug; as slug) {
              <a
                class="pg-toc-link"
                [class.active]="slug === activeSlug()"
                [routerLink]="[]"
                [fragment]="slug"
                >{{ item.title }}</a
              >
            }
            @if (item.children?.length) {
              <ul
                class="pg-toc-sublist"
                [attr.id]="item.disclosure ? groupListId(index) : null"
                [hidden]="item.disclosure !== undefined && !expanded()"
              >
                @for (child of item.children; track child.slug) {
                  <li>
                    <a
                      class="pg-toc-link pg-toc-sublink"
                      [class.active]="child.slug === activeSlug()"
                      [routerLink]="[]"
                      [fragment]="child.slug"
                      >{{ child.title }}</a
                    >
                  </li>
                }
              </ul>
            }
          </li>
        }
      </ul>
    </nav>
  `,
})
export class DocToc {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #destroyRef = inject(DestroyRef);
  readonly #document = inject(DOCUMENT);

  readonly items = input.required<readonly TocEntry[]>();

  protected readonly activeSlug = signal<string | null>(null);

  readonly #group = computed<TocEntry | null>(
    () => this.items().find((item) => item.disclosure !== undefined) ?? null,
  );

  /** What the reader chose for this page's group, reset when the page changes. */
  readonly #chosen = linkedSignal<readonly TocEntry[], boolean | null>({
    source: this.items,
    computation: () => null,
  });

  /**
   * Whether the group lists its children.
   *
   * The reader's choice wins, and until they make one the group opens while the
   * section they are reading is inside it — without that, a closed group leaves
   * the rail highlighting nothing over most of the page it was added to help.
   */
  protected readonly expanded = computed(() => {
    const group = this.#group();
    if (group === null) {
      return false;
    }
    const chosen = this.#chosen();
    if (chosen !== null) {
      return chosen;
    }
    const active = this.activeSlug();
    return (
      group.disclosure === 'open' ||
      (group.children?.some((child) => child.slug === active) ?? false)
    );
  });

  protected groupListId(index: number): string {
    return `pg-toc-group-${index}`;
  }

  protected toggle(): void {
    this.#chosen.set(!this.expanded());
  }

  readonly #slugs = computed<readonly string[]>(() =>
    this.items()
      .flatMap((item) => [item, ...(item.children ?? [])])
      .map((item) => item.slug)
      .filter((slug): slug is string => slug !== null),
  );

  /**
   * The rail no longer lists its entries in the order the page renders them, so
   * the active one is the lowest heading still above the line rather than the
   * last one scanned before the first that is below it.
   */
  constructor() {
    afterNextRender(() => {
      const scroller = this.#host.nativeElement.closest<HTMLElement>('.app-shell');
      const target: HTMLElement | Window | null = scroller ?? this.#document.defaultView;
      if (!target) {
        return;
      }
      let frame = 0;

      const update = (): void => {
        frame = 0;
        const line = (scroller ? scroller.getBoundingClientRect().top : 0) + 96;
        let active: string | null = null;
        let lowest = -Infinity;
        for (const slug of this.#slugs()) {
          const element = this.#document.getElementById(slug);
          if (!element) {
            continue;
          }
          const top = element.getBoundingClientRect().top;
          if (top <= line && top > lowest) {
            lowest = top;
            active = slug;
          }
        }
        this.activeSlug.set(active);
      };

      const onScroll = (): void => {
        frame ||= requestAnimationFrame(update);
      };

      target.addEventListener('scroll', onScroll, { passive: true });
      update();

      this.#destroyRef.onDestroy(() => {
        target.removeEventListener('scroll', onScroll);
        if (frame) {
          cancelAnimationFrame(frame);
        }
      });
    });
  }
}
