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
    <header class="mb-10">
      <h1 class="m-0 text-[clamp(2rem,4vw,2.5rem)] tracking-tight">Components</h1>
      <p class="max-w-[60ch] opacity-85">
        29 headless primitives, one composable surface per WAI-ARIA pattern. Pick a primitive below
        to read its usage notes, full API reference, and accessibility contract.
      </p>
    </header>

    @for (group of groups(); track group.family) {
      <section class="[&_+_section]:mt-8">
        <h2
          class="
            mb-3 mt-0 text-[0.85rem] uppercase tracking-[0.08em]
            opacity-65
          "
        >
          {{ group.label }}
        </h2>
        <ul
          class="
            m-0 grid list-none gap-3 p-0
            grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))]
          "
        >
          @for (entry of group.entries; track entry.slug) {
            <li>
              <a
                [routerLink]="'/components/' + entry.slug"
                class="
                  block rounded-lg border border-border-soft px-4 py-3.5
                  text-inherit no-underline
                  transition-colors duration-100
                  hover:border-border-strong hover:bg-surface-muted
                "
              >
                <div class="font-semibold">{{ entry.title }}</div>
                <p class="m-0 mt-1.5 text-[0.9rem] opacity-80">{{ entry.description }}</p>
              </a>
            </li>
          }
        </ul>
      </section>
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
