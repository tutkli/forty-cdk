import { ChangeDetectionStrategy, Component, computed, linkedSignal, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  ForAccordion,
  ForAccordionContent,
  ForAccordionItem,
  ForAccordionTrigger,
} from 'forty-cdk';

import {
  PRIMITIVE_REGISTRY,
  type PrimitiveEntry,
  type PrimitiveFamily,
} from '../tokens/primitive-registry';

interface DocsLink {
  readonly title: string;
  readonly route: string;
}

interface FamilySection {
  readonly family: PrimitiveFamily;
  readonly label: string;
  readonly primitives: readonly PrimitiveEntry[];
}

const DOCS_LINKS: readonly DocsLink[] = [
  { title: 'Getting started', route: '/docs/getting-started' },
];

const FAMILY_ORDER: readonly PrimitiveFamily[] = [
  'overlay',
  'form',
  'navigation',
  'layout',
  'feedback',
  'data-display',
];

const FAMILY_LABELS: Record<PrimitiveFamily, string> = {
  overlay: 'Overlays',
  form: 'Forms',
  navigation: 'Navigation',
  layout: 'Layout',
  feedback: 'Feedback',
  'data-display': 'Data display',
};

@Component({
  selector: 'for-docs-nav-sidebar',
  imports: [
    RouterLink,
    RouterLinkActive,
    ForAccordion,
    ForAccordionItem,
    ForAccordionTrigger,
    ForAccordionContent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="docs-nav" aria-label="Documentation">
      <section class="docs-nav__section">
        <h3 class="docs-nav__heading">Guides</h3>
        <ul class="docs-nav__list">
          @for (link of docsLinks; track link.route) {
            <li>
              <a
                [routerLink]="link.route"
                routerLinkActive="is-active"
                [routerLinkActiveOptions]="{ exact: true }"
                (click)="navigate.emit()"
              >
                {{ link.title }}
              </a>
            </li>
          }
        </ul>
      </section>

      <section class="docs-nav__section">
        <h3 class="docs-nav__heading">
          <a routerLink="/components" (click)="navigate.emit()">Components</a>
        </h3>
      </section>

      <div forAccordion multiple [(value)]="openSections" class="docs-nav__accordion">
        @for (section of sections(); track section.family) {
          <section
            forAccordionItem
            [value]="section.family"
            class="docs-nav__accordion-item"
          >
            <h4 class="docs-nav__subheading">
              <button type="button" forAccordionTrigger class="docs-nav__subheading-trigger">
                <svg
                  class="docs-nav__chevron"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                <span>{{ section.label }}</span>
              </button>
            </h4>
            <div forAccordionContent class="docs-nav__accordion-content">
              <ul class="docs-nav__list">
                @for (primitive of section.primitives; track primitive.slug) {
                  <li>
                    <a
                      [routerLink]="['/components', primitive.slug]"
                      routerLinkActive="is-active"
                      (click)="navigate.emit()"
                    >
                      {{ primitive.title }}
                    </a>
                  </li>
                }
              </ul>
            </div>
          </section>
        }
      </div>
    </nav>
  `,
  styles: `
    :host {
      display: block;
    }
    .docs-nav {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      font-size: 0.875rem;
    }
    .docs-nav__section {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .docs-nav__heading {
      margin: 0;
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--for-on-surface-muted);
    }
    .docs-nav__heading a {
      color: inherit;
      text-decoration: none;
    }
    .docs-nav__heading a:hover {
      color: var(--for-on-surface);
    }
    .docs-nav__subheading {
      margin: 0;
      font-size: 0.72rem;
      font-weight: 600;
    }
    .docs-nav__subheading-trigger {
      all: unset;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      width: 100%;
      padding: 0.3rem 0.6rem;
      border-radius: var(--for-radius-sm);
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--for-on-surface-muted);
      opacity: 0.85;
      font: inherit;
      font-size: 0.72rem;
      font-weight: 600;
    }
    .docs-nav__subheading-trigger:hover {
      background: var(--for-surface-muted);
      color: var(--for-on-surface);
    }
    .docs-nav__subheading-trigger:focus-visible {
      outline: 2px solid var(--for-accent);
      outline-offset: 1px;
    }
    .docs-nav__chevron {
      transition: transform 160ms ease;
      opacity: 0.7;
    }
    .docs-nav__subheading-trigger[data-state='closed'] .docs-nav__chevron {
      transform: rotate(-90deg);
    }
    .docs-nav__accordion {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .docs-nav__accordion-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .docs-nav__accordion-content[data-state='closed'] {
      display: none;
    }
    .docs-nav__accordion-content {
      padding-left: 0.4rem;
    }
    .docs-nav__list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.05rem;
    }
    .docs-nav__list a {
      display: block;
      padding: 0.3rem 0.6rem;
      border-radius: var(--for-radius-sm);
      color: var(--for-on-surface-muted);
      text-decoration: none;
      line-height: 1.4;
      transition: background 0.12s ease, color 0.12s ease;
    }
    .docs-nav__list a:hover {
      color: var(--for-on-surface);
      background: var(--for-surface-muted);
      text-decoration: none;
    }
    .docs-nav__list a.is-active {
      color: var(--for-accent);
      background: var(--for-accent-soft);
      font-weight: 600;
    }
  `,
})
export class NavSidebar {
  readonly navigate = output<void>();

  protected readonly docsLinks = DOCS_LINKS;

  protected readonly sections = computed<readonly FamilySection[]>(() =>
    FAMILY_ORDER.map((family) => ({
      family,
      label: FAMILY_LABELS[family],
      primitives: PRIMITIVE_REGISTRY.filter((p) => p.family === family),
    })).filter((s) => s.primitives.length > 0),
  );

  /**
   * Open accordion sections. Defaults to every family expanded so first-time
   * visitors see the full nav; user can collapse families they don't care
   * about and the choice persists for the lifetime of this component.
   */
  protected readonly openSections = linkedSignal<readonly string[]>(() =>
    this.sections().map((s) => s.family),
  );
}
