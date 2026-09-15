import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { DocPageRelated } from './doc-model';

/** One run of entries the navigation lists under the same heading. */
interface RelatedGroup {
  readonly label: string;
  readonly entries: readonly DocPageRelated[];
}

/**
 * The pages a reader who finished this one can go to next
 * ([#1938](https://github.com/tutkli/forty-cdk/issues/1938)).
 *
 * Nothing here is authored beside the document: the entries are the pages it
 * links and the pages that link it, resolved when the corpus was compiled. A
 * document with neither renders no block at all, which is why the whole element
 * is behind the guard rather than only its list.
 *
 * Entries arrive in navigation order, so grouping is a scan for runs rather
 * than a sort — the block reads the way the rail beside it does, and a group
 * cannot appear twice.
 */
@Component({
  selector: 'doc-related',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    @if (groups().length > 0) {
      <nav class="related" aria-labelledby="pg-related-heading">
        <h2 class="pg-doc-h2" id="pg-related-heading">Related</h2>
        @for (group of groups(); track group.label) {
          <h3 class="group">{{ group.label }}</h3>
          <ul class="grid">
            @for (entry of group.entries; track entry.route) {
              <li>
                <a class="card" [routerLink]="entry.route">
                  <span class="title">{{ entry.title }}</span>
                  <span class="description">{{ entry.description }}</span>
                </a>
              </li>
            }
          </ul>
        }
      </nav>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .related {
      margin-top: 3.25rem;
      padding-top: 2.5rem;
      border-top: 1px solid var(--pg-border);
    }

    .group {
      margin: 1.6rem 0 0.8rem;
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--pg-text-muted);
    }

    .group:first-of-type {
      margin-top: 0;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 0.6rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .card {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      height: 100%;
      padding: 0.85rem 1rem;
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-xs);
      background: var(--pg-surface);
      text-decoration: none;
    }

    .card:hover {
      border-color: var(--pg-primary);
      background: var(--pg-surface-2);
    }

    .title {
      font-weight: 700;
      color: var(--pg-text);
    }

    .description {
      display: -webkit-box;
      overflow: hidden;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      font-size: 0.85rem;
      line-height: 1.45;
      color: var(--pg-text-muted);
    }

    @media (max-width: 820px) {
      .related {
        margin-top: 2.5rem;
        padding-top: 2rem;
      }
    }
  `,
})
export class DocRelated {
  readonly entries = input.required<readonly DocPageRelated[]>();

  protected readonly groups = computed<readonly RelatedGroup[]>(() => {
    const groups: { label: string; entries: DocPageRelated[] }[] = [];
    for (const entry of this.entries()) {
      const run = groups.at(-1);
      if (run?.label === entry.group) {
        run.entries.push(entry);
      } else {
        groups.push({ label: entry.group, entries: [entry] });
      }
    }
    return groups;
  });
}
