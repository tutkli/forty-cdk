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
      <article class="block">
        <nav class="mb-6 flex gap-2 text-sm text-on-surface-muted">
          <a routerLink="/components" class="text-inherit no-underline hover:underline">
            Components
          </a>
          <span aria-hidden="true">/</span>
          <span>{{ entry.title }}</span>
        </nav>
        <header>
          <h1 class="m-0 text-display-md tracking-tight">{{ entry.title }}</h1>
          <p class="my-3 max-w-[60ch] text-lg text-on-surface-muted">{{ entry.description }}</p>
          <p class="m-0 mb-8 flex items-center gap-3 text-sm text-on-surface-muted">
            <a
              [href]="entry.apgUrl"
              target="_blank"
              rel="noreferrer noopener"
              class="text-inherit"
            >
              WAI-ARIA pattern ↗
            </a>
            <span aria-hidden="true">·</span>
            <span class="capitalize">{{ entry.family }}</span>
          </p>
        </header>

        @if (entry.examples?.length) {
          <section class="mt-12 border-t border-border-soft pt-8">
            <h2 id="examples" class="mb-2 mt-0 text-2xl">Examples</h2>
            <div forTabs [(value)]="activeExample" class="mt-4">
              <div forTabsList class="mb-4 flex gap-1 border-b border-border-soft">
                @for (example of entry.examples; track example.name) {
                  <button
                    forTabsTrigger
                    [value]="example.name"
                    class="
                      -mb-px cursor-pointer border-0 border-b-2 border-transparent
                      bg-transparent px-4 py-2 font-[inherit] text-sm text-on-surface-muted
                      data-[state=active]:border-b-accent data-[state=active]:text-on-surface
                      focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2
                      focus-visible:outline-offset-2 focus-visible:outline-accent
                    "
                  >
                    {{ example.title }}
                  </button>
                }
              </div>
              @for (example of entry.examples; track example.name) {
                <div forTabsContent [value]="example.name" class="data-[state=inactive]:hidden">
                  @if (example.description) {
                    <p class="my-1 mb-3 text-sm text-on-surface-muted">{{ example.description }}</p>
                  }
                  <for-example [src]="entry.slug + '/' + example.name" />
                </div>
              }
            </div>
          </section>
        }

        @if (post$ | async; as post) {
          <section class="mt-12 border-t border-border-soft pt-8">
            <h2 id="usage" class="mb-2 mt-0 text-2xl">Usage</h2>
            <analog-markdown [content]="asString(post.content)" />
          </section>
        }

        @if (apiMetadata.value(); as metadata) {
          <section class="mt-12 border-t border-border-soft pt-8">
            <h2 id="api-reference" class="mb-2 mt-0 text-2xl">API reference</h2>
            <for-api-table [metadata]="metadata" />
          </section>
        } @else if (apiMetadata.isLoading()) {
          <p class="mt-8 text-on-surface-muted">Loading API metadata…</p>
        } @else if (apiMetadata.error()) {
          <p class="mt-8 text-danger [&_code]:docs-inline-code">
            Could not load API metadata for <code>{{ slug() }}</code>. Did you run
            <code>pnpm docs:prebuild</code>?
          </p>
        }
      </article>
    } @else {
      <section>
        <h1>Component not found</h1>
        <p class="[&_code]:docs-inline-code">
          <code>{{ slug() }}</code> is not a known primitive.
          <a routerLink="/components">Back to the components index.</a>
        </p>
      </section>
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
