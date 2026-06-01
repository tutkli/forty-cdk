import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  ForDialog,
  ForDialogBackdrop,
  ForDialogClose,
  type ForDialogCloseReason,
  ForDialogDescription,
  ForDialogTitle,
  ForDialogTrigger,
} from 'forty-cdk';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-dialog-anatomy-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForDialog,
    ForDialogTrigger,
    ForDialogTitle,
    ForDialogDescription,
    ForDialogClose,
    ForDialogBackdrop,
    ControlSwitch,
    ControlSelect,
  ],
  template: `
    <playground-demo
      title="Anatomy & options"
      subtitle="Trigger, title, description, backdrop and close button. Toggle modal, dismissible, alert, returnFocus and initialFocus to watch the role, focus trap, scroll lock and dismiss behavior change. Content portals to <body>, so its styles live in styles.css (global)."
      sourcePath="projects/forty-cdk-playground/src/app/demos/dialog/examples/anatomy.example.ts"
    >
      <div demo class="pg-center">
        <button
          forDialogTrigger
          class="pg-btn pg-btn--primary"
          [(open)]="open"
          controls="pg-anatomy"
        >
          Open dialog
        </button>
      </div>

      <div controls class="pg-controls">
        <app-control-switch label="modal" [(checked)]="modal" />
        <app-control-switch label="dismissible" [(checked)]="dismissible" />
        <app-control-switch label="alert" [(checked)]="alert" />
        <app-control-switch label="returnFocus" [(checked)]="returnFocus" />
        <app-control-select
          label="initialFocus"
          [options]="initialFocusOptions"
          [(value)]="initialFocus"
        />

        <p class="pg-state">
          role: <b>{{ role() }}</b
          ><br />last close: <b>{{ lastReason() ?? '—' }}</b>
        </p>
      </div>
    </playground-demo>

    @if (open()) {
      <div
        forDialog
        id="pg-anatomy"
        class="pg-dialog"
        [modal]="modal()"
        [dismissible]="dismissible()"
        [alert]="alert()"
        [returnFocus]="returnFocus()"
        [initialFocus]="initialFocus()"
        (close)="onClose($event)"
        animate.enter="pg-fade-in"
        animate.leave="pg-fade-out"
      >
        <div
          forDialogBackdrop
          class="pg-backdrop"
          animate.enter="pg-backdrop-in"
          animate.leave="pg-backdrop-out"
        ></div>
        <h2 forDialogTitle>Delete account?</h2>
        <p forDialogDescription>This action is permanent and cannot be undone.</p>
        <div class="pg-dialog-actions">
          <button class="pg-btn" forDialogClose>Cancel</button>
          <button class="pg-btn pg-btn--primary" type="button" (click)="confirm()">Delete</button>
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
export class DialogAnatomyExample {
  protected readonly initialFocusOptions: readonly ControlOption<'first' | 'container'>[] = [
    { value: 'first', label: 'first' },
    { value: 'container', label: 'container' },
  ];

  protected readonly open = signal(false);
  protected readonly modal = signal(true);
  protected readonly dismissible = signal(true);
  protected readonly alert = signal(false);
  protected readonly returnFocus = signal(true);
  protected readonly initialFocus = signal<'first' | 'container'>('first');
  protected readonly lastReason = signal<ForDialogCloseReason | 'programmatic' | null>(null);
  protected readonly role = computed(() => (this.alert() ? 'alertdialog' : 'dialog'));

  protected onClose(reason: ForDialogCloseReason): void {
    this.lastReason.set(reason);
    this.open.set(false);
  }

  protected confirm(): void {
    this.lastReason.set('programmatic');
    this.open.set(false);
  }
}
