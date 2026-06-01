import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  ForDialog,
  ForDialogBackdrop,
  ForDialogClose,
  type ForDialogCloseReason,
  ForDialogDescription,
  ForDialogManager,
  ForDialogTitle,
  ForDialogTrigger,
  injectDialogData,
  type VetoableEvent,
  type VetoableNativeEvent,
} from 'forty-cdk';

import { type ControlOption, ControlSelect } from '../ui/control-select';
import { ControlSwitch } from '../ui/control-switch';
import { DemoLayout } from '../ui/demo-layout';

interface ConfirmData {
  readonly title: string;
  readonly message: string;
}

type ConfirmResult = 'confirm' | 'cancel';

@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pg-dialog pg-dialog--pop' },
  imports: [ForDialogBackdrop, ForDialogTitle, ForDialogDescription, ForDialogClose],
  template: `
    <div forDialogBackdrop class="pg-backdrop"></div>
    <h2 forDialogTitle>{{ data.title }}</h2>
    <p forDialogDescription>{{ data.message }}</p>
    <div class="pg-dialog-actions">
      <button class="pg-btn" forDialogClose [closeWith]="cancel">Cancel</button>
      <button class="pg-btn pg-btn--danger" forDialogClose [closeWith]="confirm">Delete</button>
    </div>
  `,
})
export class ConfirmDialog {
  protected readonly data = injectDialogData<ConfirmData>();
  protected readonly cancel: ConfirmResult = 'cancel';
  protected readonly confirm: ConfirmResult = 'confirm';
}

@Component({
  selector: 'app-dialog-demo',
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
      title="Dialog"
      summary="Anatomy & options: trigger, title, description, backdrop and close button. Toggle modal, dismissible, alert, returnFocus and initialFocus to watch the role, focus trap, scroll lock and dismiss behavior change. Content portals to <body>, so its styles live in styles.css (global)."
      apgUrl="https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/"
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

    <playground-demo
      title="Guarded close"
      summary="Vetoable dismissals: (escapeKeyDown) and (interactOutside) fire before (close). Calling preventDefault() on the event keeps the dialog open — here, while 'block dismiss' is on. The close button always closes regardless. Modal with no backdrop, so the page behind is inert but undimmed."
      apgUrl="https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/"
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
        <app-control-switch label="block dismiss" [(checked)]="blockDismiss" />

        <p class="pg-state">
          last blocked: <b>{{ lastBlocked() ?? '—' }}</b
          ><br />last close: <b>{{ guardReason() ?? '—' }}</b>
        </p>
        <p class="pg-hint">
          With the lock on, Escape and click-outside are vetoed; Discard / Save still close.
        </p>
      </div>
    </playground-demo>

    <playground-demo
      title="Non-modal & keep focus"
      summary="modal=false drops the focus trap, scroll lock and inert siblings. autoFocusOnOpen vetoes the initial focus move so the search field keeps focus while you type; autoFocusOnClose returns focus to it on close. The panel has no visible title, so ariaLabel names it."
      apgUrl="https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/"
    >
      <div demo class="pg-search-demo">
        <input
          #search
          type="search"
          class="pg-input"
          placeholder="Search fruit…"
          aria-label="Search fruit"
          [value]="query()"
          (input)="onQuery($event)"
        />
        <p class="pg-hint">Type to open the results — focus never leaves this field.</p>
      </div>

      <div controls class="pg-controls">
        <app-control-switch label="autoFocusOnOpen keeps focus" [(checked)]="keepFocus" />

        <p class="pg-state">
          query: <b>{{ query() || '—' }}</b
          ><br />panel: <b>{{ searchOpen() ? 'open' : 'closed' }}</b>
        </p>
      </div>
    </playground-demo>

    <playground-demo
      title="Programmatic (ForDialogManager)"
      summary="Open a component imperatively and await its result. The manager mounts it under the same [forDialog] engine, so every piece works identically; [forDialogClose] [closeWith] propagates straight to ForDialogRef.close(value). Here as a non-dismissible alertdialog."
      apgUrl="https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/"
    >
      <div demo class="pg-center">
        <button class="pg-btn pg-btn--danger" type="button" (click)="askToDelete()">
          Delete account…
        </button>
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">
          last result: <b>{{ confirmResult() }}</b
          ><br />open dialogs: <b>{{ dialogs.openCount() }}</b>
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

    @if (guardOpen()) {
      <div
        forDialog
        id="pg-guarded"
        class="pg-dialog"
        (escapeKeyDown)="onGuardEscape($event)"
        (interactOutside)="onGuardInteractOutside($event)"
        (close)="onGuardClose($event)"
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

    @if (searchOpen()) {
      <div
        forDialog
        class="pg-dialog pg-dialog--top"
        [modal]="false"
        [dismissible]="false"
        ariaLabel="Search results"
        [autoFocusOnOpen]="keepSearchFocused"
        [autoFocusOnClose]="refocusSearch"
        (close)="searchOpen.set(false)"
        animate.enter="pg-panel-in"
      >
        <div class="pg-result-list">
          @for (item of results(); track item) {
            <div class="pg-row">{{ item }}</div>
          } @empty {
            <p class="pg-hint">No matches for "{{ query() }}".</p>
          }
        </div>
        <div class="pg-dialog-actions">
          <button class="pg-btn" forDialogClose>Close</button>
        </div>
      </div>
    }
  `,
  styles: `
    .pg-center {
      display: flex;
      justify-content: center;
    }

    .pg-search-demo {
      width: min(360px, 100%);
    }

    .pg-search-demo .pg-hint {
      margin: 0.7rem 0 0;
    }
  `,
})
export class DialogDemo {
  protected readonly dialogs = inject(ForDialogManager);

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

  protected readonly guardOpen = signal(false);
  protected readonly blockDismiss = signal(true);
  protected readonly draft = signal('');
  protected readonly lastBlocked = signal<string | null>(null);
  protected readonly guardReason = signal<ForDialogCloseReason | 'programmatic' | null>(null);

  protected readonly search = viewChild<ElementRef<HTMLInputElement>>('search');
  protected readonly searchOpen = signal(false);
  protected readonly query = signal('');
  protected readonly keepFocus = signal(true);
  readonly #fruits: readonly string[] = [
    'Apple',
    'Apricot',
    'Banana',
    'Blackberry',
    'Blueberry',
    'Cherry',
    'Grape',
    'Mango',
    'Orange',
    'Peach',
    'Pear',
    'Pineapple',
  ];
  protected readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    return q === '' ? this.#fruits : this.#fruits.filter((f) => f.toLowerCase().includes(q));
  });

  protected readonly confirmResult = signal('—');

  protected onClose(reason: ForDialogCloseReason): void {
    this.lastReason.set(reason);
    this.open.set(false);
  }

  protected confirm(): void {
    this.lastReason.set('programmatic');
    this.open.set(false);
  }

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

  protected onQuery(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.searchOpen.set(value.trim().length > 0);
  }

  protected readonly keepSearchFocused = (event: VetoableEvent): void => {
    if (this.keepFocus()) {
      event.preventDefault();
      this.search()?.nativeElement.focus();
    }
  };

  protected readonly refocusSearch = (): void => {
    this.search()?.nativeElement.focus();
  };

  protected async askToDelete(): Promise<void> {
    const ref = this.dialogs.open<ConfirmDialog, ConfirmResult, ConfirmData>(ConfirmDialog, {
      data: {
        title: 'Delete account?',
        message: 'This action is permanent and cannot be undone.',
      },
      alert: true,
      dismissible: false,
    });
    const result = await ref.closed;
    this.confirmResult.set(result ?? 'dismissed');
  }
}
