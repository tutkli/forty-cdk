import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

import { injectFragmentScroll } from '../doc/doc-fragment';
import { DocLinks } from '../doc/doc-links';
import { injectDocLinkResolver } from '../doc/doc-routes';
import { DocSection } from '../doc/doc-section';
import { DocToc, type TocItem } from '../doc/doc-toc';
import { GUIDE_CONTENT } from '../doc/guide-content.generated';
import { guideBySlug } from '../doc/guides';
import { type DocSectionData, parseDoc } from '../doc/markdown';

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
  readonly #resolveLink = injectDocLinkResolver();

  readonly slug = input.required<string>();

  protected readonly guide = computed(() => guideBySlug(this.slug()));

  readonly #parsed = computed(() => {
    const guide = this.guide();
    const content = GUIDE_CONTENT[guide.slug];
    if (content === undefined) {
      throw new Error(`[playground] no content bundled for guide: ${guide.slug}`);
    }
    return parseDoc(content, {
      sourcePath: guide.sourcePath,
      resolveLink: this.#resolveLink,
    });
  });

  protected readonly introHtml = computed(() => {
    const intro = this.#parsed().intro;
    return intro.trim() ? this.#sanitizer.bypassSecurityTrustHtml(intro) : null;
  });

  protected readonly sections = computed(() => this.#parsed().sections);

  protected readonly tocItems = computed<readonly TocItem[]>(() =>
    this.sections().map((section: DocSectionData) => ({
      title: section.title,
      slug: section.slug,
      children: section.subsections.length
        ? section.subsections.map((sub) => ({ title: sub.title, slug: sub.slug }))
        : undefined,
    })),
  );

  constructor() {
    injectFragmentScroll();
  }
}
