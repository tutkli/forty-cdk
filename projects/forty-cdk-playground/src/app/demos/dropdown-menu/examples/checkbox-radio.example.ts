import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForDropdownMenu,
  ForDropdownMenuTrigger,
  ForMenuCheckboxItem,
  ForMenuContent,
  ForMenuGroup,
  ForMenuGroupLabel,
  ForMenuItemIndicator,
  ForMenuRadioGroup,
  ForMenuRadioItem,
  ForMenuSeparator,
} from 'forty-cdk';

import { DemoLayout } from '../../../ui/demo-layout';
import { Icon } from '../../../ui/icon';

@Component({
  selector: 'app-dropdown-menu-checkbox-radio-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForDropdownMenu,
    ForDropdownMenuTrigger,
    ForMenuContent,
    ForMenuCheckboxItem,
    ForMenuRadioGroup,
    ForMenuRadioItem,
    ForMenuItemIndicator,
    ForMenuGroup,
    ForMenuGroupLabel,
    ForMenuSeparator,
    Icon,
  ],
  template: `
    <playground-demo
      title="Checkbox & radio items"
      subtitle="A settings-style dropdown built from the full menu vocabulary: forMenuGroup with a forMenuGroupLabel header, forMenuCheckboxItem toggles (role menuitemcheckbox) and a forMenuRadioGroup of forMenuRadioItem options (role menuitemradio). Each item carries a forMenuItemIndicator that paints its checkmark / dot from the item's checked state. Calling preventDefault() on (activate) keeps the menu open so several options can be flipped in one pass — try Space to toggle without closing."
      sourcePath="projects/forty-cdk-playground/src/app/demos/dropdown-menu/examples/checkbox-radio.example.ts"
    >
      <div demo class="menu-demo">
        <div forDropdownMenu [(open)]="open">
          <button forDropdownMenuTrigger class="pg-btn pg-btn--primary">View options</button>
          @if (open()) {
            <div forMenuContent class="pg-menu pg-menu--wide" animate.enter="pg-pop-in">
              <div forMenuGroup>
                <div forMenuGroupLabel class="pg-menu-label">Panels</div>
                <button
                  forMenuCheckboxItem
                  class="pg-menu-item pg-menu-item--check"
                  [(checked)]="showToolbar"
                  (activate)="$event.preventDefault()"
                >
                  <span forMenuItemIndicator [forceMount]="true" class="pg-menu-indicator">
                    <app-icon name="check" />
                  </span>
                  Show toolbar
                </button>
                <button
                  forMenuCheckboxItem
                  class="pg-menu-item pg-menu-item--check"
                  [(checked)]="showStatusBar"
                  (activate)="$event.preventDefault()"
                >
                  <span forMenuItemIndicator [forceMount]="true" class="pg-menu-indicator">
                    <app-icon name="check" />
                  </span>
                  Show status bar
                </button>
                <button
                  forMenuCheckboxItem
                  class="pg-menu-item pg-menu-item--check"
                  [(checked)]="wordWrap"
                  (activate)="$event.preventDefault()"
                >
                  <span forMenuItemIndicator [forceMount]="true" class="pg-menu-indicator">
                    <app-icon name="check" />
                  </span>
                  Word wrap
                </button>
              </div>

              <hr forMenuSeparator class="pg-menu-separator" />

              <div forMenuGroup>
                <div forMenuGroupLabel class="pg-menu-label">Theme</div>
                <div forMenuRadioGroup [(value)]="theme">
                  <button
                    forMenuRadioItem
                    value="system"
                    class="pg-menu-item pg-menu-item--check"
                    (activate)="$event.preventDefault()"
                  >
                    <span forMenuItemIndicator [forceMount]="true" class="pg-menu-indicator">
                      <svg viewBox="0 0 16 16" width="7" height="7" aria-hidden="true">
                        <circle cx="8" cy="8" r="8" fill="currentColor" />
                      </svg>
                    </span>
                    System
                  </button>
                  <button
                    forMenuRadioItem
                    value="light"
                    class="pg-menu-item pg-menu-item--check"
                    (activate)="$event.preventDefault()"
                  >
                    <span forMenuItemIndicator [forceMount]="true" class="pg-menu-indicator">
                      <svg viewBox="0 0 16 16" width="7" height="7" aria-hidden="true">
                        <circle cx="8" cy="8" r="8" fill="currentColor" />
                      </svg>
                    </span>
                    Light
                  </button>
                  <button
                    forMenuRadioItem
                    value="dark"
                    class="pg-menu-item pg-menu-item--check"
                    (activate)="$event.preventDefault()"
                  >
                    <span forMenuItemIndicator [forceMount]="true" class="pg-menu-indicator">
                      <svg viewBox="0 0 16 16" width="7" height="7" aria-hidden="true">
                        <circle cx="8" cy="8" r="8" fill="currentColor" />
                      </svg>
                    </span>
                    Dark
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">
          toolbar: <b>{{ showToolbar() }}</b
          ><br />
          status bar: <b>{{ showStatusBar() }}</b
          ><br />
          word wrap: <b>{{ wordWrap() }}</b
          ><br />
          theme: <b>{{ theme() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .menu-demo {
      display: flex;
      justify-content: center;
      padding: 2.5rem 0;
    }
  `,
})
export class DropdownMenuCheckboxRadioExample {
  protected readonly open = signal(false);
  protected readonly showToolbar = signal(true);
  protected readonly showStatusBar = signal(true);
  protected readonly wordWrap = signal(false);
  protected readonly theme = signal('system');
}
