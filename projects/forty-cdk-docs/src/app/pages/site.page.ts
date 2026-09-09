import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

import { injectDocBase } from '../doc/doc-base';
import { injectFragmentScroll } from '../doc/doc-fragment';
import { DocLinks } from '../doc/doc-links';
import type { DocPage, DocPageSection } from '../doc/doc-model';
import { DocSection } from '../doc/doc-section';
import { DocToc } from '../doc/doc-toc';
import { buildTocItems, type TocEntry } from '../doc/doc-toc-rail';
import { sitePageBySlug } from '../doc/site-pages';

@Component({
  selector: 'site-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocSection, DocToc, DocLinks],
  template: `
    <header class="head">
      <h1 class="pg-doc-title">{{ page().title }}</h1>
      @if (page().description) {
        <p class="pg-doc-lede">{{ page().description }}</p>
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
      margin: 0 auto 2.75rem;
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
        margin-bottom: 2rem;
      }
    }
  `,
})
export class SitePage {
  readonly #sanitizer = inject(DomSanitizer);
  readonly #base = injectDocBase();

  readonly slug = input.required<string>();

  /**
   * The compiled document, resolved by the route this page is served under so
   * that each site page keeps a chunk of its own
   * ([#1852](https://github.com/tutkli/forty-cdk/issues/1852)).
   *
   * Bound by `withComponentInputBinding()` out of the route's resolved data, and
   * resolved before activation — so it is here on the first render, like the
   * slug beside it.
   */
  readonly doc = input.required<DocPage>();

  protected readonly page = computed(() => sitePageBySlug(this.slug()));

  protected readonly introHtml = computed(() => {
    const intro = this.doc()
      .intro.map((block) => this.#base(block.html))
      .join('');
    return intro.trim() ? this.#sanitizer.bypassSecurityTrustHtml(intro) : null;
  });

  protected readonly sections = computed(() => this.doc().sections);

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
      this.doc().behaviorGroup,
    ),
  );

  constructor() {
    injectFragmentScroll();
  }
}
