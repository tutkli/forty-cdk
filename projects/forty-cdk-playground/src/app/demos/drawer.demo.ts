import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  FOR_DRAWER_CONTEXT,
  ForDrawer,
  ForDrawerBackdrop,
  ForDrawerClose,
  type ForDrawerCloseReason,
  ForDrawerDescription,
  ForDrawerHandle,
  ForDrawerManager,
  type ForDrawerSide,
  type ForDrawerSnapPoint,
  ForDrawerTitle,
  ForDrawerTrigger,
  ForDrawerWrapper,
  injectDrawerData,
} from 'forty-cdk';

import { DemoLayout } from '../ui/demo-layout';

interface ConfirmData {
  readonly title: string;
  readonly message: string;
}

type ConfirmResult = 'confirm' | 'cancel';

@Component({
  selector: 'app-confirm-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForDrawerBackdrop, ForDrawerHandle, ForDrawerTitle, ForDrawerDescription, ForDrawerClose],
  template: `
    <div
      forDrawerBackdrop
      class="pg-drawer-backdrop"
      animate.enter="pg-backdrop-in"
      animate.leave="pg-backdrop-out"
    ></div>
    <div forDrawerHandle class="pg-drawer-handle"></div>
    <h2 forDrawerTitle class="pg-drawer-title">{{ data.title }}</h2>
    <p forDrawerDescription class="pg-drawer-desc">{{ data.message }}</p>
    <div class="pg-drawer-actions">
      <button class="pg-btn" forDrawerClose [closeWith]="cancel">Cancel</button>
      <button class="pg-btn pg-btn--danger" forDrawerClose [closeWith]="confirm">Delete</button>
    </div>
  `,
})
export class ConfirmDrawer {
  protected readonly data = injectDrawerData<ConfirmData>();
  protected readonly cancel: ConfirmResult = 'cancel';
  protected readonly confirm: ConfirmResult = 'confirm';

  constructor() {
    inject(FOR_DRAWER_CONTEXT).hostElement.classList.add('pg-drawer');
  }
}

@Component({
  selector: 'app-drawer-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForDrawer,
    ForDrawerTrigger,
    ForDrawerBackdrop,
    ForDrawerHandle,
    ForDrawerTitle,
    ForDrawerDescription,
    ForDrawerClose,
    ForDrawerWrapper,
  ],
  template: `
    <playground-demo
      title="Drawer"
      summary="A side / bottom-sheet built on the Modal Dialog pattern — focus trap, scroll lock, Escape, dismissable layer and portal, plus pointer-driven swipe-to-dismiss and Vaul-style snap points. Surfaces portal to <body>, so their CSS lives in styles.css (global)."
      apgUrl="https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/"
    >
      <div demo class="pg-center">
        <button
          forDrawerTrigger
          class="pg-btn pg-btn--primary"
          [(open)]="basicOpen"
          controls="pg-basic-drawer"
        >
          Open drawer
        </button>
      </div>

      <div controls class="pg-controls">
        <div class="pg-field">
          <span class="pg-label">side</span>
          <select class="pg-select" [value]="basicSide()" (change)="setBasicSide($event)">
            <option value="bottom">bottom</option>
            <option value="top">top</option>
            <option value="left">left</option>
            <option value="right">right</option>
          </select>
        </div>
        <label class="pg-check">
          <input type="checkbox" [checked]="basicModal()" (change)="basicModal.set(isChecked($event))" />
          modal
        </label>
        <label class="pg-check">
          <input
            type="checkbox"
            [checked]="basicDismissible()"
            (change)="basicDismissible.set(isChecked($event))"
          />
          dismissible
        </label>
        <label class="pg-check">
          <input type="checkbox" [checked]="basicAlert()" (change)="basicAlert.set(isChecked($event))" />
          alert
        </label>
        <label class="pg-check">
          <input
            type="checkbox"
            [checked]="basicHandleOnly()"
            (change)="basicHandleOnly.set(isChecked($event))"
          />
          handleOnly
        </label>
        <label class="pg-check">
          <input
            type="checkbox"
            [checked]="basicSwipe()"
            (change)="basicSwipe.set(isChecked($event))"
          />
          swipeToDismiss
        </label>

        <p class="pg-state">last close: <b>{{ basicReason() ?? '—' }}</b></p>
      </div>
    </playground-demo>

    <playground-demo
      title="Snap points"
      summary="Vaul-style snap points: drag the sheet between peek / half / full. Release resolves to the nearest snap by position (or dismisses past the lowest one). The consumer positions each snap via CSS keyed off data-active-snap-point; data-dragging disables the transition mid-gesture."
      apgUrl="https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/"
    >
      <div demo class="pg-center">
        <button
          forDrawerTrigger
          class="pg-btn pg-btn--primary"
          [(open)]="snapOpen"
          controls="pg-snap-drawer"
        >
          Open bottom sheet
        </button>
      </div>

      <div controls class="pg-controls">
        <label class="pg-check">
          <input type="checkbox" [checked]="snapFade()" (change)="snapFade.set(isChecked($event))" />
          fade backdrop from "half"
        </label>

        <p class="pg-state">active snap: <b>{{ snapActiveDisplay() }}</b></p>
        <p class="pg-hint">Jump-to-snap buttons live inside the sheet — clicking outside a modal drawer dismisses it.</p>
      </div>
    </playground-demo>

    <playground-demo
      title="Scale background"
      summary="Vaul's shouldScaleBackground: the [forDrawerWrapper] shell scales and rounds its corners behind the drawer. In a real app the wrapper wraps the whole screen; here it wraps the panel below so the effect stays self-contained."
      apgUrl="https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/"
    >
      <div demo class="pg-center">
        <div class="pg-scale-stage" forDrawerWrapper>
          <div class="pg-scale-screen">
            <span class="pg-scale-badge">Your app</span>
            <h3>App screen</h3>
            <p>This panel is wrapped by <code>[forDrawerWrapper]</code>.</p>
            <button
              forDrawerTrigger
              class="pg-btn pg-btn--primary"
              [(open)]="scaleOpen"
              controls="pg-scale-drawer"
            >
              Open drawer
            </button>
          </div>
        </div>
      </div>

      <div controls class="pg-controls">
        <label class="pg-check">
          <input
            type="checkbox"
            [checked]="scaleBgColor()"
            (change)="scaleBgColor.set(isChecked($event))"
          />
          setBackgroundColorOnScale
        </label>

        <p class="pg-state">drawer: <b>{{ scaleOpen() ? 'open' : 'closed' }}</b></p>
      </div>
    </playground-demo>

    <playground-demo
      title="Nested drawers"
      summary="A drawer mounted inside another joins a LIFO stack automatically — no flag needed. The parent recedes (data-state-nested), focus stays trapped in the topmost, scroll-lock is refcounted, and Escape closes the topmost first."
      apgUrl="https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/"
    >
      <div demo class="pg-center">
        <button
          forDrawerTrigger
          class="pg-btn pg-btn--primary"
          [(open)]="nestedOpen"
          controls="pg-nested-parent"
        >
          Open parent drawer
        </button>
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">parent: <b>{{ nestedOpen() ? 'open' : 'closed' }}</b><br />child: <b>{{ nestedChildOpen() ? 'open' : 'closed' }}</b></p>
      </div>
    </playground-demo>

    <playground-demo
      title="Programmatic (ForDrawerManager)"
      summary="Open an arbitrary component imperatively and await its result. The manager mounts the component under the same [forDrawer] engine, so every piece and input works identically; [forDrawerClose] [closeWith] propagates straight through to ForDrawerRef.close(value)."
      apgUrl="https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/"
    >
      <div demo class="pg-center">
        <button class="pg-btn pg-btn--danger" type="button" (click)="askConfirm()">
          Delete account…
        </button>
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">last result: <b>{{ confirmResult() }}</b></p>
      </div>
    </playground-demo>

    @if (basicOpen()) {
      <div
        forDrawer
        id="pg-basic-drawer"
        class="pg-drawer"
        [side]="basicSide()"
        [modal]="basicModal()"
        [dismissible]="basicDismissible()"
        [alert]="basicAlert()"
        [handleOnly]="basicHandleOnly()"
        [swipeToDismiss]="basicSwipe()"
        (close)="onBasicClose($event)"
        [animate.enter]="basicEnter()"
        [animate.leave]="basicLeave()"
      >
        <div
          forDrawerBackdrop
          class="pg-drawer-backdrop"
          animate.enter="pg-backdrop-in"
          animate.leave="pg-backdrop-out"
        ></div>
        @if (basicVertical()) {
          <div forDrawerHandle class="pg-drawer-handle"></div>
        }
        <h2 forDrawerTitle class="pg-drawer-title">Drawer title</h2>
        <p forDrawerDescription class="pg-drawer-desc">
          Swipe toward the edge, press Escape, or click the backdrop to dismiss.
        </p>
        <div class="pg-drawer-actions">
          <button class="pg-btn" forDrawerClose>Close</button>
        </div>
      </div>
    }

    @if (snapOpen()) {
      <div
        forDrawer
        id="pg-snap-drawer"
        class="pg-drawer"
        [snapPoints]="snapPoints"
        [(activeSnapPoint)]="snapActive"
        [fadeFromIndex]="snapFade() ? 1 : undefined"
        (close)="snapOpen.set(false)"
        animate.enter="pg-drawer-in-bottom"
        animate.leave="pg-drawer-out-bottom"
      >
        <div
          forDrawerBackdrop
          class="pg-drawer-backdrop"
          [class.pg-drawer-backdrop--fade]="snapFade()"
        ></div>
        <div forDrawerHandle class="pg-drawer-handle"></div>
        <h2 forDrawerTitle class="pg-drawer-title">Snap points</h2>
        <div class="pg-btn-row">
          <button class="pg-btn" type="button" (click)="snapActive.set(peek)">Peek</button>
          <button class="pg-btn" type="button" (click)="snapActive.set(half)">Half</button>
          <button class="pg-btn" type="button" (click)="snapActive.set(full)">Full</button>
        </div>
        <div class="pg-drawer-scroll">
          @for (item of snapItems; track item) {
            <div class="pg-row">{{ item }}</div>
          }
        </div>
      </div>
    }

    @if (scaleOpen()) {
      <div
        forDrawer
        id="pg-scale-drawer"
        class="pg-drawer"
        [scaleBackground]="true"
        [setBackgroundColorOnScale]="scaleBgColor()"
        (close)="scaleOpen.set(false)"
        animate.enter="pg-drawer-in-bottom"
        animate.leave="pg-drawer-out-bottom"
      >
        <div forDrawerHandle class="pg-drawer-handle"></div>
        <h2 forDrawerTitle class="pg-drawer-title">Scaled background</h2>
        <p forDrawerDescription class="pg-drawer-desc">
          The wrapper behind receded and rounded its corners.
        </p>
        <div class="pg-drawer-actions">
          <button class="pg-btn" forDrawerClose>Close</button>
        </div>
      </div>
    }

    @if (nestedOpen()) {
      <div
        forDrawer
        id="pg-nested-parent"
        class="pg-drawer"
        (close)="nestedOpen.set(false)"
        animate.enter="pg-drawer-in-bottom"
        animate.leave="pg-drawer-out-bottom"
      >
        <div
          forDrawerBackdrop
          class="pg-drawer-backdrop"
          animate.enter="pg-backdrop-in"
          animate.leave="pg-backdrop-out"
        ></div>
        <div forDrawerHandle class="pg-drawer-handle"></div>
        <h2 forDrawerTitle class="pg-drawer-title">Parent drawer</h2>
        <p forDrawerDescription class="pg-drawer-desc">
          Open a nested drawer — the parent recedes and Escape closes the topmost first.
        </p>
        <div class="pg-drawer-actions">
          <button class="pg-btn pg-btn--primary" type="button" (click)="nestedChildOpen.set(true)">
            Open nested
          </button>
          <button class="pg-btn" forDrawerClose>Close</button>
        </div>

        @if (nestedChildOpen()) {
          <div
            forDrawer
            id="pg-nested-child"
            class="pg-drawer"
            (close)="nestedChildOpen.set(false)"
            animate.enter="pg-drawer-in-bottom"
            animate.leave="pg-drawer-out-bottom"
          >
            <div forDrawerHandle class="pg-drawer-handle"></div>
            <h2 forDrawerTitle class="pg-drawer-title">Nested drawer</h2>
            <p forDrawerDescription class="pg-drawer-desc">
              data-depth="1". Escape closes me first, then the parent.
            </p>
            <div class="pg-drawer-actions">
              <button class="pg-btn" forDrawerClose>Close</button>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: `
    .pg-center {
      display: flex;
      justify-content: center;
    }

    .pg-scale-stage {
      width: 100%;
      max-width: 420px;
      border-radius: var(--pg-radius);
      border: 1px solid var(--pg-border);
      background: var(--pg-surface-2);
      overflow: hidden;
    }

    .pg-scale-screen {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.55rem;
      min-height: 280px;
      padding: 1.75rem;
    }

    .pg-scale-badge {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--pg-text-muted);
    }

    .pg-scale-screen h3 {
      margin: 0;
      font-size: 1.2rem;
    }

    .pg-scale-screen p {
      margin: 0;
      font-size: 0.9rem;
      color: var(--pg-text-muted);
    }

    .pg-scale-screen button {
      margin-top: 0.5rem;
    }
  `,
})
export class DrawerDemo {
  readonly #drawers = inject(ForDrawerManager);

  protected readonly basicOpen = signal(false);
  protected readonly basicSide = signal<ForDrawerSide>('bottom');
  protected readonly basicModal = signal(true);
  protected readonly basicDismissible = signal(true);
  protected readonly basicAlert = signal(false);
  protected readonly basicHandleOnly = signal(false);
  protected readonly basicSwipe = signal(true);
  protected readonly basicReason = signal<ForDrawerCloseReason | null>(null);

  protected readonly basicVertical = computed(
    () => this.basicSide() === 'bottom' || this.basicSide() === 'top',
  );
  protected readonly basicEnter = computed(() => `pg-drawer-in-${this.basicSide()}`);
  protected readonly basicLeave = computed(() => `pg-drawer-out-${this.basicSide()}`);

  protected readonly peek: ForDrawerSnapPoint = '148px';
  protected readonly half: ForDrawerSnapPoint = 0.5;
  protected readonly full: ForDrawerSnapPoint = 1;
  protected readonly snapPoints: ReadonlyArray<ForDrawerSnapPoint> = [this.peek, this.half, this.full];
  protected readonly snapItems = Array.from({ length: 14 }, (_, i) => `List item ${i + 1}`);

  protected readonly snapOpen = signal(false);
  protected readonly snapActive = signal<ForDrawerSnapPoint | null>(this.peek);
  protected readonly snapFade = signal(false);
  protected readonly snapActiveDisplay = computed(() => {
    const value = this.snapActive();
    return value == null ? '—' : String(value);
  });

  protected readonly scaleOpen = signal(false);
  protected readonly scaleBgColor = signal(false);

  protected readonly nestedOpen = signal(false);
  protected readonly nestedChildOpen = signal(false);

  protected readonly confirmResult = signal('—');

  protected isChecked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  protected setBasicSide(event: Event): void {
    this.basicSide.set((event.target as HTMLSelectElement).value as ForDrawerSide);
  }

  protected onBasicClose(reason: ForDrawerCloseReason): void {
    this.basicReason.set(reason);
    this.basicOpen.set(false);
  }

  protected async askConfirm(): Promise<void> {
    const ref = this.#drawers.open<ConfirmDrawer, ConfirmResult>(ConfirmDrawer, {
      data: {
        title: 'Delete account?',
        message: 'This action is permanent and cannot be undone.',
      },
      side: 'bottom',
      ariaLabel: 'Delete account',
    });
    const result = await ref.closed;
    this.confirmResult.set(result ?? 'dismissed');
  }
}
