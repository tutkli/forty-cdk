import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForDropdownMenu,
  ForDropdownMenuTrigger,
  ForMenuCheckboxItem,
  ForMenuContent,
  ForMenuGroup,
  ForMenuGroupLabel,
  ForMenuItem,
  ForMenuItemIndicator,
  ForMenuRadioGroup,
  ForMenuRadioItem,
  ForMenuSeparator,
  ForMenuSub,
  ForMenuSubTrigger,
} from 'forty-cdk';

import { DemoLayout } from '../../../ui/demo-layout';
import { Icon } from '../../../ui/icon';

@Component({
  selector: 'app-menu-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForDropdownMenu,
    ForDropdownMenuTrigger,
    ForMenuContent,
    ForMenuItem,
    ForMenuCheckboxItem,
    ForMenuRadioGroup,
    ForMenuRadioItem,
    ForMenuItemIndicator,
    ForMenuSeparator,
    ForMenuGroup,
    ForMenuGroupLabel,
    ForMenuSub,
    ForMenuSubTrigger,
    Icon,
  ],
  template: `
    <playground-demo
      title="Groups, radio & submenu"
      subtitle="The shared menu vocabulary, hosted here by a Dropdown Menu trigger: grouped labels, checkbox items and a radio group (role menuitemcheckbox / menuitemradio), a nested submenu and decorative separators. Checkbox and radio items keep the menu open on activation so several options can be flipped before dismissing."
      sourcePath="projects/forty-cdk-playground/src/app/demos/menu/examples/menu.example.ts"
    >
      <div demo class="menu-demo">
        <div forDropdownMenu [(open)]="open">
          <button forDropdownMenuTrigger class="pg-btn pg-btn--primary">View options</button>
          @if (open()) {
            <div forMenuContent class="pg-menu pg-menu--wide" animate.enter="pg-pop-in">
              <div forMenuGroup>
                <div forMenuGroupLabel class="pg-menu-label">Appearance</div>
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
                  [(checked)]="showSidebar"
                  (activate)="$event.preventDefault()"
                >
                  <span forMenuItemIndicator [forceMount]="true" class="pg-menu-indicator">
                    <app-icon name="check" />
                  </span>
                  Show sidebar
                </button>
              </div>

              <hr forMenuSeparator class="pg-menu-separator" />

              <div forMenuGroup>
                <div forMenuGroupLabel class="pg-menu-label">Sort by</div>
                <div forMenuRadioGroup [(value)]="sortBy">
                  <button
                    forMenuRadioItem
                    value="name"
                    class="pg-menu-item pg-menu-item--check"
                    (activate)="$event.preventDefault()"
                  >
                    <span forMenuItemIndicator [forceMount]="true" class="pg-menu-indicator">
                      <svg viewBox="0 0 16 16" width="7" height="7" aria-hidden="true">
                        <circle cx="8" cy="8" r="8" fill="currentColor" />
                      </svg>
                    </span>
                    Name
                  </button>
                  <button
                    forMenuRadioItem
                    value="date"
                    class="pg-menu-item pg-menu-item--check"
                    (activate)="$event.preventDefault()"
                  >
                    <span forMenuItemIndicator [forceMount]="true" class="pg-menu-indicator">
                      <svg viewBox="0 0 16 16" width="7" height="7" aria-hidden="true">
                        <circle cx="8" cy="8" r="8" fill="currentColor" />
                      </svg>
                    </span>
                    Date modified
                  </button>
                  <button
                    forMenuRadioItem
                    value="size"
                    class="pg-menu-item pg-menu-item--check"
                    (activate)="$event.preventDefault()"
                  >
                    <span forMenuItemIndicator [forceMount]="true" class="pg-menu-indicator">
                      <svg viewBox="0 0 16 16" width="7" height="7" aria-hidden="true">
                        <circle cx="8" cy="8" r="8" fill="currentColor" />
                      </svg>
                    </span>
                    Size
                  </button>
                </div>
              </div>

              <hr forMenuSeparator class="pg-menu-separator" />

              <div forMenuSub [(open)]="moreOpen">
                <button forMenuSubTrigger class="pg-menu-item pg-menu-item--check">
                  <span class="pg-menu-indicator"></span>
                  More tools
                  <span class="pg-menu-sub-arrow" aria-hidden="true">
                    <app-icon name="chevron-right" />
                  </span>
                </button>
                @if (moreOpen()) {
                  <div forMenuSubContent class="pg-menu" animate.enter="pg-pop-in">
                    <button
                      forMenuItem
                      class="pg-menu-item"
                      (activate)="onAction('Developer tools')"
                    >
                      Developer tools
                    </button>
                    <button forMenuItem class="pg-menu-item" (activate)="onAction('Extensions')">
                      Extensions
                    </button>
                    <button forMenuItem class="pg-menu-item" (activate)="onAction('Task manager')">
                      Task manager
                    </button>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">
          toolbar: <b>{{ showToolbar() }}</b
          ><br />
          sidebar: <b>{{ showSidebar() }}</b
          ><br />
          sort by: <b>{{ sortBy() }}</b
          ><br />
          last action: <b>{{ lastAction() }}</b>
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
export class MenuExample {
  protected readonly open = signal(false);
  protected readonly moreOpen = signal(false);
  protected readonly showToolbar = signal(true);
  protected readonly showSidebar = signal(false);
  protected readonly sortBy = signal('name');
  protected readonly lastAction = signal('—');

  protected onAction(label: string): void {
    this.lastAction.set(label);
  }
}
