import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

import { injectDocBase } from '../doc/doc-base';
import { injectFragmentScroll } from '../doc/doc-fragment';
import { DocLinks } from '../doc/doc-links';
import type { DocPageSection } from '../doc/doc-model';
import { DocSection } from '../doc/doc-section';
import { DocToc } from '../doc/doc-toc';
import { buildTocItems, type TocEntry } from '../doc/doc-toc-rail';
import { sitePageBySlug } from '../doc/site-pages';
import { SITE_PAGE_DOCS } from '../../generated/site-page-docs.generated';

@Component({
  selector: 'site-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocSection, DocToc, DocLinks],
  template: `
    <header class="head">
      <h1>{{ page().title }}</h1>
      @if (page().description) {
        <p>{{ page().description }}</p>
      }
    </header>

    <div class="layout">
      <div class="main" docLinks>
        @if (introHtml(); as intro) {
          <div class="pg-doc-prose pg-doc-intro" [innerHTML]="intro"></div>
        }

        @for (section of sections(); track section.slug) {
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
      max-width: 1180px;
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
        margin-bottom: 1.75rem;
      }

      .head h1 {
        font-size: 1.35rem;
      }
    }
  `,
})
export class SitePage {
  readonly #sanitizer = inject(DomSanitizer);
  readonly #base = injectDocBase();

  readonly slug = input.required<string>();

  protected readonly page = computed(() => sitePageBySlug(this.slug()));

  readonly #doc = computed(() => {
    const page = this.page();
    const doc = SITE_PAGE_DOCS[page.slug];
    if (doc === undefined) {
      throw new Error(`[playground] no compiled document for site page: ${page.slug}`);
    }
    return doc;
  });

  protected readonly introHtml = computed(() => {
    const intro = this.#doc()
      .intro.map((block) => this.#base(block.html))
      .join('');
    return intro.trim() ? this.#sanitizer.bypassSecurityTrustHtml(intro) : null;
  });

  protected readonly sections = computed(() => this.#doc().sections);

  protected readonly tocItems = computed<readonly TocEntry[]>(() =>
    buildTocItems(
      this.sections().map((section: DocPageSection) => {
        const children = section.headings
          .filter((heading) => heading.depth === 3)
          .map((heading) => ({ title: heading.text, slug: heading.slug }));
        return {
          ring: section.ring,
          item: {
            title: section.title,
            slug: section.slug,
            children: children.length ? children : undefined,
          },
        };
      }),
      this.#doc().behaviorGroup,
    ),
  );

  constructor() {
    injectFragmentScroll();
  }
}
