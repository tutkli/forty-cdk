import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

import { injectDocBase } from '../doc/doc-base';
import { injectFragmentScroll } from '../doc/doc-fragment';
import { DocLinks } from '../doc/doc-links';
import { DocSection } from '../doc/doc-section';
import { DocToc } from '../doc/doc-toc';
import { buildTocItems, type TocEntry } from '../doc/doc-toc-rail';
import type { DocPage, DocPageSection } from '../doc/doc-model';
import { guideBySlug } from '../doc/guides';

@Component({
  selector: 'guide-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocSection, DocToc, DocLinks, RouterLink],
  template: `
    <header class="head">
      <div class="head-text">
        <a class="crumb" [routerLink]="['/guides']">Guides</a>
        <h1>{{ guide().title }}</h1>
        @if (guide().description) {
          <p>{{ guide().description }}</p>
        }
      </div>
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

    .crumb {
      display: inline-block;
      margin-bottom: 0.5rem;
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--pg-text-muted);
      text-decoration: none;
    }

    .crumb:hover {
      color: var(--pg-primary);
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
export class GuidePage {
  readonly #sanitizer = inject(DomSanitizer);
  readonly #base = injectDocBase();

  readonly slug = input.required<string>();

  /**
   * The compiled guide, resolved by the route this page is served under so that
   * each document keeps a chunk of its own
   * ([#1825](https://github.com/tutkli/forty-cdk/issues/1825)).
   *
   * Bound by `withComponentInputBinding()` out of the route's resolved data, and
   * resolved before activation — so it is here on the first render, like the
   * slug beside it.
   */
  readonly doc = input.required<DocPage>();

  protected readonly guide = computed(() => guideBySlug(this.slug()));

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
