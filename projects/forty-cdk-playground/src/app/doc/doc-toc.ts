import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
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

  readonly #visible = new Set<string>();

  constructor() {
    afterNextRender(() => {
      const root = this.#host.nativeElement.closest<HTMLElement>('.app-shell');
      const targets = this.items()
        .map((item) => this.#document.getElementById(item.slug))
        .filter((element): element is HTMLElement => element !== null);

      if (targets.length === 0) {
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              this.#visible.add(entry.target.id);
            } else {
              this.#visible.delete(entry.target.id);
            }
          }
          const active = this.items().find((item) => this.#visible.has(item.slug));
          if (active) {
            this.activeSlug.set(active.slug);
          }
        },
        { root, rootMargin: '-80px 0px -70% 0px', threshold: 0 },
      );

      for (const target of targets) {
        observer.observe(target);
      }

      this.#destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
