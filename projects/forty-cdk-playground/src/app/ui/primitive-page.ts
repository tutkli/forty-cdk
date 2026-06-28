import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

import { DocSection } from '../doc/doc-section';
import { parseReadme } from '../doc/markdown';
import { DocToc } from '../doc/doc-toc';
import { primitiveBySlug } from '../primitives';

@Component({
  selector: 'primitive-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocSection, DocToc],
  template: `
    <header class="head">
      <div class="head-text">
        <h1>{{ meta().title }}</h1>
        <p>{{ meta().description }}</p>
      </div>
      @if (meta().apgUrl; as apgUrl) {
        <a class="apg" [href]="apgUrl" target="_blank" rel="noreferrer noopener">
          WAI-ARIA APG ↗
        </a>
      }
    </header>

    <div class="layout">
      <div class="main">
        @if (introHtml(); as intro) {
          <div class="pg-doc-prose pg-doc-intro" [innerHTML]="intro"></div>
        }

        @for (section of sectionsBefore(); track section.slug) {
          <doc-section [section]="section" />
        }

        <section class="pg-doc-section" [id]="examplesMeta().slug">
          <h2 class="pg-doc-h2">
            <a
              class="pg-doc-anchor"
              [href]="'#' + examplesMeta().slug"
              [attr.aria-label]="examplesMeta().title + ' permalink'"
              >#</a
            >
            {{ examplesMeta().title }}
          </h2>
          <div class="examples">
            <ng-content />
          </div>
        </section>

        @for (section of sectionsAfter(); track section.slug) {
          <doc-section [section]="section" />
        }
      </div>

      <aside class="rail">
        <doc-toc [items]="tocItems()" />
      </aside>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      max-width: 980px;
      margin: 0 auto 2.5rem;
    }

    .head h1 {
      margin: 0;
      font-size: 1.6rem;
      letter-spacing: -0.01em;
    }

    .head p {
      margin: 0.5rem 0 0;
      max-width: 65ch;
      color: var(--pg-text-muted);
    }

    .apg {
      flex: none;
      font-size: 0.82rem;
      font-weight: 600;
      white-space: nowrap;
      color: var(--pg-primary);
      text-decoration: none;
    }

    .apg:hover {
      text-decoration: underline;
    }

    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 220px;
      gap: 3rem;
      max-width: 1180px;
      margin: 0 auto;
    }

    .main {
      min-width: 0;
    }

    .examples {
      display: flex;
      flex-direction: column;
      gap: 3rem;
    }

    .rail {
      position: sticky;
      top: 2.5rem;
      align-self: start;
      height: fit-content;
    }

    @media (max-width: 1080px) {
      .layout {
        grid-template-columns: minmax(0, 1fr);
      }

      .rail {
        display: none;
      }
    }

    @media (max-width: 820px) {
      .head {
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 1.75rem;
      }

      .head h1 {
        font-size: 1.35rem;
      }

      .examples {
        gap: 2rem;
      }
    }
  `,
})
export class PrimitivePage {
  readonly #sanitizer = inject(DomSanitizer);
  readonly #document = inject(DOCUMENT);

  readonly slug = input.required<string>();
  readonly readme = input.required<string>();

  protected readonly meta = computed(() => primitiveBySlug(this.slug()));

  readonly #parsed = computed(() => parseReadme(this.readme()));

  protected readonly introHtml = computed(() => {
    const intro = this.#parsed().intro;
    return intro.trim() ? this.#sanitizer.bypassSecurityTrustHtml(intro) : null;
  });

  readonly #sections = computed(() => this.#parsed().sections);
  readonly #examplesIndex = computed(() =>
    this.#sections().findIndex((section) => section.slug === 'examples'),
  );

  protected readonly sectionsBefore = computed(() => {
    const index = this.#examplesIndex();
    return index < 0 ? [] : this.#sections().slice(0, index);
  });

  protected readonly sectionsAfter = computed(() => {
    const index = this.#examplesIndex();
    return index < 0 ? this.#sections() : this.#sections().slice(index + 1);
  });

  protected readonly examplesMeta = computed(() => {
    const index = this.#examplesIndex();
    if (index < 0) {
      return { title: 'Examples', slug: 'examples' };
    }
    const section = this.#sections()[index];
    return { title: section.title, slug: section.slug };
  });

  protected readonly tocItems = computed(() =>
    [...this.sectionsBefore(), this.examplesMeta(), ...this.sectionsAfter()].map((section) => ({
      title: section.title,
      slug: section.slug,
    })),
  );

  constructor() {
    afterNextRender(() => {
      const hash = decodeURIComponent(
        (this.#document.defaultView?.location.hash ?? '').replace(/^#/, ''),
      );
      if (!hash) {
        return;
      }
      this.#document.getElementById(hash)?.scrollIntoView();
    });
  }
}
