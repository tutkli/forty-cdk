import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForListbox,
  ForListboxGroup,
  ForListboxGroupLabel,
  ForListboxOption,
  ForListboxOptionIndicator,
} from 'forty-cdk';

import { DemoLayout } from '../../../ui/demo-layout';
import { Icon } from '../../../ui/icon';

interface Section {
  readonly label: string;
  readonly options: readonly { value: string; label: string; disabled?: boolean }[];
}

@Component({
  selector: 'app-listbox-groups-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForListbox,
    ForListboxGroup,
    ForListboxGroupLabel,
    ForListboxOption,
    ForListboxOptionIndicator,
    Icon,
  ],
  template: `
    <playground-demo
      title="Option groups"
      subtitle="forListboxGroup wraps a set of options in a role=group with its label wired through aria-labelledby by forListboxGroupLabel. Grouping is purely advisory: options still register flatly with the listbox, so arrow navigation, Home/End, and typeahead traverse across group boundaries in DOM order without any extra handling."
      sourcePath="projects/forty-cdk-playground/src/app/demos/listbox/examples/groups.example.ts"
    >
      <div demo class="listbox-demo">
        <ul forListbox multiple class="pg-listbox" [(value)]="value" aria-label="Timezone">
          @for (section of sections; track section.label) {
            <li forListboxGroup class="group">
              <span forListboxGroupLabel class="group-label">{{ section.label }}</span>
              <ul class="group-options">
                @for (opt of section.options; track opt.value) {
                  <li>
                    <button
                      type="button"
                      forListboxOption
                      class="pg-listbox-option"
                      [value]="opt.value"
                      [disabled]="opt.disabled ?? false"
                    >
                      {{ opt.label }}
                      <span forListboxOptionIndicator class="pg-listbox-indicator">
                        <app-icon name="check" />
                      </span>
                    </button>
                  </li>
                }
              </ul>
            </li>
          }
        </ul>
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">
          value: <b>{{ value().join(', ') || '—' }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .listbox-demo {
      display: flex;
      justify-content: center;
      padding: 1.5rem 0;
      width: 100%;
    }

    .group {
      display: contents;
    }

    .group-label {
      display: block;
      padding: 0.4rem 0.65rem 0.2rem;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--pg-text-muted);
    }

    .group-options {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin: 0 0 0.35rem;
      padding: 0;
      list-style: none;
    }

    .group-options > li {
      display: contents;
    }
  `,
})
export class ListboxGroupsExample {
  protected readonly sections: readonly Section[] = [
    {
      label: 'Americas',
      options: [
        { value: 'pst', label: 'Pacific (PST)' },
        { value: 'est', label: 'Eastern (EST)' },
        { value: 'art', label: 'Buenos Aires (ART)' },
      ],
    },
    {
      label: 'Europe',
      options: [
        { value: 'gmt', label: 'London (GMT)' },
        { value: 'cet', label: 'Central Europe (CET)' },
        { value: 'msk', label: 'Moscow (MSK)', disabled: true },
      ],
    },
    {
      label: 'Asia / Pacific',
      options: [
        { value: 'ist', label: 'India (IST)' },
        { value: 'jst', label: 'Tokyo (JST)' },
        { value: 'aest', label: 'Sydney (AEST)' },
      ],
    },
  ];

  protected readonly value = signal<readonly string[]>([]);
}
