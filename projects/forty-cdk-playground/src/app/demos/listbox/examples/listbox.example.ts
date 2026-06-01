import { ChangeDetectionStrategy, Component, linkedSignal, signal } from '@angular/core';
import { ForListbox, ForListboxOption, ForListboxOptionIndicator } from 'forty-cdk';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';
import { Icon } from '../../../ui/icon';

@Component({
  selector: 'app-listbox-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForListbox,
    ForListboxOption,
    ForListboxOptionIndicator,
    ControlSelect,
    ControlSwitch,
    Icon,
  ],
  template: `
    <playground-demo
      title="Single & multiple select"
      subtitle="An inline, roving-tabindex listbox (no popup) implementing the APG Listbox pattern with single and multiple select. Tab moves focus into the list; arrows roam and wrap, Home/End jump to the ends, typeahead matches visible text. Multiple mode adds the APG range model: Shift+Arrow extends the selection, Shift+Space fills a range, Ctrl+A toggles all. The trailing checkmark indicator self-hides while an option is unselected."
      sourcePath="projects/forty-cdk-playground/src/app/demos/listbox/examples/listbox.example.ts"
    >
      <div demo class="listbox-demo">
        <ul
          forListbox
          class="pg-listbox"
          [(value)]="value"
          [multiple]="multiple()"
          [orientation]="orientation()"
          [selectionFollowsFocus]="selectionFollowsFocus()"
          [disabled]="disabled()"
          aria-label="Languages"
        >
          @for (opt of options; track opt.value) {
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
      </div>

      <div controls class="pg-controls">
        <app-control-switch label="multiple" [(checked)]="multiple" />
        <app-control-select
          label="orientation"
          hint="Which axis the arrow keys follow: vertical uses Up/Down, horizontal uses Left/Right. It also sets data-orientation on the list for styling."
          [options]="orientationOptions"
          [(value)]="orientation"
        />
        <app-control-switch
          label="selectionFollowsFocus"
          hint="Single mode only: arrow navigation also selects the focused option, not just highlights it. APG recommends caution — leave off unless the UX truly benefits."
          [(checked)]="selectionFollowsFocus"
          [disabled]="multiple()"
        />
        <app-control-switch label="disabled" [(checked)]="disabled" />

        <p class="pg-hint">
          Multiple mode: Shift+Arrow extends, Shift+Space fills a range, Ctrl+A toggles all.
        </p>
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
  `,
})
export class ListboxExample {
  protected readonly options: readonly { value: string; label: string; disabled?: boolean }[] = [
    { value: 'ts', label: 'TypeScript' },
    { value: 'js', label: 'JavaScript' },
    { value: 'py', label: 'Python' },
    { value: 'rust', label: 'Rust' },
    { value: 'go', label: 'Go' },
    { value: 'ruby', label: 'Ruby', disabled: true },
    { value: 'kotlin', label: 'Kotlin' },
  ];

  protected readonly orientationOptions: readonly ControlOption<'vertical' | 'horizontal'>[] = [
    { value: 'vertical', label: 'vertical' },
    { value: 'horizontal', label: 'horizontal' },
  ];

  protected readonly selectionFollowsFocus = signal(false);
  protected readonly disabled = signal(false);

  protected readonly multiple = signal(false);
  protected readonly value = linkedSignal<boolean, string[]>({
    source: this.multiple,
    computation: () => [],
  });

  protected readonly orientation = signal<'vertical' | 'horizontal'>('vertical');
}
