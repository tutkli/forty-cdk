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
    <nav class="flex flex-col gap-6 text-sm" aria-label="Documentation">
      <section class="flex flex-col gap-1.5">
        <h3 class="docs-eyebrow">Guides</h3>
        <ul class="m-0 flex list-none flex-col gap-px p-0">
          @for (link of docsLinks; track link.route) {
            <li>
              <a
                [routerLink]="link.route"
                routerLinkActive="is-active"
                [routerLinkActiveOptions]="{ exact: true }"
                (click)="navigate.emit()"
                class="docs-nav-link"
              >
                {{ link.title }}
              </a>
            </li>
          }
        </ul>
      </section>

      <section class="flex flex-col gap-1.5">
        <h3 class="docs-eyebrow">
          <a
            routerLink="/components"
            (click)="navigate.emit()"
            class="text-inherit no-underline hover:text-on-surface"
          >
            Components
          </a>
        </h3>
      </section>

      <div forAccordion multiple [(value)]="openSections" class="flex flex-col gap-2">
        @for (section of sections(); track section.family) {
          <section forAccordionItem [value]="section.family" class="flex flex-col gap-1">
            <h4 class="m-0">
              <button
                type="button"
                forAccordionTrigger
                class="
                  docs-eyebrow group flex w-full cursor-pointer items-center
                  gap-1.5 rounded-sm border-0 bg-transparent px-2.5 py-1.5
                  font-[inherit] text-left
                  hover:bg-surface-muted hover:text-on-surface
                  focus-visible:outline-2 focus-visible:outline-offset-1
                  focus-visible:outline-accent
                "
              >
                <svg
                  class="
                    text-on-surface-subtle transition-transform duration-200 ease-out
                    group-data-[state=closed]:-rotate-90
                  "
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
            <div forAccordionContent class="pl-1.5 data-[state=closed]:hidden">
              <ul class="m-0 flex list-none flex-col gap-px p-0">
                @for (primitive of section.primitives; track primitive.slug) {
                  <li>
                    <a
                      [routerLink]="['/components', primitive.slug]"
                      routerLinkActive="is-active"
                      (click)="navigate.emit()"
                      class="docs-nav-link"
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
