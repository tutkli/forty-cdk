import { ChangeDetectionStrategy, Component, linkedSignal, signal } from '@angular/core';
import {
  ForSelect,
  ForSelectContent,
  ForSelectGroup,
  ForSelectGroupLabel,
  ForSelectIndicator,
  ForSelectOption,
  ForSelectSeparator,
  ForSelectTrigger,
  ForSelectValue,
} from 'forty-cdk';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';
import { Icon } from '../../../ui/icon';

@Component({
  selector: 'app-select-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForSelect,
    ForSelectTrigger,
    ForSelectValue,
    ForSelectContent,
    ForSelectOption,
    ForSelectIndicator,
    ForSelectGroup,
    ForSelectGroupLabel,
    ForSelectSeparator,
    ControlSelect,
    ControlSwitch,
    Icon,
  ],
  template: `
    <playground-demo
      title="Single, multi & groups"
      subtitle="A button trigger that opens a portaled listbox (role combobox + listbox + option), built on the select-only combobox APG pattern. Turn on multiple to keep the listbox open and accumulate values; switch position to item-aligned for the macOS-style overlay that lines the selected option up with the trigger. Options are grouped, the checkmark indicator mirrors each option's data-state, and the surface portals to <body> so its styles live in styles.css."
      sourcePath="projects/forty-cdk-playground/src/app/demos/select/examples/select.example.ts"
    >
      <div demo class="select-demo">
        <div
          forSelect
          #select="forSelect"
          class="select-field"
          [(value)]="value"
          [multiple]="multiple()"
          [position]="position()"
          [selectionFollowsFocus]="selectionFollowsFocus()"
          [loop]="loop()"
          [disabled]="disabled()"
          placeholder="Pick your stack"
          ariaLabel="Tech stack"
        >
          <button forSelectTrigger type="button" class="pg-select-trigger">
            <span forSelectValue></span>
            <app-icon class="pg-select-chevron" name="chevron-down" />
          </button>
          @if (select.open()) {
            <div forSelectContent class="pg-select-content" animate.enter="pg-pop-in">
              <div forSelectGroup>
                <div forSelectGroupLabel class="pg-select-group-label">Frontend</div>
                @for (opt of frontend; track opt.value) {
                  <button
                    forSelectOption
                    type="button"
                    class="pg-select-option"
                    [value]="opt.value"
                    [disabled]="opt.disabled ?? false"
                  >
                    <span forSelectIndicator [forceMount]="true" class="pg-select-indicator">
                      <app-icon name="check" />
                    </span>
                    {{ opt.label }}
                  </button>
                }
              </div>

              <hr forSelectSeparator class="pg-select-separator" />

              <div forSelectGroup>
                <div forSelectGroupLabel class="pg-select-group-label">Backend</div>
                @for (opt of backend; track opt.value) {
                  <button
                    forSelectOption
                    type="button"
                    class="pg-select-option"
                    [value]="opt.value"
                    [disabled]="opt.disabled ?? false"
                  >
                    <span forSelectIndicator [forceMount]="true" class="pg-select-indicator">
                      <app-icon name="check" />
                    </span>
                    {{ opt.label }}
                  </button>
                }
              </div>
            </div>
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-switch label="multiple" [(checked)]="multiple" />
        <app-control-select label="position" [options]="positionOptions" [(value)]="position" />
        <app-control-switch
          label="selectionFollowsFocus"
          [(checked)]="selectionFollowsFocus"
          [disabled]="multiple()"
        />
        <app-control-switch label="loop" [(checked)]="loop" />
        <app-control-switch label="disabled" [(checked)]="disabled" />

        <p class="pg-state">
          open: <b>{{ select.open() }}</b
          ><br />
          value: <b>{{ value().join(', ') || '—' }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .select-demo {
      display: flex;
      justify-content: center;
      padding: 2.5rem 0;
      width: 100%;
    }

    .select-field {
      display: block;
      width: min(260px, 100%);
    }
  `,
})
export class SelectExample {
  protected readonly frontend: readonly { value: string; label: string; disabled?: boolean }[] = [
    { value: 'angular', label: 'Angular' },
    { value: 'react', label: 'React' },
    { value: 'vue', label: 'Vue' },
    { value: 'svelte', label: 'Svelte', disabled: true },
  ];

  protected readonly backend: readonly { value: string; label: string; disabled?: boolean }[] = [
    { value: 'node', label: 'Node.js' },
    { value: 'deno', label: 'Deno' },
    { value: 'bun', label: 'Bun' },
  ];

  protected readonly positionOptions: readonly ControlOption<'popper' | 'item-aligned'>[] = [
    { value: 'popper', label: 'popper' },
    { value: 'item-aligned', label: 'item-aligned' },
  ];

  protected readonly loop = signal(true);
  protected readonly disabled = signal(false);
  protected readonly selectionFollowsFocus = signal(false);

  protected readonly multiple = signal(false);
  protected readonly value = linkedSignal<boolean, readonly string[]>({
    source: this.multiple,
    computation: () => [],
  });

  protected readonly position = signal<'popper' | 'item-aligned'>('popper');
}
