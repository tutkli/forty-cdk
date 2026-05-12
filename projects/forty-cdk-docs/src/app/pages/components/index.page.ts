import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  PRIMITIVE_REGISTRY,
  type PrimitiveEntry,
  type PrimitiveFamily,
} from '../../tokens/primitive-registry';

interface FamilyGroup {
  family: PrimitiveFamily;
  label: string;
  entries: readonly PrimitiveEntry[];
}

const FAMILY_LABELS: Record<PrimitiveFamily, string> = {
  overlay: 'Overlays & floating',
  form: 'Form controls',
  navigation: 'Navigation & composition',
  layout: 'Layout & disclosure',
  feedback: 'Feedback',
  'data-display': 'Data display',
};

const FAMILY_ORDER: readonly PrimitiveFamily[] = [
  'overlay',
  'form',
  'navigation',
  'layout',
  'feedback',
  'data-display',
];

@Component({
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="components-index__header">
      <h1>Components</h1>
      <p>
        29 headless primitives, one composable surface per WAI-ARIA pattern. Pick a primitive
        below to read its usage notes, full API reference, and accessibility contract.
      </p>
    </header>

    @for (group of groups(); track group.family) {
      <section class="components-family">
        <h2 class="components-family__title">{{ group.label }}</h2>
        <ul class="components-grid">
          @for (entry of group.entries; track entry.slug) {
            <li>
              <a class="components-card" [routerLink]="'/components/' + entry.slug">
                <div class="components-card__title">{{ entry.title }}</div>
                <p class="components-card__description">{{ entry.description }}</p>
              </a>
            </li>
          }
        </ul>
      </section>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .components-index__header {
      margin-bottom: 2.5rem;
    }
    .components-index__header h1 {
      margin: 0;
      font-size: clamp(2rem, 4vw, 2.5rem);
      letter-spacing: -0.02em;
    }
    .components-index__header p {
      max-width: 60ch;
      opacity: 0.85;
    }
    .components-family + .components-family {
      margin-top: 2rem;
    }
    .components-family__title {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      opacity: 0.65;
      margin: 0 0 0.75rem;
    }
    .components-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
      gap: 0.75rem;
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .components-card {
      display: block;
      padding: 0.9rem 1rem;
      border-radius: 8px;
      border: 1px solid var(--for-border);
      text-decoration: none;
      color: inherit;
      transition: background 120ms ease, border-color 120ms ease;
    }
    .components-card:hover {
      background: var(--for-surface-muted);
      border-color: var(--for-border-strong);
    }
    .components-card__title {
      font-weight: 600;
    }
    .components-card__description {
      margin: 0.3rem 0 0;
      opacity: 0.8;
      font-size: 0.9rem;
    }
  `,
})
export default class ComponentsIndexPage {
  protected readonly groups = computed<FamilyGroup[]>(() => {
    const byFamily = new Map<PrimitiveFamily, PrimitiveEntry[]>();
    for (const entry of PRIMITIVE_REGISTRY) {
      const bucket = byFamily.get(entry.family) ?? [];
      bucket.push(entry);
      byFamily.set(entry.family, bucket);
    }
    return FAMILY_ORDER.filter((family) => byFamily.has(family)).map((family) => ({
      family,
      label: FAMILY_LABELS[family],
      entries: byFamily.get(family) ?? [],
    }));
  });
}
