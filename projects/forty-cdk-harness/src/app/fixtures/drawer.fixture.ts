import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  ForDrawer,
  ForDrawerBackdrop,
  type ForDrawerCloseReason,
  ForDrawerClose,
  type ForDrawerDragEvent,
  ForDrawerHandle,
  type ForDrawerReleaseEvent,
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
        /* border-box keeps an explicit height query param (drawerHeight) */
        /* equal to the rect the directive measures; the default content-box */
        /* would add 2 * padding (32px) on top, so e2e geometry assertions */
        /* see the actual requested dimension. */
        box-sizing: border-box;
      }
      /*
       * The bare [forDrawerHandle] div renders 0 px tall by default, which
       * means a Playwright drag started on its bounding box has nowhere to
       * attach. Visual styling here is purely a fixture-side affordance
       * so e2e specs can drive page.mouse.down/move/up against the handle.
       */
      [forDrawerHandle] {
        height: 16px;
        margin-bottom: 8px;
        background: #ddd;
        border-radius: 4px;
      }
      [data-testid='shell'] {
        display: block;
        min-height: 200px;
        background: #f5f5f5;
        padding: 16px;
      }
    `,
  ],
  template: `
    <div data-testid="shell" forDrawerWrapper>
      <input data-testid="before" placeholder="before-trigger" />
      <button data-testid="trigger" forDrawerTrigger [(open)]="open">Open drawer</button>
      <input data-testid="after" placeholder="after-trigger" />
    </div>

    @if (open()) {
      <div
        forDrawer
        data-testid="drawer"
        ariaLabel="Test drawer"
        [side]="side()"
        [snapPoints]="snapPoints()"
        [(activeSnapPoint)]="activeSnapPoint"
        [handleOnly]="handleOnly"
        [scaleBackground]="scaleBackground"
        [setBackgroundColorOnScale]="setBackgroundColorOnScale"
        [autoFocusOnOpen]="vetoOpen ? veto : undefined"
        [autoFocusOnClose]="vetoClose ? veto : undefined"
        [style.height.px]="drawerHeightPx()"
        [closeThreshold]="closeThresholdValue()"
        (close)="onClose($event)"
        (drag)="onDrag($event)"
        (release)="onRelease($event)"
      >
        @if (backdrop) {
          <div data-testid="backdrop" forDrawerBackdrop></div>
        }
        <div data-testid="handle" forDrawerHandle></div>
        <button data-testid="first">First</button>
        <button data-testid="second">Second</button>
        <input data-testid="text-input" />
        <button data-testid="close-btn" forDrawerClose>Close</button>

        @if (nested) {
          <button data-testid="open-child" type="button" (click)="childOpen.set(true)">
            Open child
          </button>

          @if (childOpen()) {
            <div
              forDrawer
              data-testid="child-drawer"
              ariaLabel="Child drawer"
              [scaleBackground]="scaleBackground"
              (close)="onChildClose($event)"
            >
              <button data-testid="child-first">Child first</button>
              <button data-testid="child-second">Child second</button>
              <button data-testid="child-close" forDrawerClose>Child close</button>
            </div>
          }
        }
      </div>
    }

    <output data-testid="last-close-reason">{{ lastCloseReason() ?? 'none' }}</output>
    <output data-testid="last-child-close-reason">{{ lastChildCloseReason() ?? 'none' }}</output>
    <output data-testid="active-snap">{{ activeSnapDisplay() }}</output>
    <output data-testid="drag-count">{{ dragCount() }}</output>
    <output data-testid="last-drag-percent">{{ lastDragPercent() }}</output>
    <output data-testid="release-count">{{ releaseCount() }}</output>
    <output data-testid="last-release-will-close">{{ lastReleaseWillClose() }}</output>
    <output data-testid="last-release-next-snap">{{ lastReleaseNextSnap() }}</output>
  `,
})
export class DrawerFixture {
  protected readonly open = signal(false);
  protected readonly childOpen = signal(false);
  protected readonly lastCloseReason = signal<ForDrawerCloseReason | null>(null);
  protected readonly lastChildCloseReason = signal<ForDrawerCloseReason | null>(null);

  // Drag / release telemetry. Updated from the (drag) / (release) outputs and
  // mirrored into <output> elements so Playwright specs can poll them as text.
  // Keep numbers + booleans only — anything richer (e.g. PointerEvent shape)
  // would have to be serialised by hand on every emit.
  protected readonly dragCount = signal(0);
  protected readonly lastDragPercent = signal('none');
  protected readonly releaseCount = signal(0);
  protected readonly lastReleaseWillClose = signal('none');
  protected readonly lastReleaseNextSnap = signal('none');

  readonly #route = inject(ActivatedRoute);

  protected readonly activeSnapPoint = signal<ForDrawerSnapPoint | null>(
    parseInitialSnap(this.#route.snapshot.queryParamMap.get('initialSnap')),
  );

  protected readonly side = signal<ForDrawerSide>(
    (this.#route.snapshot.queryParamMap.get('side') as ForDrawerSide | null) ?? 'bottom',
  );

  protected readonly snapPoints = signal<ReadonlyArray<ForDrawerSnapPoint> | undefined>(
    parseSnapPoints(this.#route.snapshot.queryParamMap.get('snap')),
  );

  protected readonly drawerHeightPx = signal<number | null>(
    parseHeight(this.#route.snapshot.queryParamMap.get('drawerHeight')),
  );

  protected readonly closeThresholdValue = signal<number>(
    parseCloseThreshold(this.#route.snapshot.queryParamMap.get('closeThreshold')),
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

  protected onDrag(event: ForDrawerDragEvent): void {
    this.dragCount.update((n) => n + 1);
    this.lastDragPercent.set(event.percentageDragged.toFixed(4));
  }

  protected onRelease(event: ForDrawerReleaseEvent): void {
    this.releaseCount.update((n) => n + 1);
    this.lastReleaseWillClose.set(String(event.willClose));
    this.lastReleaseNextSnap.set(event.nextSnapPoint == null ? 'null' : String(event.nextSnapPoint));
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

function parseHeight(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Parse the `?closeThreshold=…` fixture override. Falls back to the
 * directive's own default (`0.25`) when the param is absent or invalid, so
 * existing specs that don't set it keep their current behaviour.
 */
function parseCloseThreshold(raw: string | null): number {
  if (!raw) return 0.25;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1) return 0.25;
  return n;
}

/**
 * Parse the `?initialSnap=…` query param into a `ForDrawerSnapPoint`. Used by
 * E2E specs that need the drawer to start at a non-default snap entry (e.g.
 * the snap-point resolution case, where dragging down from the topmost snap
 * has to land on a middle one). Same shape as `parseSnapPoints` per-entry —
 * a bare number is parsed as a fraction; everything else stays a string and
 * the directive validates the shape itself.
 */
function parseInitialSnap(raw: string | null): ForDrawerSnapPoint | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number.parseFloat(trimmed);
  }
  return trimmed as ForDrawerSnapPoint;
}
