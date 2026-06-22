import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForDrawer,
  ForDrawerBackdrop,
  ForDrawerClose,
  type ForDrawerCloseReason,
  ForDrawerDescription,
  ForDrawerTitle,
  ForDrawerTrigger,
} from 'forty-cdk/drawer';

import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-drawer-region-scoped-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForDrawer,
    ForDrawerTrigger,
    ForDrawerBackdrop,
    ForDrawerTitle,
    ForDrawerDescription,
    ForDrawerClose,
  ],
  template: `
    <playground-demo
      title="Region-scoped (container)"
      subtitle="Set [container] to a positioned element and the drawer portals into that region instead of <body>. With modal on, the backdrop, focus trap, scroll lock and inert siblings are all scoped to the card — only this region is dimmed and trapped, while the rest of the page stays fully interactive."
      sourcePath="projects/forty-cdk-playground/src/app/demos/drawer/examples/region-scoped.example.ts"
    >
      <div demo class="pg-region" #region>
        <div class="pg-region-content">
          <h4 class="pg-region-heading">Project board</h4>
          <p class="pg-region-text">
            This card is the drawer's <code>container</code>. Open the panel — it slides in over
            this region only, focus stays trapped inside the card, and the page around it keeps
            working.
          </p>
          <button
            forDrawerTrigger
            class="pg-btn pg-btn--primary"
            [(open)]="open"
            controls="pg-region-drawer"
          >
            Open panel
          </button>
        </div>

        @if (open()) {
          <div
            forDrawer
            id="pg-region-drawer"
            class="pg-drawer"
            side="right"
            [modal]="true"
            [container]="region"
            [swipeToDismiss]="false"
            (dismiss)="onClose($event)"
            animate.enter="pg-drawer-in-right"
            animate.leave="pg-drawer-out-right"
          >
            <div
              forDrawerBackdrop
              class="pg-drawer-backdrop"
              animate.enter="pg-backdrop-in"
              animate.leave="pg-backdrop-out"
            ></div>
            <h2 forDrawerTitle class="pg-drawer-title">Filters</h2>
            <p forDrawerDescription class="pg-drawer-desc">
              Scoped to this card. Press Escape or click the dimmed area to dismiss.
            </p>
            <div class="pg-region-fields">
              <label class="pg-region-field">
                <input type="checkbox" checked />
                Active projects
              </label>
              <label class="pg-region-field">
                <input type="checkbox" />
                Archived
              </label>
              <label class="pg-region-field">
                <input type="checkbox" />
                Shared with me
              </label>
            </div>
            <div class="pg-drawer-actions">
              <button class="pg-btn" forDrawerClose>Done</button>
            </div>
          </div>
        }
      </div>

      <div controls class="pg-controls">
        <p class="pg-hint">
          The trigger lives inside the card. While the panel is open, the card content behind it is
          inert and dimmed, but you can still scroll the page and interact with everything outside
          the card.
        </p>
        <p class="pg-state">
          panel: <b>{{ open() ? 'open' : 'closed' }}</b
          ><br />last close: <b>{{ reason() ?? '—' }}</b>
        </p>
      </div>
    </playground-demo>
  `,
})
export class DrawerRegionScopedExample {
  protected readonly open = signal(false);
  protected readonly reason = signal<ForDrawerCloseReason | null>(null);

  protected onClose(reason: ForDrawerCloseReason): void {
    this.reason.set(reason);
    this.open.set(false);
  }
}
