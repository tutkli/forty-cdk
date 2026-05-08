import {
  afterNextRender,
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  DOCUMENT,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { BodyScrollLock } from '../_internal/body-scroll-lock/body-scroll-lock';
import { injectDismissableLayer } from '../_internal/dismissable-layer/dismissable-layer';
import { findFirstFocusable, injectFocusTrap } from '../_internal/focus-trap/focus-trap';
import {
  type InertSiblingsHandle,
  InertSiblingsStack,
} from '../_internal/inert-siblings/inert-siblings';
import { injectPortal } from '../_internal/portal/portal';
import {
  createVetoableEvent,
  createVetoableNativeEvent,
  emitVetoableNativeEvent,
  type VetoableEvent,
  type VetoableNativeEvent,
} from '../_internal/vetoable-event/vetoable-event';
import {
  FOR_DIALOG_CONTEXT,
  type ForDialogCloseReason,
  type ForDialogContext,
} from './dialog-context';

/**
 * Headless implementation of the [WAI-ARIA Modal Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
 *
 * Apply `[forDialog]` on the dialog box itself — not on a wrapper. The
 * directive moves the host to `document.body` (portal), traps focus, locks
 * body scroll, and listens for Escape while mounted. `aria-labelledby`
 * and `aria-describedby` wire automatically via `[forDialogTitle]` /
 * `[forDialogDescription]`; pass `ariaLabel` instead if you don't render
 * a visible title.
 *
 * Mount/unmount is the consumer's responsibility — the directive does
 * not manage `[hidden]`. Wrap with `@if (open())` and let
 * `animate.enter` / `animate.leave` handle transitions:
 *
 * ```html
 * @if (dialogOpen()) {
 *   <div forDialog (close)="dialogOpen.set(false)" animate.leave="fade-out">
 *     <h2 forDialogTitle>Confirm</h2>
 *     <button forDialogClose>Cancel</button>
 *   </div>
 * }
 * ```
 *
 * For programmatic use (open arbitrary components imperatively), see
 * `ForDialogManager.open()`.
 */
@Directive({
  selector: '[forDialog]',
  exportAs: 'forDialog',
  host: {
    '[attr.role]': 'alert() ? "alertdialog" : "dialog"',
    '[attr.aria-modal]': 'modal() ? "true" : null',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.aria-labelledby]': 'labelledBy()',
    '[attr.aria-describedby]': 'describedBy()',
    'data-state': 'open',
    tabindex: '-1',
  },
  providers: [{ provide: FOR_DIALOG_CONTEXT, useExisting: ForDialog }],
})
export class ForDialog implements ForDialogContext {
  /**
   * When true (default), Escape, backdrop click, pointer-down outside, and
   * focus outside emit `(close)`. Disable for critical confirm flows that
   * must be answered explicitly via `[forDialogClose]`.
   */
  readonly dismissible = input(true, { transform: booleanAttribute });

  /**
   * When true (default), sets `aria-modal="true"`, locks body scroll, and
   * traps focus. Set to `false` for non-modal popups (rare for dialogs).
   */
  readonly modal = input(true, { transform: booleanAttribute });

  /** When true, role becomes `alertdialog` (interrupts assistive tech). */
  readonly alert = input(false, { transform: booleanAttribute });

  /** When true (default), focus returns to the previously focused element on close. */
  readonly returnFocus = input(true, { transform: booleanAttribute });

  /**
   * Where to send focus on mount. `'first'` (default) finds the first
   * focusable descendant; `'container'` focuses the dialog box itself
   * (useful when there's nothing focusable inside).
   */
  readonly initialFocus = input<'first' | 'container'>('first');

  /** Manual `aria-label`. Use this when no visible title element exists. */
  readonly ariaLabel = input<string | null>(null);

  /**
   * Emitted when the dialog wants to close. Consumers wire this to flip
   * the signal that gates the surrounding `@if`. Reasons: `'escape'`,
   * `'backdrop'`, `'pointerDownOutside'`, `'focusOutside'`,
   * `'closeButton'`, `'programmatic'`.
   */
  readonly close = output<ForDialogCloseReason>();

  /**
   * Fires when the user presses Escape while this dialog is the topmost
   * dismissable layer. Call `preventDefault()` on the emitted veto to
   * suppress the subsequent `(close)` emission (e.g. to ask for
   * confirmation first). The original `KeyboardEvent` is available on
   * `.event` for inspection.
   */
  readonly escapeKeyDown = output<VetoableNativeEvent<KeyboardEvent>>();

  /**
   * Fires when a pointer goes down outside the dialog. Call
   * `preventDefault()` on the emitted veto to suppress the auto `(close)`.
   * The native `PointerEvent` is available on `.event`.
   */
  readonly pointerDownOutside = output<VetoableNativeEvent<PointerEvent>>();

  /**
   * Fires when focus moves outside the dialog (e.g. user tabs out of a
   * non-modal dialog). `preventDefault()` on the veto suppresses the auto
   * `(close)`. The native `FocusEvent` is available on `.event`.
   */
  readonly focusOutside = output<VetoableNativeEvent<FocusEvent>>();

  /**
   * Composite event: fires alongside `pointerDownOutside` and
   * `focusOutside` and shares their veto state — `preventDefault()` on
   * either one suppresses the auto `(close)`.
   */
  readonly interactOutside = output<VetoableNativeEvent<PointerEvent | FocusEvent>>();

  /**
   * Callback invoked just before the dialog moves focus into itself on
   * mount. Receives a `VetoableEvent`; call `event.preventDefault()` to
   * skip the imperative focus move — useful when opening a dialog from
   * an input you want to keep focused. The focus trap (modal mode) still
   * cycles Tab inside the dialog once focus enters it.
   *
   * Bound as a function reference (`[autoFocusOnOpen]="onOpen"`), not as
   * an event binding. Symmetric with `ForDialogManager`'s
   * `config.autoFocusOnOpen`. The callback shape (rather than an
   * `output()`) lets the directive invoke it during the destroy hook
   * without depending on Angular's `OutputEmitterRef` lifecycle.
   */
  readonly autoFocusOnOpen = input<((event: VetoableEvent) => void) | undefined>(undefined);

  /**
   * Callback invoked just before focus returns to the previously
   * focused element on unmount. Receives a `VetoableEvent`; call
   * `event.preventDefault()` to skip the return-focus — useful when
   * the consumer wants to send focus elsewhere imperatively (e.g. a
   * confirmation toast).
   *
   * Bound as a function reference (`[autoFocusOnClose]="onClose"`), not
   * as an event binding. Fires reliably on both close paths: the
   * `(close)` output flow AND a direct `open.set(false)` from the
   * consumer. Symmetric with `ForDialogManager`'s
   * `config.autoFocusOnClose`.
   */
  readonly autoFocusOnClose = input<((event: VetoableEvent) => void) | undefined>(undefined);

  readonly #labelIds = signal<readonly string[]>([]);
  readonly #describedByIds = signal<readonly string[]>([]);

  readonly labelledBy = computed<string | null>(() => {
    const ids = this.#labelIds();
    return ids.length === 0 ? null : ids.join(' ');
  });
  readonly describedBy = computed<string | null>(() => {
    const ids = this.#describedByIds();
    return ids.length === 0 ? null : ids.join(' ');
  });

  readonly #focusTrap = injectFocusTrap();
  readonly #dismissable = injectDismissableLayer();
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #inertStack = inject(InertSiblingsStack);
  readonly #scrollLock = inject(BodyScrollLock);
  readonly #document = inject(DOCUMENT);

  // Captured once on mount so cleanup can mirror the same mode regardless
  // of whether the consumer toggles `modal()` on a doomed instance.
  #activatedAsModal = false;
  #inertHandle: InertSiblingsHandle | null = null;
  // Captured synchronously in the constructor (before `afterNextRender`).
  // Required for WebKit return-focus correctness (#136): WebKit blurs the
  // previously-focused element when an ancestor receives `inert`, so by the
  // time `afterNextRender` fires (where inert is activated) reading
  // `document.activeElement` from the focus trap would yield `<body>`. The
  // constructor reads it before that side-effect, locking in the trigger
  // as the return target. Combined with `ForDialogTrigger` re-focusing
  // itself in `onClick` to defeat WebKit's separate mousedown-blurs-button
  // quirk, this gives a stable target across both browsers.
  readonly #returnFocusTarget: HTMLElement | null;

  constructor() {
    this.#returnFocusTarget =
      this.#document.activeElement instanceof HTMLElement ? this.#document.activeElement : null;
    injectPortal();

    // Run setup *after* Angular has applied input bindings (reading
    // `this.modal()` in the constructor would always see the default).
    afterNextRender(() => {
      const isModal = this.modal();
      this.#activatedAsModal = isModal;

      // Push the dismissable layer onto the stack *before* moving focus
      // so that focusin events triggered by our own focus management
      // land on this layer, not on whatever lower layer was previously
      // topmost.
      //
      // `pointerDownOutside` / `focusOutside` and `interactOutside` fire
      // on the same physical interaction; the layer always invokes the
      // specific listener before the composite one. We build a single
      // veto wrapper on the specific call and reuse it for the composite
      // call so a `preventDefault()` in either handler vetoes the close.
      let pendingOutsideVeto: VetoableNativeEvent<PointerEvent | FocusEvent> | null = null;
      this.#dismissable.activate({
        onEscapeKeyDown: (event) => {
          const vetoed = emitVetoableNativeEvent(this.escapeKeyDown, event);
          if (!vetoed && this.dismissible()) {
            event.stopPropagation();
            this.requestClose('escape');
          }
        },
        onPointerDownOutside: (event) => {
          pendingOutsideVeto = createVetoableNativeEvent<PointerEvent | FocusEvent>(event);
          this.pointerDownOutside.emit(pendingOutsideVeto as VetoableNativeEvent<PointerEvent>);
        },
        onFocusOutside: (event) => {
          pendingOutsideVeto = createVetoableNativeEvent<PointerEvent | FocusEvent>(event);
          this.focusOutside.emit(pendingOutsideVeto as VetoableNativeEvent<FocusEvent>);
        },
        onInteractOutside: (event) => {
          const veto =
            pendingOutsideVeto ?? createVetoableNativeEvent<PointerEvent | FocusEvent>(event);
          pendingOutsideVeto = null;
          this.interactOutside.emit(veto);
          if (!veto.defaultPrevented && this.dismissible()) {
            this.requestClose(event.type === 'pointerdown' ? 'pointerDownOutside' : 'focusOutside');
          }
        },
      });

      // Let the consumer veto the imperative focus move. The trap is
      // still set up (Tab cycling, return-focus capture) — only the
      // initial `.focus()` call is skipped.
      const autoFocusOpenEvent = createVetoableEvent();
      this.autoFocusOnOpen()?.(autoFocusOpenEvent);
      const skipInitialFocus = autoFocusOpenEvent.defaultPrevented;

      if (isModal) {
        // Inert + aria-hidden the rest of the document. Pushed BEFORE the
        // focus trap activates so that the trap's `focus()` call lands on
        // an element whose siblings are already isolated from AT. The
        // return-focus target was captured synchronously in the constructor
        // (see `#returnFocusTarget`) — WebKit blurs the previously-focused
        // element by the time `afterNextRender` fires, so we cannot read
        // `document.activeElement` here.
        this.#inertHandle = this.#inertStack.activate(this.#host.nativeElement);
        this.#focusTrap.activate({
          initialFocus: this.initialFocus(),
          preventInitialFocus: skipInitialFocus,
          returnFocus: this.#returnFocusTarget,
        });
        this.#scrollLock.lock();
      } else if (!skipInitialFocus) {
        // Non-modal: still send focus, no trap.
        const host = this.#focusTrap.container;
        if (this.initialFocus() === 'container') {
          host.focus();
        } else {
          (findFirstFocusable(host) ?? host).focus();
        }
      }
    });

    inject(DestroyRef).onDestroy(() => {
      this.#dismissable.deactivate();
      if (this.#activatedAsModal) {
        // Lift inert + aria-hidden BEFORE moving focus back: an `inert`
        // ancestor blocks `.focus()` on its descendants, so the
        // return-focus target needs to be live again first.
        this.#inertHandle?.deactivate();
        this.#inertHandle = null;
        // Invoke the consumer's `autoFocusOnClose` callback synchronously
        // here — fires reliably regardless of close path (the `(close)`
        // output flow AND a direct `open.set(false)` from the consumer).
        // No `OutputEmitterRef`-lifecycle dependency: input signals are
        // still readable during the destroy hook, and the callback is a
        // plain function reference.
        const autoFocusCloseEvent = createVetoableEvent();
        this.autoFocusOnClose()?.(autoFocusCloseEvent);
        const skipReturnFocus = autoFocusCloseEvent.defaultPrevented;
        // Suppress the dismissable-layer dispatcher across focus-return so
        // the synthetic `focusin` triggered by `.focus()`-ing the previous
        // element does not cascade-dismiss whatever dialog is now topmost
        // (a stacked dialog opened above this one).
        this.#dismissable.suppress(() => {
          this.#focusTrap.deactivate({
            returnFocus: this.returnFocus() && !skipReturnFocus,
          });
        });
        this.#scrollLock.unlock();
      }
      // Non-modal mode never activated the trap and never moves focus on
      // close, so there's nothing to veto — `autoFocusOnClose` only
      // fires from the modal path.
    });
  }

  registerLabel(id: string): void {
    this.#labelIds.update((arr) => (arr.includes(id) ? arr : [...arr, id]));
  }
  unregisterLabel(id: string): void {
    this.#labelIds.update((arr) => arr.filter((x) => x !== id));
  }
  registerDescription(id: string): void {
    this.#describedByIds.update((arr) => (arr.includes(id) ? arr : [...arr, id]));
  }
  unregisterDescription(id: string): void {
    this.#describedByIds.update((arr) => arr.filter((x) => x !== id));
  }

  requestClose(reason: ForDialogCloseReason, _value?: unknown): void {
    if (reason !== 'closeButton' && reason !== 'programmatic' && !this.dismissible()) {
      return;
    }
    // The `autoFocusOnClose` callback fires from the destroy hook (after
    // the consumer's `(close)` listener flips the `@if`-gating signal),
    // so it stays consistent across both close paths: this output-driven
    // flow AND a direct `open.set(false)` that bypasses `requestClose`
    // entirely.
    this.close.emit(reason);
  }
}
