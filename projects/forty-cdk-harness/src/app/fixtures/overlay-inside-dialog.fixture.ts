import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForDialog,
  ForDialogClose,
  ForDialogTrigger,
  ForDropdownMenu,
  ForDropdownMenuTrigger,
  ForMenuContent,
  ForMenuItem,
  ForSelect,
  ForSelectContent,
  ForSelectOption,
  ForSelectTrigger,
  ForSelectValue,
} from 'forty-cdk';

/**
 * Fixture for #676 — anchored overlays (Select / DropdownMenu) opened from a
 * form inside a modal `ForDialog`. The overlay content portals to
 * `document.body`; without the anchor-aware modal-peer marking the inert pass
 * swallows it, so clicks fall through to the dialog button behind it and the
 * surface reads as `aria-hidden`.
 *
 * The `data-testid="behind-button"` sits inside the dialog and increments a
 * visible counter; the overlay surfaces are positioned (negative margin) to
 * overlap it, so a click that falls through the overlay would bump the counter.
 */
@Component({
  selector: 'app-overlay-inside-dialog-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      [forDialog] {
        position: fixed;
        inset: 0;
        margin: auto;
        width: 320px;
        height: 240px;
        background: white;
        border: 1px solid #ccc;
        padding: 16px;
      }
      [forSelectContent],
      [forMenuContent] {
        background: white;
        border: 1px solid #999;
        min-width: 180px;
      }
      [forSelectOption],
      [forMenuItem] {
        display: block;
        width: 100%;
        text-align: left;
        padding: 8px 10px;
        height: 36px;
        box-sizing: border-box;
      }
      [data-testid='behind-button'] {
        display: block;
        width: 200px;
        height: 80px;
      }
    `,
  ],
  imports: [
    ForDialog,
    ForDialogTrigger,
    ForDialogClose,
    ForSelect,
    ForSelectTrigger,
    ForSelectValue,
    ForSelectContent,
    ForSelectOption,
    ForDropdownMenu,
    ForDropdownMenuTrigger,
    ForMenuContent,
    ForMenuItem,
  ],
  template: `
    <button data-testid="dialog-trigger" forDialogTrigger [(open)]="dialogOpen">Open dialog</button>

    @if (dialogOpen()) {
      <div forDialog ariaLabel="Form dialog" (dismiss)="dialogOpen.set(false)">
        <!-- A control behind the overlays. A click that falls through an
             inert overlay would land here and bump the counter. -->
        <button data-testid="behind-button" type="button" (click)="behindClicks.set(behindClicks() + 1)">
          Behind ({{ behindClicks() }})
        </button>

        <div forSelect [(open)]="selectOpen" [(value)]="value" ariaLabel="Fruit">
          <button data-testid="select-trigger" forSelectTrigger>
            <span forSelectValue placeholder="Pick a fruit"></span>
          </button>
          @if (selectOpen()) {
            <div forSelectContent data-testid="select-content" style="margin-top: -60px;">
              <button data-testid="opt-apple" forSelectOption value="apple">Apple</button>
              <button data-testid="opt-banana" forSelectOption value="banana">Banana</button>
            </div>
          }
        </div>

        <div forDropdownMenu [(open)]="menuOpen" ariaLabel="Actions">
          <button data-testid="menu-trigger" forDropdownMenuTrigger>Menu</button>
          @if (menuOpen()) {
            <div forMenuContent data-testid="menu-content" style="margin-top: -60px;">
              <button data-testid="item-1" forMenuItem (click)="picked.set('one')">One</button>
              <button data-testid="item-2" forMenuItem (click)="picked.set('two')">Two</button>
            </div>
          }
        </div>

        <button data-testid="dialog-close" forDialogClose>Close</button>
      </div>
    }
  `,
})
export class OverlayInsideDialogFixture {
  protected readonly dialogOpen = signal(false);
  protected readonly selectOpen = signal(false);
  protected readonly menuOpen = signal(false);
  protected readonly value = signal<readonly string[]>([]);
  protected readonly behindClicks = signal(0);
  protected readonly picked = signal<string | null>(null);
}
