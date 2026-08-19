import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  inject,
  input,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

import { injectFragmentScroll } from '../doc/doc-fragment';
import { DocLinks } from '../doc/doc-links';
import type { DocDocument, DocSection as DocSectionModel } from '../doc/doc-model';
import { injectDocLinkResolver } from '../doc/doc-routes';
import { DocSection } from '../doc/doc-section';
import { DocToc, type TocItem } from '../doc/doc-toc';
import { headingText, renderDocProse, stripText, type DocRenderContext } from '../doc/markdown';
import { primitiveBySlug } from '../primitives';
import { DemoLayout } from './demo-layout';
import { Icon } from './icon';

function stripLeadingDescription(introHtml: string, description: string): string {
  const lead = /^\s*<p>([\s\S]*?)<\/p>\s*/.exec(introHtml);
  if (lead && stripText(lead[1]!) === description.trim()) {
    return introHtml.slice(lead[0].length);
  }
  return introHtml;
}

@Component({
  selector: 'primitive-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocSection, DocToc, DocLinks, RouterLink, Icon],
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
      <div class="main" docLinks>
        <ng-content select="[hero]" />

        @if (introHtml(); as intro) {
          <div class="pg-doc-prose pg-doc-intro" [innerHTML]="intro"></div>
        }

        @for (section of sectionsBefore(); track section.slug) {
          <doc-section [section]="section" [context]="context()" />
        }

        <section class="pg-doc-section" [id]="examplesMeta().slug">
          <h2 class="pg-doc-h2">
            {{ examplesMeta().title }}
            <a
              class="pg-doc-anchor"
              [routerLink]="[]"
              [fragment]="examplesMeta().slug"
              [attr.aria-label]="examplesMeta().title + ' permalink'"
            >
              <app-icon name="link" />
            </a>
          </h2>
          <div class="examples">
            <ng-content />
          </div>
        </section>

        @for (section of sectionsAfter(); track section.slug) {
          <doc-section [section]="section" [context]="context()" />
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
  readonly #resolveLink = injectDocLinkResolver();

  readonly slug = input.required<string>();
  readonly doc = input.required<DocDocument>();

  protected readonly demos = contentChildren(DemoLayout);

  protected readonly meta = computed(() => primitiveBySlug(this.slug()));

  protected readonly context = computed<DocRenderContext>(() => ({
    sourcePath: this.doc().path,
    resolveLink: this.#resolveLink,
  }));

  protected readonly introHtml = computed(() => {
    const context = this.context();
    const rendered = this.doc()
      .intro.map((block) => renderDocProse(block, context))
      .join('');
    const intro = stripLeadingDescription(rendered, this.meta().description);
    return intro.trim() ? this.#sanitizer.bypassSecurityTrustHtml(intro) : null;
  });

  readonly #sections = computed(() => this.doc().sections);
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
    const section = this.#sections()[index]!;
    return { title: section.title, slug: section.slug };
  });

  protected readonly tocItems = computed<readonly TocItem[]>(() => {
    const toToc = (section: DocSectionModel): TocItem => {
      const children = section.headings
        .filter((heading) => heading.depth === 3)
        .map((heading) => ({ title: headingText(heading.text), slug: heading.slug }));
      return {
        title: section.title,
        slug: section.slug,
        children: children.length ? children : undefined,
      };
    };

    const exampleChildren = this.demos()
      .filter((demo) => !demo.hero())
      .map((demo) => ({ title: demo.title(), slug: demo.tocSlug() }));

    const examples: TocItem = {
      ...this.examplesMeta(),
      children: exampleChildren.length ? exampleChildren : undefined,
    };

    return [...this.sectionsBefore().map(toToc), examples, ...this.sectionsAfter().map(toToc)];
  });

  constructor() {
    injectFragmentScroll();
  }
}
