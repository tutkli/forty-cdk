import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  inject,
  input,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { skip } from 'rxjs';

import { DocSection } from '../doc/doc-section';
import { DocToc, type TocItem } from '../doc/doc-toc';
import { type DocSectionData, parseReadme, stripText } from '../doc/markdown';
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
  imports: [DocSection, DocToc, RouterLink, Icon],
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
        <ng-content select="[hero]" />

        @if (introHtml(); as intro) {
          <div class="pg-doc-prose pg-doc-intro" [innerHTML]="intro"></div>
        }

        @for (section of sectionsBefore(); track section.slug) {
          <doc-section [section]="section" />
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
  readonly #document = inject(DOCUMENT);
  readonly #route = inject(ActivatedRoute);

  readonly slug = input.required<string>();
  readonly readme = input.required<string>();

  protected readonly demos = contentChildren(DemoLayout);

  protected readonly meta = computed(() => primitiveBySlug(this.slug()));

  readonly #parsed = computed(() => parseReadme(this.readme()));

  protected readonly introHtml = computed(() => {
    const intro = stripLeadingDescription(this.#parsed().intro, this.meta().description);
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
    const section = this.#sections()[index]!;
    return { title: section.title, slug: section.slug };
  });

  protected readonly tocItems = computed<readonly TocItem[]>(() => {
    const toToc = (section: DocSectionData): TocItem => ({
      title: section.title,
      slug: section.slug,
      children: section.subsections.length
        ? section.subsections.map((sub) => ({ title: sub.title, slug: sub.slug }))
        : undefined,
    });

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
    afterNextRender(() => {
      const hash = decodeURIComponent(
        (this.#document.defaultView?.location.hash ?? '').replace(/^#/, ''),
      );
      if (!hash) {
        return;
      }
      this.#document.getElementById(hash)?.scrollIntoView();
    });

    this.#route.fragment.pipe(skip(1), takeUntilDestroyed()).subscribe((fragment) => {
      if (fragment) {
        this.#document.getElementById(fragment)?.scrollIntoView();
      }
    });
  }
}
