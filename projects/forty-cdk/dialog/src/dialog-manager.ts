import {
  createComponent,
  inject,
  Injectable,
  InjectionToken,
  type Injector,
  type Provider,
  type Type,
} from '@angular/core';

import {
  resolveConfigClass,
  OverlayManagerCore,
  type VetoableEvent,
  type VetoableNativeEvent,
} from 'forty-cdk/core';
import {
  FOR_DIALOG_CONTEXT,
  type ForDialogCloseReason,
  FOR_DIALOG_INSTANCE_ID,
} from './dialog-context';
import { FOR_DIALOG_DEFAULTS } from './dialog-defaults';
import type { ForDialogEntry } from './dialog-outlet';
import { ForDialogOutlet } from './dialog-outlet';
import { ForDialogRef } from './dialog-ref';

/**
 * Injection token for the `data` payload passed to `ForDialogManager.open(component, { data })`.
 * The manager always provides this token, falling back to `null` when no `data`
 * was configured, so inject it inside the opened component:
 *
 * ```ts
 * readonly data = inject(FOR_DIALOG_DATA) as MyShape | null;
 * ```
 *
 * Prefer `injectDialogData<T>()` for typed access without manual casts.
 */
export const FOR_DIALOG_DATA = new InjectionToken<unknown>('FOR_DIALOG_DATA');

/**
 * Typed accessor for the `data` payload. Returns `T | null` because the manager
 * provides `null` when `open()` is called without `data` — guard for `null`
 * before dereferencing the payload.
 */
export function injectDialogData<T = unknown>(): T | null {
  return inject(FOR_DIALOG_DATA) as T | null;
}

export interface ForDialogOpenConfig<D = unknown> {
  /** Payload available inside the dialog component via `injectDialogData<T>()`. */
  data?: D;

  /** When true (default), Escape closes the dialog. */
  dismissible?: boolean;

  /** When true (default), set `aria-modal`, lock body scroll, trap focus. */
  modal?: boolean;

  /** When true, role becomes `alertdialog` instead of `dialog`. Default `false`. */
  alert?: boolean;

  /** When true (default), focus returns to the previously focused element on close. */
  returnFocus?: boolean;

  /**
   * Explicit element focus returns to on close. Omit it (the default) and the
   * manager resolves the true origin automatically — the trigger that opened
   * the modal chain, threaded across a close→open swap so a confirm dialog
   * replacing a form dialog restores focus to the original trigger rather than
   * dropping it to `<body>` (#1385). Pass an element to override that
   * resolution, or `null` to opt out entirely and fall back to the element the
   * dialog captures at construction.
   */
  returnFocusTarget?: HTMLElement | null;

  /** Where to send focus on open. Default `'first'`. */
  initialFocus?: 'first' | 'container';

  /** Manual `aria-label`. Use when no visible title element is rendered. */
  ariaLabel?: string;

  /**
   * Portal target for the surface + backdrop. Defaults to `document.body`.
   * Pair with `modal: false` for a dialog scoped to a positioned region
   * instead of the viewport.
   */
  container?: HTMLElement | null;

  /**
   * CSS class applied (via `animate.enter`) to the overlay root the moment it
   * mounts, so a programmatic dialog plays an enter animation just like a
   * declarative `<div forDialog animate.enter="…">`. The class lands on the
   * same `[forDialog]` host as {@link class}. Falls back to
   * `provideForDialogDefaults({ animateEnter })`.
   */
  animateEnter?: string;

  /**
   * CSS class applied to the overlay root when `close()` is called. The
   * manager keeps the host mounted with this class until its CSS animations /
   * transitions finish, then tears the dialog down — so a programmatic dialog
   * plays an exit animation. `close()` still resolves its promise and flips
   * `isClosed()` immediately; only the visual teardown waits. With no class (or
   * no animation, or under `prefers-reduced-motion`), close is immediate. Falls
   * back to `provideForDialogDefaults({ animateLeave })`.
   */
  animateLeave?: string;

  /**
   * Exit-animation class for the portaled `[forDialogBackdrop]`: the manager
   * adds it when `close()` is called and keeps the backdrop mounted until the
   * animation finishes, so the backdrop fades out in lockstep with the host.
   *
   * The split with the enter animation is intentional, not an oversight.
   * Declare the backdrop's **enter** with `animate.enter="…"` on the element
   * itself — it fires on mount, which Angular runs normally even inside the
   * manager's `ngComponentOutlet` — and declare only its **leave** here. A
   * template `animate.leave` on the backdrop never fires under the manager:
   * Angular does not run leave animations across the `ngComponentOutlet` the
   * opened component is mounted through. (The host box is symmetric — both
   * `animateEnter` and `animateLeave` are config, since the manager owns that
   * element.) Falls back to `provideForDialogDefaults({ backdropAnimateLeave })`.
   */
  backdropAnimateLeave?: string;

  /**
   * Consumer CSS class(es) applied to the overlay root (the `[forDialog]`
   * host). Pass a single class (`'my-dialog'`) or a space-separated string
   * (`'my-dialog my-dialog--pop'`). Merged with the directive's own host
   * attributes — it never clobbers `data-state` / `role` / `aria-modal`.
   *
   * Use this to carry design-system classes onto a programmatic dialog: the
   * host is created class-less and the literal `[forDialog]` attribute is
   * absent, so without this the consumer has no node to style. For multiple
   * classes as an array, prefer {@link classList}.
   */
  class?: string;
  /**
   * Consumer CSS class(es) applied to the overlay root, as an array
   * (`['my-dialog', 'my-dialog--pop']`) or a space-separated string. Merged
   * with {@link class} and with the directive's own host attributes.
   */
  classList?: string | readonly string[];

  /** Extra providers for the opened component's injector (alongside `FOR_DIALOG_DATA` + `ForDialogRef`). */
  providers?: Provider[];

  /**
   * Caller scope for this `open()`. When supplied, `ForDialogManager` resolves
   * `provideForDialogDefaults` from this injector (instead of the root injector
   * it was constructed in) and parents the opened component on it — so a scoped
   * defaults configuration and any other scoped providers (a lazy route, a
   * component `providers`) reach the programmatic dialog. Per-`open()` config
   * values still win over the resolved scoped defaults. Omit it to keep today's
   * root-scope behavior. Pass the ambient `inject(Injector)` from the caller —
   * `open()` is normally invoked outside an injection context, so an explicit
   * handle is the predictable contract.
   */
  injector?: Injector;

  /**
   * Fires just before the dialog moves focus into itself on mount.
   * Call `event.preventDefault()` to skip the imperative focus move
   * — useful when opening a dialog from an input you want to keep
   * focused. The focus trap (modal mode) still cycles Tab once focus
   * enters the dialog.
   */
  autoFocusOnOpen?: (event: VetoableEvent) => void;

  /**
   * Fires just before focus returns to the previously focused element
   * on unmount. Call `event.preventDefault()` to skip the return-focus.
   */
  autoFocusOnClose?: (event: VetoableEvent) => void;

  /**
   * Per-channel dismiss hook mirroring the declarative `(escapeKeyDown)`
   * output. Fires when Escape is pressed while this dialog is the topmost
   * dismissable layer. Call `event.preventDefault()` on the veto to suppress
   * the implicit close while keeping the other dismiss channels live — the
   * programmatic equivalent of `(escapeKeyDown)="$event.preventDefault()"`.
   * The original `KeyboardEvent` is on `.event`.
   */
  escapeKeyDown?: (event: VetoableNativeEvent<KeyboardEvent>) => void;

  /**
   * Per-channel dismiss hook mirroring the declarative `(pointerDownOutside)`
   * output. Fires when a pointer goes down outside the dialog. Call
   * `event.preventDefault()` on the veto to suppress the implicit close. The
   * native `PointerEvent` is on `.event`.
   */
  pointerDownOutside?: (event: VetoableNativeEvent<PointerEvent>) => void;

  /**
   * Per-channel dismiss hook mirroring the declarative `(focusOutside)`
   * output. Fires when focus moves outside the dialog. Call
   * `event.preventDefault()` on the veto to suppress the implicit close. The
   * native `FocusEvent` is on `.event`.
   */
  focusOutside?: (event: VetoableNativeEvent<FocusEvent>) => void;

  /**
   * Composite dismiss hook mirroring the declarative `(interactOutside)`
   * output. Fires alongside `pointerDownOutside` / `focusOutside` and shares
   * their veto state — `event.preventDefault()` on either suppresses the
   * implicit close. Use this to keep a programmatic floater open on outside
   * interaction while leaving Escape live (set `dismissible: true` and veto
   * here). The native `PointerEvent | FocusEvent` is on `.event`.
   */
  interactOutside?: (event: VetoableNativeEvent<PointerEvent | FocusEvent>) => void;
}

interface InternalDialogEntry extends ForDialogEntry {
  readonly ref: ForDialogRef<unknown>;
}

/**
 * Programmatic dialog opener — open a component as a modal dialog from
 * TypeScript. Inject anywhere, call `open(MyComponent, { data, ... })` and get a
 * `ForDialogRef<R>` back. Internally the manager renders the user component
 * inside a manager-owned `@for` outlet, so Angular's control-flow unmount
 * fires `animate.leave` before the node leaves the DOM — identical to the
 * declarative `@if (open()) { <div forDialog animate.leave="…"> }` path.
 *
 * Inside the opened component the usual dialog pieces work without any extra
 * wiring: `[forDialogTitle]`, `[forDialogDescription]`, `[forDialogBackdrop]`,
 * `[forDialogClose]`. `[forDialogClose] [closeWith]` propagates through to
 * `ForDialogRef.close(value)`.
 *
 * Inject `ForDialogRef` to drive close imperatively and `FOR_DIALOG_DATA` (or
 * `injectDialogData<T>()`) for the payload.
 *
 * **When the overlay DOM is available.** In the common case the dialog mounts
 * synchronously, so a `document.querySelector('[role="dialog"]')` right after
 * `open()` finds it. When `open()` is called from within change detection — an
 * `effect`, `ngOnInit`, or an `afterNextRender` callback — the synchronous
 * mount is deferred to the next render (a nested change-detection tick is
 * illegal), so query the DOM after the next render. The returned
 * `ForDialogRef` is usable immediately in both cases.
 */
@Injectable({ providedIn: 'root' })
export class ForDialogManager extends OverlayManagerCore<ForDialogEntry> {
  readonly #defaults = inject(FOR_DIALOG_DEFAULTS);

  constructor() {
    super({
      idPrefix: 'for-dialog-instance',
      idAttribute: 'data-for-dialog-id',
      backdropAttribute: 'data-for-dialog-backdrop',
      createOutlet: (environmentInjector) =>
        createComponent(ForDialogOutlet, { environmentInjector }),
    });
  }

  open<C, R = unknown, D = unknown>(
    component: Type<C>,
    config: ForDialogOpenConfig<D> = {},
  ): ForDialogRef<R> {
    const { id, remove } = this.nextId();

    const returnFocusTarget =
      config.returnFocusTarget !== undefined
        ? config.returnFocusTarget
        : this.resolveReturnFocusTarget();

    const defaults = config.injector
      ? config.injector.get(FOR_DIALOG_DEFAULTS, this.#defaults)
      : this.#defaults;

    const animateEnter = config.animateEnter ?? defaults.animateEnter;
    const animateLeave = config.animateLeave ?? defaults.animateLeave;
    const backdropAnimateLeave = config.backdropAnimateLeave ?? defaults.backdropAnimateLeave;

    const ref = new ForDialogRef<R>(
      () => this.beginLeave(id, animateLeave, backdropAnimateLeave, remove),
      'programmatic',
    );

    const hostClass = resolveConfigClass(config) ?? '';
    const data = config.data ?? null;

    const entry: InternalDialogEntry = {
      id,
      component: component as Type<unknown>,
      hostClass,
      dismissible: config.dismissible ?? defaults.dismissible,
      modal: config.modal ?? defaults.modal,
      alert: config.alert,
      returnFocus: config.returnFocus ?? defaults.returnFocus,
      returnFocusTarget,
      initialFocus: config.initialFocus ?? defaults.initialFocus,
      ariaLabel: config.ariaLabel,
      container: config.container,
      animateEnter,
      autoFocusOnOpen: config.autoFocusOnOpen,
      autoFocusOnClose: config.autoFocusOnClose,
      escapeKeyDown: config.escapeKeyDown,
      pointerDownOutside: config.pointerDownOutside,
      focusOutside: config.focusOutside,
      interactOutside: config.interactOutside,
      ref: ref as ForDialogRef<unknown>,
      handleClose(reason: ForDialogCloseReason, value: unknown): void {
        ref.close(value as R, reason);
      },
      injectorFor: this.createInjectorFactory(
        [
          { provide: FOR_DIALOG_DATA, useValue: data },
          { provide: FOR_DIALOG_INSTANCE_ID, useValue: id },
          { provide: ForDialogRef, useValue: ref },
          ...(config.providers ?? []),
        ],
        config.injector
          ? { injector: config.injector, contextToken: FOR_DIALOG_CONTEXT }
          : undefined,
      ),
    };

    this.register(entry);

    return ref;
  }
}
