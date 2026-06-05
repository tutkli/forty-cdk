import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForContextMenu,
  ForContextMenuTrigger,
  ForDropdownMenu,
  ForDropdownMenuTrigger,
  ForMenuContent,
  ForMenuItem,
  ForMenubar,
  ForMenubarTrigger,
  ForMenuSub,
  ForMenuSubTrigger,
} from 'forty-cdk';

/**
 * Submenu hover fixture exercising pointer-driven open/close (the
 * `[forMenuSubTrigger]` safe-triangle) across all three menu surfaces that
 * compose `[forMenuSub]`: DropdownMenu (with a nested third level),
 * ContextMenu, and Menubar.
 *
 * Inline styles give every menu / item a real laid-out box so the
 * pointer-grace geometry (`getBoundingClientRect` reads) is meaningful in a
 * real browser. The submenus carry an 8px `sideOffset` so there is a genuine
 * gap between trigger and content for the diagonal "travel into the submenu"
 * assertions to cross.
 */
@Component({
  selector: 'app-menu-sub-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForDropdownMenu,
    ForDropdownMenuTrigger,
    ForContextMenu,
    ForContextMenuTrigger,
    ForMenubar,
    ForMenubarTrigger,
    ForMenuContent,
    ForMenuItem,
    ForMenuSub,
    ForMenuSubTrigger,
  ],
  styles: `
    .surfaces {
      display: flex;
      flex-direction: column;
      gap: 64px;
      padding: 40px;
      align-items: flex-start;
    }
    .menu {
      min-width: 180px;
      background: #fff;
      border: 1px solid #c0c4cc;
      border-radius: 6px;
      padding: 4px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    }
    .item {
      display: block;
      width: 100%;
      box-sizing: border-box;
      padding: 8px 12px;
      text-align: left;
      background: transparent;
      border: 0;
      border-radius: 4px;
      font: inherit;
      cursor: default;
    }
    .item[data-highlighted] {
      background: #e6f0ff;
    }
    .item[data-state='open'] {
      background: #eef;
    }
    .region {
      width: 240px;
      height: 64px;
      background: #eef;
      border: 1px solid #99c;
      padding: 8px;
    }
    .edge {
      position: fixed;
      top: 120px;
      right: 8px;
    }
  `,
  template: `
    <div class="surfaces">
      <input data-testid="before" placeholder="before" />

      <!-- DropdownMenu with a two-level submenu -->
      <div forDropdownMenu [(open)]="ddOpen" ariaLabel="Dropdown">
        <button data-testid="dd-trigger" forDropdownMenuTrigger>Dropdown</button>
        @if (ddOpen()) {
          <div forMenuContent data-testid="dd-menu" class="menu">
            <button data-testid="dd-item-1" forMenuItem class="item">Item one</button>
            <div forMenuSub [(open)]="ddSubOpen" [sideOffset]="8">
              <button data-testid="dd-sub-trigger" forMenuSubTrigger class="item">More tools</button>
              @if (ddSubOpen()) {
                <div forMenuSubContent data-testid="dd-sub-menu" class="menu">
                  <button data-testid="dd-sub-item-1" forMenuItem class="item">Save page</button>
                  <div forMenuSub [(open)]="ddNestedOpen" [sideOffset]="8">
                    <button data-testid="dd-nested-trigger" forMenuSubTrigger class="item">
                      Developer
                    </button>
                    @if (ddNestedOpen()) {
                      <div forMenuSubContent data-testid="dd-nested-menu" class="menu">
                        <button data-testid="dd-nested-item-1" forMenuItem class="item">
                          Inspect
                        </button>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
            <button data-testid="dd-item-2" forMenuItem class="item">Item two</button>
          </div>
        }
      </div>

      <!-- ContextMenu with a submenu -->
      <div forContextMenu [(open)]="ctxOpen" ariaLabel="Context">
        <div data-testid="ctx-region" forContextMenuTrigger tabindex="0" class="region">
          Right-click here
        </div>
        @if (ctxOpen()) {
          <div forMenuContent data-testid="ctx-menu" class="menu">
            <button data-testid="ctx-item-1" forMenuItem class="item">Cut</button>
            <div forMenuSub [(open)]="ctxSubOpen" [sideOffset]="8">
              <button data-testid="ctx-sub-trigger" forMenuSubTrigger class="item">Share</button>
              @if (ctxSubOpen()) {
                <div forMenuSubContent data-testid="ctx-sub-menu" class="menu">
                  <button data-testid="ctx-sub-item-1" forMenuItem class="item">Email link</button>
                </div>
              }
            </div>
          </div>
        }
      </div>

      <!-- Menubar with a submenu -->
      <div forMenubar [(value)]="mbValue" aria-label="Menubar">
        <button data-testid="mb-trigger" forMenubarTrigger value="tools">Tools</button>
        @if (mbValue() === 'tools') {
          <div forMenuContent data-testid="mb-menu" class="menu">
            <button data-testid="mb-item-1" forMenuItem class="item">Spellcheck</button>
            <div forMenuSub [(open)]="mbSubOpen" [sideOffset]="8">
              <button data-testid="mb-sub-trigger" forMenuSubTrigger class="item">Language</button>
              @if (mbSubOpen()) {
                <div forMenuSubContent data-testid="mb-sub-menu" class="menu">
                  <button data-testid="mb-sub-item-1" forMenuItem class="item">English</button>
                </div>
              }
            </div>
          </div>
        }
      </div>

      <input data-testid="after" placeholder="after" />
    </div>

    <!--
      DropdownMenu pinned to the right viewport edge. The submenu requests
      side="right" but there is no room there, so floating-ui flip renders it
      on the left. Exercises the safe-triangle arming the grace polygon on the
      resolved (flipped) side (#502).
    -->
    <div class="edge" forDropdownMenu [(open)]="edgeOpen" ariaLabel="Edge dropdown">
      <button data-testid="edge-trigger" forDropdownMenuTrigger>Edge</button>
      @if (edgeOpen()) {
        <div forMenuContent data-testid="edge-menu" class="menu">
          <button data-testid="edge-item-1" forMenuItem class="item">Item one</button>
          <div forMenuSub [(open)]="edgeSubOpen" side="right" [sideOffset]="8">
            <button data-testid="edge-sub-trigger" forMenuSubTrigger class="item">More tools</button>
            @if (edgeSubOpen()) {
              <div forMenuSubContent data-testid="edge-sub-menu" class="menu">
                <button data-testid="edge-sub-item-1" forMenuItem class="item">Save page</button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class MenuSubFixture {
  protected readonly ddOpen = signal(false);
  protected readonly ddSubOpen = signal(false);
  protected readonly ddNestedOpen = signal(false);

  protected readonly ctxOpen = signal(false);
  protected readonly ctxSubOpen = signal(false);

  protected readonly mbValue = signal('');
  protected readonly mbSubOpen = signal(false);

  protected readonly edgeOpen = signal(false);
  protected readonly edgeSubOpen = signal(false);
}
