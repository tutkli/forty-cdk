import { Injectable, signal, type Signal } from '@angular/core';

import type { DocPageExample } from './doc-model';

/**
 * The `###` headings a page's document declares under `## Examples`, as the
 * demos below the hero read them
 * ([#1940](https://github.com/tutkli/forty-cdk/issues/1940)).
 *
 * A demo names the heading it belongs to and nothing else: its title and the
 * sentence under it are documentation, written in the README and compiled with
 * the rest of the page. `PrimitivePage` provides this and connects it to its
 * own `doc` input, which is what keeps the two in one place — a page file names
 * a slug, and there is no second copy of the prose for it to drift from.
 */
@Injectable()
export class DemoHeadings {
  readonly #declared = signal<Signal<readonly DocPageExample[]> | null>(null);

  /** Binds the headings to the document the page is rendering. */
  connect(examples: Signal<readonly DocPageExample[]>): void {
    this.#declared.set(examples);
  }

  /** The heading of that slug, or `null` when the document declares none. */
  bySlug(slug: string): DocPageExample | null {
    return this.#declared()?.().find((example) => example.slug === slug) ?? null;
  }
}
