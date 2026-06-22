import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';
import {
  ForMenuContent,
  ForMenuItem,
  ForMenuSeparator,
  ForMenuSub,
  ForMenuSubTrigger,
} from 'forty-cdk/menu';

import { DemoLayout } from '../../../ui/demo-layout';
import { Icon } from '../../../ui/icon';

@Component({
  selector: 'app-dropdown-menu-submenus-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForDropdownMenu,
    ForDropdownMenuTrigger,
    ForMenuContent,
    ForMenuItem,
    ForMenuSeparator,
    ForMenuSub,
    ForMenuSubTrigger,
    Icon,
  ],
  template: `
    <playground-demo
      title="Submenus"
      subtitle="forMenuSub nests a second menu under a forMenuSubTrigger item (role menuitem, aria-haspopup=menu). The submenu owns its own open model and item collection, and its forMenuSubContent reuses the menu surface positioned to the side of the trigger. Submenus nest arbitrarily — here a third level sits inside the second. ArrowRight opens a submenu and focuses its first item; ArrowLeft collapses back to the parent; Escape closes one level at a time."
      sourcePath="projects/forty-cdk-playground/src/app/demos/dropdown-menu/examples/submenus.example.ts"
    >
      <div demo class="menu-demo">
        <div forDropdownMenu [(open)]="open">
          <button forDropdownMenuTrigger class="pg-btn pg-btn--primary">Share</button>
          @if (open()) {
            <div forMenuContent class="pg-menu pg-menu--wide" animate.enter="pg-pop-in">
              <button forMenuItem class="pg-menu-item" (activate)="onAction('Copy link')">
                Copy link
              </button>
              <button forMenuItem class="pg-menu-item" (activate)="onAction('Email')">Email</button>

              <hr forMenuSeparator class="pg-menu-separator" />

              <div forMenuSub [(open)]="inviteOpen">
                <button forMenuSubTrigger class="pg-menu-item">
                  Invite people
                  <span class="pg-menu-sub-arrow" aria-hidden="true">
                    <app-icon name="chevron-right" />
                  </span>
                </button>
                @if (inviteOpen()) {
                  <div forMenuSubContent class="pg-menu" animate.enter="pg-pop-in">
                    <button
                      forMenuItem
                      class="pg-menu-item"
                      (activate)="onAction('Invite by email')"
                    >
                      By email
                    </button>
                    <button
                      forMenuItem
                      class="pg-menu-item"
                      (activate)="onAction('Invite by link')"
                    >
                      By link
                    </button>

                    <hr forMenuSeparator class="pg-menu-separator" />

                    <div forMenuSub [(open)]="roleOpen">
                      <button forMenuSubTrigger class="pg-menu-item">
                        Set role
                        <span class="pg-menu-sub-arrow" aria-hidden="true">
                          <app-icon name="chevron-right" />
                        </span>
                      </button>
                      @if (roleOpen()) {
                        <div forMenuSubContent class="pg-menu" animate.enter="pg-pop-in">
                          <button
                            forMenuItem
                            class="pg-menu-item"
                            (activate)="onAction('Role: Viewer')"
                          >
                            Viewer
                          </button>
                          <button
                            forMenuItem
                            class="pg-menu-item"
                            (activate)="onAction('Role: Editor')"
                          >
                            Editor
                          </button>
                          <button
                            forMenuItem
                            class="pg-menu-item"
                            (activate)="onAction('Role: Admin')"
                          >
                            Admin
                          </button>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>

              <hr forMenuSeparator class="pg-menu-separator" />

              <button forMenuItem class="pg-menu-item" (activate)="onAction('Manage access')">
                Manage access
              </button>
            </div>
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">
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
export class DropdownMenuSubmenusExample {
  protected readonly open = signal(false);
  protected readonly inviteOpen = signal(false);
  protected readonly roleOpen = signal(false);
  protected readonly lastAction = signal('—');

  protected onAction(label: string): void {
    this.lastAction.set(label);
  }
}
