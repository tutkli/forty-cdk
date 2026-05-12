import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  resource,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MarkdownComponent, injectContent } from '@analogjs/content';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ForTabs, ForTabsContent, ForTabsList, ForTabsTrigger } from 'forty-cdk';
import { map } from 'rxjs/operators';

import { ForApiTable } from '../../components/for-api-table';
import { ForExample } from '../../components/for-example';
import type { PrimitiveMetadata } from '../../tokens/api-metadata-types';
import { PRIMITIVE_BY_SLUG } from '../../tokens/primitive-registry';

interface PrimitiveFrontmatter {
  title?: string;
  slug?: string;
  source?: string;
}

const apiMetadataLoaders = import.meta.glob<{ default: PrimitiveMetadata }>(
  '../../../api-metadata/*.json',
);

@Component({
  imports: [
    AsyncPipe,
    MarkdownComponent,
    ForApiTable,
    ForExample,
    ForTabs,
    ForTabsList,
    ForTabsTrigger,
    ForTabsContent,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (registryEntry(); as entry) {
      <article class="primitive-page">
        <nav class="primitive-page__crumbs">
          <a routerLink="/components">Components</a>
          <span aria-hidden="true">/</span>
          <span>{{ entry.title }}</span>
        </nav>
        <header class="primitive-page__header">
          <h1 class="primitive-page__title">{{ entry.title }}</h1>
          <p class="primitive-page__lede">{{ entry.description }}</p>
          <p class="primitive-page__meta">
            <a [href]="entry.apgUrl" target="_blank" rel="noreferrer noopener">
              WAI-ARIA pattern ↗
            </a>
            <span aria-hidden="true">·</span>
            <span class="primitive-page__family">{{ entry.family }}</span>
          </p>
        </header>

        @if (entry.examples?.length) {
          <section class="primitive-page__examples">
            <h2>Examples</h2>
            <div forTabs [(value)]="activeExample" class="examples-tabs">
              <div forTabsList class="examples-tabs__list">
                @for (example of entry.examples; track example.name) {
                  <button forTabsTrigger [value]="example.name">{{ example.title }}</button>
                }
              </div>
              @for (example of entry.examples; track example.name) {
                <div
                  forTabsContent
                  [value]="example.name"
                  class="examples-tabs__panel"
                >
                  @if (example.description) {
                    <p class="primitive-page__example-desc">{{ example.description }}</p>
                  }
                  <for-example [src]="entry.slug + '/' + example.name" />
                </div>
              }
            </div>
          </section>
        }

        @if (post$ | async; as post) {
          <section class="primitive-page__usage">
            <h2>Usage</h2>
            <analog-markdown [content]="asString(post.content)" />
          </section>
        }

        @if (apiMetadata.value(); as metadata) {
          <section class="primitive-page__api">
            <h2>API reference</h2>
            <for-api-table [metadata]="metadata" />
          </section>
        } @else if (apiMetadata.isLoading()) {
          <p class="primitive-page__loading">Loading API metadata…</p>
        } @else if (apiMetadata.error()) {
          <p class="primitive-page__error">
            Could not load API metadata for <code>{{ slug() }}</code>. Did you run
            <code>pnpm docs:prebuild</code>?
          </p>
        }
      </article>
    } @else {
      <section class="primitive-page__not-found">
        <h1>Component not found</h1>
        <p>
          <code>{{ slug() }}</code> is not a known primitive.
          <a routerLink="/components">Back to the components index.</a>
        </p>
      </section>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .primitive-page__crumbs {
      display: flex;
      gap: 0.5rem;
      font-size: 0.85rem;
      opacity: 0.7;
      margin-bottom: 1.5rem;
    }
    .primitive-page__crumbs a {
      color: inherit;
      text-decoration: none;
    }
    .primitive-page__crumbs a:hover {
      text-decoration: underline;
    }
    .primitive-page__title {
      margin: 0;
      font-size: clamp(2rem, 4vw, 2.75rem);
      letter-spacing: -0.02em;
    }
    .primitive-page__lede {
      font-size: 1.1rem;
      opacity: 0.85;
      max-width: 60ch;
      margin: 0.75rem 0;
    }
    .primitive-page__meta {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      font-size: 0.9rem;
      opacity: 0.75;
      margin: 0 0 2rem;
    }
    .primitive-page__meta a {
      color: inherit;
    }
    .primitive-page__family {
      text-transform: capitalize;
    }
    .primitive-page__api,
    .primitive-page__examples,
    .primitive-page__usage {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid var(--for-border);
    }
    .primitive-page__api h2,
    .primitive-page__examples h2,
    .primitive-page__usage h2 {
      font-size: 1.5rem;
      margin: 0 0 0.5rem;
    }
    .examples-tabs {
      margin-top: 1rem;
    }
    .examples-tabs__list {
      display: flex;
      gap: 0.25rem;
      border-bottom: 1px solid var(--for-border);
      margin-bottom: 1rem;
    }
    .examples-tabs__list [forTabsTrigger] {
      padding: 0.5rem 1rem;
      font: inherit;
      font-size: 0.9rem;
      background: transparent;
      border: none;
      color: inherit;
      opacity: 0.65;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
    }
    .examples-tabs__list [forTabsTrigger][data-state='active'] {
      opacity: 1;
      border-bottom-color: var(--for-accent);
    }
    .examples-tabs__list [forTabsTrigger]:focus-visible {
      outline: 2px solid var(--for-accent);
      outline-offset: 2px;
      border-radius: 4px;
    }
    .examples-tabs__panel[data-state='inactive'] {
      display: none;
    }
    .primitive-page__example-desc {
      margin: 0.25rem 0 0.75rem;
      opacity: 0.75;
      font-size: 0.9rem;
    }
    .primitive-page__loading,
    .primitive-page__error {
      opacity: 0.7;
      margin-top: 2rem;
    }
    .primitive-page__error {
      color: var(--for-danger);
    }
  `,
})
export default class PrimitivePage {
  readonly #route = inject(ActivatedRoute);

  readonly slug = toSignal(this.#route.paramMap.pipe(map((params) => params.get('slug') ?? '')), {
    initialValue: '',
  });

  readonly registryEntry = computed(() => PRIMITIVE_BY_SLUG[this.slug()] ?? null);

  /**
   * Selected example tab. Reset to the first example whenever the slug
   * changes (so navigating between primitives starts on the first example);
   * stays user-mutable between transitions.
   */
  protected readonly activeExample = linkedSignal<string>(
    () => this.registryEntry()?.examples?.[0]?.name ?? '',
  );

  readonly post$ = injectContent<PrimitiveFrontmatter>({
    param: 'slug',
    subdirectory: 'component-readmes',
  });

  readonly apiMetadata = resource<PrimitiveMetadata | null, string>({
    params: () => this.slug(),
    loader: async ({ params: slug }) => {
      if (!slug) return null;
      const key = `../../../api-metadata/${slug}.json`;
      const loader = apiMetadataLoaders[key];
      if (!loader) return null;
      const mod = await loader();
      return mod.default;
    },
  });

  protected asString(content: string | object | undefined): string {
    return typeof content === 'string' ? content : '';
  }
}
