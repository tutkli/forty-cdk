import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForDialog,
  ForDialogClose,
  type ForDialogCloseReason,
  ForDialogDescription,
  ForDialogTitle,
  ForDialogTrigger,
  type VetoableNativeEvent,
} from 'forty-cdk';

import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-dialog-guarded-close-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForDialog,
    ForDialogTrigger,
    ForDialogTitle,
    ForDialogDescription,
    ForDialogClose,
    ControlSwitch,
  ],
  template: `
    <playground-demo
      title="Guarded close"
      subtitle="Vetoable dismissals: (escapeKeyDown) and (interactOutside) fire before (dismiss). Calling preventDefault() on the event keeps the dialog open — here, while 'block dismiss' is on. The close button always closes regardless. Modal with no backdrop, so the page behind is inert but undimmed."
      sourcePath="projects/forty-cdk-playground/src/app/demos/dialog/examples/guarded-close.example.ts"
    >
      <div demo class="pg-center">
        <button
          forDialogTrigger
          class="pg-btn pg-btn--primary"
          [(open)]="guardOpen"
          controls="pg-guarded"
        >
          Edit note
        </button>
      </div>

      <div controls class="pg-controls">
        <app-control-switch
          label="block dismiss"
          hint="When on, calls preventDefault() on the (escapeKeyDown) and (interactOutside) vetoes so Escape and click-outside keep the dialog open. The close buttons still close it."
          [(checked)]="blockDismiss"
        />

        <p class="pg-state">
          last blocked: <b>{{ lastBlocked() ?? '—' }}</b
          ><br />last close: <b>{{ guardReason() ?? '—' }}</b>
        </p>
        <p class="pg-hint">
          With the lock on, Escape and click-outside are vetoed; Discard / Save still close.
        </p>
      </div>
    </playground-demo>

    @if (guardOpen()) {
      <div
        forDialog
        id="pg-guarded"
        class="pg-dialog"
        (escapeKeyDown)="onGuardEscape($event)"
        (interactOutside)="onGuardInteractOutside($event)"
        (dismiss)="onGuardClose($event)"
        animate.enter="pg-fade-in"
        animate.leave="pg-fade-out"
      >
        <h2 forDialogTitle>Edit note</h2>
        <p forDialogDescription>Make a change, then try Escape or click outside.</p>
        <label class="pg-field">
          <span class="pg-label">Note</span>
          <input class="pg-input" [value]="draft()" (input)="onDraftInput($event)" />
        </label>
        @if (blockDismiss()) {
          <div class="pg-dialog-warn" role="status">
            Dismiss is vetoed — use Discard or Save to close.
          </div>
        }
        <div class="pg-dialog-actions">
          <button class="pg-btn" forDialogClose>Discard</button>
          <button class="pg-btn pg-btn--primary" type="button" (click)="save()">Save</button>
        </div>
      </div>
    }
  `,
  styles: `
    .pg-center {
      display: flex;
      justify-content: center;
    }
  `,
})
export class DialogGuardedCloseExample {
  protected readonly guardOpen = signal(false);
  protected readonly blockDismiss = signal(true);
  protected readonly draft = signal('');
  protected readonly lastBlocked = signal<string | null>(null);
  protected readonly guardReason = signal<ForDialogCloseReason | 'programmatic' | null>(null);

  protected onGuardEscape(event: VetoableNativeEvent<KeyboardEvent>): void {
    if (this.blockDismiss()) {
      event.preventDefault();
      this.lastBlocked.set('escape');
    }
  }

  protected onGuardInteractOutside(event: VetoableNativeEvent<PointerEvent | FocusEvent>): void {
    if (this.blockDismiss()) {
      event.preventDefault();
      this.lastBlocked.set('interactOutside');
    }
  }

  protected onGuardClose(reason: ForDialogCloseReason): void {
    this.guardReason.set(reason);
    this.guardOpen.set(false);
  }

  protected save(): void {
    this.guardReason.set('programmatic');
    this.guardOpen.set(false);
  }

  protected onDraftInput(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value);
  }
}
