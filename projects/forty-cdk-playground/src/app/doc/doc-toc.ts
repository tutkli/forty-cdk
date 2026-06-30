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
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

export interface TocItem {
  readonly title: string;
  readonly slug: string;
  readonly children?: readonly TocItem[];
}

@Component({
  selector: 'doc-toc',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <nav class="pg-toc" aria-label="On this page">
      <p class="pg-toc-title">On this page</p>
      <ul class="pg-toc-list">
        @for (item of items(); track item.slug) {
          <li>
            <a
              class="pg-toc-link"
              [class.active]="item.slug === activeSlug()"
              [routerLink]="[]"
              [fragment]="item.slug"
              >{{ item.title }}</a
            >
            @if (item.children?.length) {
              <ul class="pg-toc-sublist">
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

  readonly items = input.required<readonly TocItem[]>();

  protected readonly activeSlug = signal<string | null>(null);

  readonly #flatItems = computed<readonly TocItem[]>(() =>
    this.items().flatMap((item) => [item, ...(item.children ?? [])]),
  );

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
        for (const item of this.#flatItems()) {
          const element = this.#document.getElementById(item.slug);
          if (!element) {
            continue;
          }
          if (element.getBoundingClientRect().top <= line) {
            active = item.slug;
          } else {
            break;
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
