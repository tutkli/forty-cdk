import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  ForDrawer,
  ForDrawerBackdrop,
  type ForDrawerCloseReason,
  ForDrawerClose,
  ForDrawerHandle,
  type ForDrawerSide,
  type ForDrawerSnapPoint,
  ForDrawerTrigger,
  ForDrawerWrapper,
  type VetoableEvent,
} from 'forty-cdk';
import { queryFlag } from './_query-flag';

@Component({
  selector: 'app-drawer-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForDrawer,
    ForDrawerTrigger,
    ForDrawerBackdrop,
    ForDrawerHandle,
    ForDrawerClose,
    ForDrawerWrapper,
  ],
  styles: [
    `
      [forDrawerBackdrop] {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
      }
      [forDrawer] {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: white;
        padding: 16px;
        z-index: 1;
      }
      #shell {
        display: block;
        min-height: 200px;
        background: #f5f5f5;
        padding: 16px;
      }
    `,
  ],
  template: `
    <div id="shell" forDrawerWrapper>
      <input id="before" placeholder="before-trigger" />
      <button id="trigger" forDrawerTrigger [(open)]="open">Open drawer</button>
      <input id="after" placeholder="after-trigger" />
    </div>

    @if (open()) {
      <div
        forDrawer
        id="drawer"
        ariaLabel="Test drawer"
        [side]="side()"
        [snapPoints]="snapPoints()"
        [(activeSnapPoint)]="activeSnapPoint"
        [handleOnly]="handleOnly"
        [scaleBackground]="scaleBackground"
        [setBackgroundColorOnScale]="setBackgroundColorOnScale"
        [autoFocusOnOpen]="vetoOpen ? veto : undefined"
        [autoFocusOnClose]="vetoClose ? veto : undefined"
        (close)="onClose($event)"
      >
        @if (backdrop) {
          <div id="backdrop" forDrawerBackdrop></div>
        }
        <div id="handle" forDrawerHandle></div>
        <button id="first">First</button>
        <button id="second">Second</button>
        <input id="text-input" />
        <button id="close-btn" forDrawerClose>Close</button>

        @if (nested) {
          <button id="open-child" type="button" (click)="childOpen.set(true)">Open child</button>

          @if (childOpen()) {
            <div
              forDrawer
              id="child-drawer"
              ariaLabel="Child drawer"
              [scaleBackground]="scaleBackground"
              (close)="onChildClose($event)"
            >
              <button id="child-first">Child first</button>
              <button id="child-second">Child second</button>
              <button id="child-close" forDrawerClose>Child close</button>
            </div>
          }
        }
      </div>
    }

    <output id="last-close-reason">{{ lastCloseReason() ?? 'none' }}</output>
    <output id="last-child-close-reason">{{ lastChildCloseReason() ?? 'none' }}</output>
    <output id="active-snap">{{ activeSnapDisplay() }}</output>
  `,
})
export class DrawerFixture {
  protected readonly open = signal(false);
  protected readonly childOpen = signal(false);
  protected readonly lastCloseReason = signal<ForDrawerCloseReason | null>(null);
  protected readonly lastChildCloseReason = signal<ForDrawerCloseReason | null>(null);
  protected readonly activeSnapPoint = signal<ForDrawerSnapPoint | null>(null);

  readonly #route = inject(ActivatedRoute);

  protected readonly side = signal<ForDrawerSide>(
    (this.#route.snapshot.queryParamMap.get('side') as ForDrawerSide | null) ?? 'bottom',
  );

  protected readonly snapPoints = signal<ReadonlyArray<ForDrawerSnapPoint> | undefined>(
    parseSnapPoints(this.#route.snapshot.queryParamMap.get('snap')),
  );

  protected readonly vetoOpen = queryFlag('vetoOpen');
  protected readonly vetoClose = queryFlag('vetoClose');
  protected readonly handleOnly = queryFlag('handleOnly');
  protected readonly backdrop = queryFlag('backdrop');
  protected readonly scaleBackground = queryFlag('scaleBackground');
  protected readonly setBackgroundColorOnScale = !queryFlag('noBgColorOnScale');
  protected readonly nested = queryFlag('nested');

  protected readonly veto = (event: VetoableEvent): void => event.preventDefault();

  protected readonly activeSnapDisplay = computed(() => {
    const v = this.activeSnapPoint();
    return v == null ? 'none' : String(v);
  });

  protected onClose(reason: ForDrawerCloseReason): void {
    this.lastCloseReason.set(reason);
    this.open.set(false);
    // Cascade child closure when parent dismisses, so re-opening starts clean.
    this.childOpen.set(false);
  }

  protected onChildClose(reason: ForDrawerCloseReason): void {
    this.lastChildCloseReason.set(reason);
    this.childOpen.set(false);
  }
}

function parseSnapPoints(raw: string | null): ReadonlyArray<ForDrawerSnapPoint> | undefined {
  if (!raw) {
    return undefined;
  }
  return raw.split(',').map((piece) => {
    const trimmed = piece.trim();
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return Number.parseFloat(trimmed);
    }
    return trimmed as ForDrawerSnapPoint;
  });
}
