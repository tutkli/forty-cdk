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

import { injectDocBase } from '../doc/doc-base';
import { injectFragmentScroll } from '../doc/doc-fragment';
import { DocLinks } from '../doc/doc-links';
import type { DocPage, DocPageSection } from '../doc/doc-model';
import { DocSection } from '../doc/doc-section';
import { DocToc } from '../doc/doc-toc';
import { buildTocItems, type TocEntry, type TocSection } from '../doc/doc-toc-rail';
import { groupLabelBySlug, primitiveBySlug } from '../primitives';
import { DemoLayout } from './demo-layout';
import { Icon } from './icon';

@Component({
  selector: 'primitive-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocSection, DocToc, DocLinks, RouterLink, Icon],
  template: `
    <header class="head">
      <p class="pg-doc-eyebrow">{{ group() }}</p>
      <h1 class="pg-doc-title">{{ meta().title }}</h1>
      <p class="pg-doc-lede">{{ meta().description }}</p>

      <div class="meta">
        <code class="entry">forty-cdk/{{ slug() }}</code>
        @if (meta().apgUrl; as apgUrl) {
          <a class="apg" [href]="apgUrl" target="_blank" rel="noreferrer noopener">
            WAI-ARIA APG
            <app-icon name="arrow-up-right" />
          </a>
        }
      </div>
    </header>

    <div class="layout">
      <div class="main" docLinks>
        <ng-content select="[hero]" />

        @if (introHtml(); as intro) {
          <div class="pg-doc-prose pg-doc-intro" [innerHTML]="intro"></div>
        }

        @for (section of sectionsBefore(); track section.slug) {
          <doc-section [section]="section" />
        }

        @if (examplesMeta(); as examples) {
          <section class="pg-doc-section" [id]="examples.slug">
            <h2 class="pg-doc-h2">
              {{ examples.title }}
              <a
                class="pg-doc-anchor"
                [routerLink]="[]"
                [fragment]="examples.slug"
                [attr.aria-label]="examples.title + ' permalink'"
              >
                <app-icon name="link" />
              </a>
            </h2>
            <div class="examples">
              <ng-content />
            </div>
          </section>
        }

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
      max-width: 1180px;
      margin: 0 auto 2.75rem;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.6rem;
      margin-top: 1.4rem;
    }

    .entry {
      font-family: var(--pg-font-mono);
      font-size: 0.78rem;
      padding: 0.35rem 0.65rem;
      border-radius: var(--pg-radius-xs);
      background: var(--pg-surface-2);
      border: 1px solid var(--pg-border);
      color: var(--pg-text);
    }

    .apg {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.65rem;
      border-radius: var(--pg-radius-xs);
      font-size: 0.84rem;
      font-weight: 700;
      white-space: nowrap;
      color: var(--pg-primary);
      background: color-mix(in srgb, var(--pg-primary) 12%, transparent);
      text-decoration: none;
    }

    .apg:hover {
      background: color-mix(in srgb, var(--pg-primary) 20%, transparent);
    }

    .apg app-icon {
      width: 12px;
      height: 12px;
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
        margin-bottom: 2rem;
      }

      .meta {
        margin-top: 1.1rem;
      }

      .examples {
        gap: 2rem;
      }
    }
  `,
})
export class PrimitivePage {
  readonly #sanitizer = inject(DomSanitizer);
  readonly #base = injectDocBase();

  readonly slug = input.required<string>();
  readonly doc = input.required<DocPage>();

  protected readonly demos = contentChildren(DemoLayout);

  protected readonly meta = computed(() => primitiveBySlug(this.slug()));
  protected readonly group = computed(() => groupLabelBySlug(this.slug()));

  protected readonly introHtml = computed(() => {
    const intro = this.doc()
      .intro.map((block) => this.#base(block.html))
      .join('');
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

  /**
   * The heading the live demos render under, or `null` for a page that has
   * neither — `forty-cdk/shared` publishes contracts and types, and an empty
   * "Examples" would be a section the reader is invited into for nothing
   * ([#1809](https://github.com/tutkli/forty-cdk/issues/1809)).
   */
  protected readonly examplesMeta = computed(() => {
    const index = this.#examplesIndex();
    if (index < 0) {
      return this.demos().length > 0 ? { title: 'Examples', slug: 'examples' } : null;
    }
    const section = this.#sections()[index]!;
    return { title: section.title, slug: section.slug };
  });

  protected readonly tocItems = computed<readonly TocEntry[]>(() => {
    const toToc = (section: DocPageSection): TocSection => {
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
    };

    const meta = this.examplesMeta();
    const before = this.sectionsBefore().map(toToc);
    const after = this.sectionsAfter().map(toToc);
    const group = this.doc().behaviorGroup;
    if (meta === null) {
      return buildTocItems([...before, ...after], group);
    }

    const exampleChildren = this.demos()
      .filter((demo) => !demo.hero())
      .map((demo) => ({ title: demo.title(), slug: demo.tocSlug() }));

    const examples: TocSection = {
      ring: 'canonical',
      item: { ...meta, children: exampleChildren.length ? exampleChildren : undefined },
    };

    return buildTocItems([...before, examples, ...after], group);
  });

  constructor() {
    injectFragmentScroll();
  }
}
