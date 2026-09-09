import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  output,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { GUIDE_INDEX } from '../doc/guides';
import { SITE_PAGE_INDEX } from '../doc/site-pages';
import { DOCS_GROUPS } from '../primitives';
import { Icon } from './icon';
import { SiteChrome } from './site-chrome';
import { SITE_SECTIONS, type SiteSectionId } from './site-sections';

interface RailEntry {
  readonly title: string;
  readonly path: string;
}

interface RailGroup {
  readonly label: string;
  readonly entries: readonly RailEntry[];
}

const DOCS_RAIL: readonly RailGroup[] = [
  {
    label: 'Introduction',
    entries: [
      ...SITE_PAGE_INDEX.map((page) => ({ title: page.title, path: `/${page.slug}` })),
      { title: 'Error codes', path: '/errors' },
    ],
  },
  ...DOCS_GROUPS.map((group) => ({
    label: group.label,
    entries: group.primitives.map((item) => ({ title: item.title, path: `/${item.slug}` })),
  })),
];

const GUIDES_RAIL: readonly RailGroup[] = GUIDE_INDEX.map((group) => ({
  label: group.label,
  entries: group.guides.map((guide) => ({ title: guide.title, path: `/guides/${guide.slug}` })),
}));

const DOCS_RAIL_SIZE = DOCS_RAIL.reduce((count, group) => count + group.entries.length, 0);

@Component({
  selector: 'app-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, Icon],
  template: `
    <nav class="nav" [attr.aria-label]="label()">
      @if (docs()) {
        <div class="filter">
          <div class="filter-field">
            <app-icon name="magnifying-glass" class="filter-icon" />
            <input
              #field
              type="search"
              class="filter-input"
              placeholder="Filter {{ railSize }} pages"
              aria-label="Filter the documentation"
              [value]="query()"
              (input)="query.set(field.value)"
            />
            @if (query()) {
              <button
                type="button"
                class="filter-clear"
                (click)="query.set('')"
                aria-label="Clear the filter"
              >
                <app-icon name="x-mark" />
              </button>
            }
          </div>
          @if (query()) {
            <p class="filter-count">{{ matchCount() }} of {{ railSize }}</p>
          }
        </div>
      } @else {
        <ul class="nav-list">
          <li>
            <a
              [routerLink]="allGuides"
              routerLinkActive="active"
              [routerLinkActiveOptions]="exactMatch"
              class="pg-nav-link"
              (click)="navigate.emit()"
            >
              All guides
            </a>
          </li>
        </ul>
      }

      @for (group of groups(); track group.label) {
        <div class="nav-group">
          <h2 class="nav-group-heading">{{ group.label }}</h2>
          <ul class="nav-list">
            @for (entry of group.entries; track entry.path) {
              <li>
                <a
                  [routerLink]="entry.path"
                  routerLinkActive="active"
                  class="pg-nav-link"
                  (click)="navigate.emit()"
                >
                  {{ entry.title }}
                </a>
              </li>
            }
          </ul>
        </div>
      }

      @if (query() && groups().length === 0) {
        <p class="filter-empty">Nothing here is called that.</p>
      }
    </nav>
  `,
  styles: `
    .nav-list + .nav-group {
      margin-top: 0.85rem;
    }

    .filter {
      position: sticky;
      top: 0;
      z-index: 1;
      padding-bottom: 0.5rem;
      background: var(--pg-surface);
    }

    .filter-field {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      height: 36px;
      padding: 0 0.35rem 0 0.6rem;
      background: var(--pg-surface-2);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
    }

    .filter-field:focus-within {
      border-color: var(--pg-border-strong);
      background: var(--pg-surface);
    }

    .filter-icon {
      flex: none;
      width: 15px;
      height: 15px;
      color: var(--pg-text-muted);
    }

    .filter-input {
      flex: 1;
      min-width: 0;
      border: 0;
      background: none;
      font: inherit;
      font-size: 0.85rem;
      color: var(--pg-text);
      outline: none;
    }

    .filter-input::placeholder {
      color: var(--pg-text-muted);
    }

    .filter-input::-webkit-search-cancel-button {
      display: none;
    }

    .filter-clear {
      display: grid;
      place-items: center;
      flex: none;
      width: 26px;
      height: 26px;
      border: 0;
      border-radius: var(--pg-radius-xs);
      background: none;
      color: var(--pg-text-muted);
      cursor: pointer;
    }

    .filter-clear:hover {
      background: var(--pg-surface-2);
      color: var(--pg-text);
    }

    .filter-clear app-icon {
      width: 14px;
      height: 14px;
    }

    .filter-count {
      margin: 0.4rem 0 0;
      padding: 0 0.75rem;
      font-family: var(--pg-font-mono);
      font-size: 0.72rem;
      color: var(--pg-text-muted);
    }

    .filter-empty {
      margin: 0.75rem 0 0;
      padding: 0 0.75rem;
      font-size: 0.85rem;
      color: var(--pg-text-muted);
    }
  `,
})
export class AppNav {
  protected readonly chrome = inject(SiteChrome);

  protected readonly railSize = DOCS_RAIL_SIZE;
  protected readonly allGuides = '/guides';
  protected readonly exactMatch = { exact: true };

  protected readonly docs = computed(() => this.chrome.section() === 'docs');

  protected readonly query = linkedSignal<SiteSectionId, string>({
    source: () => this.chrome.section(),
    computation: () => '',
  });

  protected readonly label = computed(
    () => SITE_SECTIONS.find((section) => section.id === this.chrome.section())?.label ?? 'Docs',
  );

  protected readonly groups = computed<readonly RailGroup[]>(() => {
    if (!this.docs()) {
      return GUIDES_RAIL;
    }
    const needle = this.query().trim().toLowerCase();
    if (!needle) {
      return DOCS_RAIL;
    }
    const slug = needle.replace(/\s+/g, '-');
    return DOCS_RAIL.map((group) => ({
      label: group.label,
      entries: group.entries.filter(
        (entry) => entry.title.toLowerCase().includes(needle) || entry.path.includes(slug),
      ),
    })).filter((group) => group.entries.length > 0);
  });

  protected readonly matchCount = computed(() =>
    this.groups().reduce((count, group) => count + group.entries.length, 0),
  );

  readonly navigate = output<void>();
}
