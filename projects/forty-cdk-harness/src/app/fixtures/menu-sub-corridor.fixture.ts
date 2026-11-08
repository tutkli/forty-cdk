import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { provideForMenuDefaults } from 'forty-cdk/defaults';
import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';
import { ForMenuContent, ForMenuItem, ForMenuSub, ForMenuSubTrigger } from 'forty-cdk/menu';

/**
 * Two stacked sub-triggers: "Share" opens a six-item submenu that reaches well
 * below the "Export" row underneath it, so a diagonal path from "Share" toward
 * the lower half of its submenu crosses "Export" inside Share's pointer-grace
 * corridor. The toggle disables Export's `[forMenuSub]` for the control path.
 * The `graceMs` query sets `subMenuPointerGraceDuration`, so a spec can rest the
 * pointer on Export past the open delay while still inside the corridor.
 */
@Component({
  selector: 'app-menu-sub-corridor-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideForMenuDefaults(() => {
      const graceMs = inject(ActivatedRoute).snapshot.queryParamMap.get('graceMs');
      return graceMs === null ? {} : { subMenuPointerGraceDuration: Number(graceMs) };
    }),
  ],
  imports: [
    ForDropdownMenu,
    ForDropdownMenuTrigger,
    ForMenuContent,
    ForMenuItem,
    ForMenuSub,
    ForMenuSubTrigger,
  ],
  styles: `
    .wrap {
      padding: 40px;
    }
    .menu {
      min-width: 180px;
      background: #fff;
      border: 1px solid #c0c4cc;
      padding: 4px;
    }
    .item {
      display: block;
      width: 100%;
      box-sizing: border-box;
      padding: 8px 12px;
      text-align: left;
      background: transparent;
      border: 0;
      font: inherit;
    }
  `,
  template: `
    <div class="wrap">
      <button data-testid="toggle" (click)="exportDisabled.set(true)">disable export</button>
      <div forDropdownMenu [(open)]="open" ariaLabel="Dropdown">
        <button data-testid="trigger" forDropdownMenuTrigger>Dropdown</button>
        @if (open()) {
          <div forMenuContent data-testid="menu" class="menu">
            <div forMenuSub [(open)]="shareOpen" [sideOffset]="8">
              <button data-testid="share-trigger" forMenuSubTrigger class="item">Share</button>
              @if (shareOpen()) {
                <div forMenuSubContent data-testid="share-menu" class="menu">
                  <button forMenuItem class="item">One</button>
                  <button forMenuItem class="item">Two</button>
                  <button forMenuItem class="item">Three</button>
                  <button forMenuItem class="item">Four</button>
                  <button forMenuItem class="item">Five</button>
                  <button data-testid="share-last" forMenuItem class="item">Six</button>
                </div>
              }
            </div>
            <div forMenuSub [(open)]="exportOpen" [sideOffset]="8" [disabled]="exportDisabled()">
              <button data-testid="export-trigger" forMenuSubTrigger class="item">Export</button>
              @if (exportOpen()) {
                <div forMenuSubContent data-testid="export-menu" class="menu">
                  <button forMenuItem class="item">PDF</button>
                </div>
              }
            </div>
            <button forMenuItem class="item">Print</button>
          </div>
        }
      </div>
    </div>
  `,
})
export class MenuSubCorridorFixture {
  protected readonly open = signal(false);
  protected readonly shareOpen = signal(false);
  protected readonly exportOpen = signal(false);
  protected readonly exportDisabled = signal(false);
}
