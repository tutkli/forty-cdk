import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForContextMenu,
  ForContextMenuTrigger,
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
  selector: 'app-context-menu-rich-content-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForContextMenu,
    ForContextMenuTrigger,
    ForMenuContent,
    ForMenuItem,
    ForMenuCheckboxItem,
    ForMenuRadioGroup,
    ForMenuRadioItem,
    ForMenuItemIndicator,
    ForMenuGroup,
    ForMenuGroupLabel,
    ForMenuSeparator,
    ForMenuSub,
    ForMenuSubTrigger,
    Icon,
  ],
  template: `
    <playground-demo
      title="Rich content"
      subtitle="The same menu vocabulary the Dropdown Menu exposes, anchored to the pointer on right-click: plain forMenuItem actions, a forMenuCheckboxItem toggle, a forMenuRadioGroup, a forMenuSub submenu, and grouped labels with separators. Checkbox and radio items preventDefault() on (activate) to stay open; plain items close the menu and bubble up through any open submenu."
      sourcePath="projects/forty-cdk-playground/src/app/demos/context-menu/examples/rich-content.example.ts"
    >
      <div demo class="ctx-demo">
        <div forContextMenu [(open)]="open">
          <div forContextMenuTrigger tabindex="0" class="ctx-region">
            Right-click anywhere in this area
            <span class="ctx-hint">(or focus it and press Shift+F10)</span>
          </div>
          @if (open()) {
            <div forMenuContent class="pg-menu pg-menu--wide" animate.enter="pg-pop-in">
              <button forMenuItem class="pg-menu-item" (activate)="onAction('Back')">Back</button>
              <button forMenuItem class="pg-menu-item" (activate)="onAction('Reload')">Reload</button>

              <hr forMenuSeparator class="pg-menu-separator" />

              <button
                forMenuCheckboxItem
                class="pg-menu-item pg-menu-item--check"
                [(checked)]="showBookmarks"
                (activate)="$event.preventDefault()"
              >
                <span forMenuItemIndicator [forceMount]="true" class="pg-menu-indicator">
                  <app-icon name="check" />
                </span>
                Show bookmarks bar
              </button>

              <div forMenuSub [(open)]="zoomOpen">
                <button forMenuSubTrigger class="pg-menu-item pg-menu-item--check">
                  <span class="pg-menu-indicator"></span>
                  Zoom
                  <span class="pg-menu-sub-arrow" aria-hidden="true">
                    <app-icon name="chevron-right" />
                  </span>
                </button>
                @if (zoomOpen()) {
                  <div forMenuSubContent class="pg-menu" animate.enter="pg-pop-in">
                    <button forMenuItem class="pg-menu-item" (activate)="onAction('Zoom in')">
                      Zoom in
                    </button>
                    <button forMenuItem class="pg-menu-item" (activate)="onAction('Zoom out')">
                      Zoom out
                    </button>
                    <button forMenuItem class="pg-menu-item" (activate)="onAction('Reset zoom')">
                      Reset
                    </button>
                  </div>
                }
              </div>

              <hr forMenuSeparator class="pg-menu-separator" />

              <div forMenuGroup>
                <div forMenuGroupLabel class="pg-menu-label">Encoding</div>
                <div forMenuRadioGroup [(value)]="encoding">
                  <button
                    forMenuRadioItem
                    value="utf-8"
                    class="pg-menu-item pg-menu-item--check"
                    (activate)="$event.preventDefault()"
                  >
                    <span forMenuItemIndicator [forceMount]="true" class="pg-menu-indicator">
                      <svg viewBox="0 0 16 16" width="7" height="7" aria-hidden="true">
                        <circle cx="8" cy="8" r="8" fill="currentColor" />
                      </svg>
                    </span>
                    UTF-8
                  </button>
                  <button
                    forMenuRadioItem
                    value="utf-16"
                    class="pg-menu-item pg-menu-item--check"
                    (activate)="$event.preventDefault()"
                  >
                    <span forMenuItemIndicator [forceMount]="true" class="pg-menu-indicator">
                      <svg viewBox="0 0 16 16" width="7" height="7" aria-hidden="true">
                        <circle cx="8" cy="8" r="8" fill="currentColor" />
                      </svg>
                    </span>
                    UTF-16
                  </button>
                  <button
                    forMenuRadioItem
                    value="latin-1"
                    class="pg-menu-item pg-menu-item--check"
                    (activate)="$event.preventDefault()"
                  >
                    <span forMenuItemIndicator [forceMount]="true" class="pg-menu-indicator">
                      <svg viewBox="0 0 16 16" width="7" height="7" aria-hidden="true">
                        <circle cx="8" cy="8" r="8" fill="currentColor" />
                      </svg>
                    </span>
                    Latin-1
                  </button>
                </div>
              </div>

              <hr forMenuSeparator class="pg-menu-separator" />

              <button
                forMenuItem
                class="pg-menu-item pg-menu-item--danger"
                (activate)="onAction('Inspect')"
              >
                Inspect
              </button>
            </div>
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">
          bookmarks bar: <b>{{ showBookmarks() }}</b
          ><br />
          encoding: <b>{{ encoding() }}</b
          ><br />
          last action: <b>{{ lastAction() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .ctx-demo {
      display: flex;
      justify-content: center;
      padding: 1.5rem 0;
    }

    .ctx-region {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      width: min(420px, 100%);
      min-height: 180px;
      padding: 1.5rem;
      text-align: center;
      font-weight: 600;
      color: var(--pg-text-muted);
      background: var(--pg-surface-2);
      border: 2px dashed var(--pg-border-strong);
      border-radius: var(--pg-radius);
      user-select: none;
    }

    .ctx-hint {
      font-size: 0.8rem;
      font-weight: 400;
    }
  `,
})
export class ContextMenuRichContentExample {
  protected readonly open = signal(false);
  protected readonly zoomOpen = signal(false);
  protected readonly showBookmarks = signal(true);
  protected readonly encoding = signal('utf-8');
  protected readonly lastAction = signal('—');

  protected onAction(label: string): void {
    this.lastAction.set(label);
  }
}
