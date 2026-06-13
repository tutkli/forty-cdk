import {
  ApplicationRef,
  computed,
  createComponent,
  DOCUMENT,
  EnvironmentInjector,
  inject,
  Injectable,
  InjectionToken,
  Injector,
  type Provider,
  signal,
  type Type,
} from '@angular/core';

import { resolveConfigClass } from '../_internal/class-list/resolve-config-class';
import { IdGenerator } from '../_internal/id-generator/id-generator';
import {
  type VetoableEvent,
  type VetoableNativeEvent,
} from '../_internal/vetoable-event/vetoable-event';
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

  /** Where to send focus on open. Default `'first'`. */
  initialFocus?: 'first' | 'container';

  /** Manual `aria-label`. Use when no visible title element is rendered. */
  ariaLabel?: string;

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
 * Programmatic dialog opener — the headless equivalent of CDK's `Dialog`.
 * Inject anywhere, call `open(MyComponent, { data, ... })` and get a
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
 */
@Injectable({ providedIn: 'root' })
export class ForDialogManager {
  readonly #appRef = inject(ApplicationRef);
  readonly #envInjector = inject(EnvironmentInjector);
  readonly #idGen = inject(IdGenerator);
  readonly #defaults = inject(FOR_DIALOG_DEFAULTS);
  readonly #document = inject(DOCUMENT);

  readonly #entries = signal<readonly InternalDialogEntry[]>([]);

  /** Reactive count of currently open programmatic dialogs (useful for diagnostics). */
  readonly openCount = computed(() => this.#entries().length);

  #outletRef: ReturnType<typeof createComponent<ForDialogOutlet>> | null = null;
  #destroying = false;

  #closeAllForDestroy(): void {
    this.#destroying = true;
    for (const entry of this.#entries()) {
      entry.ref.close();
    }
  }

  #beginLeave(id: string, leaveClass: string | undefined, remove: () => void): void {
    if (this.#destroying || !leaveClass || typeof requestAnimationFrame === 'undefined') {
      remove();
      return;
    }
    const host = this.#document.querySelector<HTMLElement>(`[data-for-dialog-id="${id}"]`);
    if (!host || typeof host.getAnimations !== 'function') {
      remove();
      return;
    }
    host.classList.add(leaveClass);
    requestAnimationFrame(() => {
      const animations = host.getAnimations();
      if (animations.length === 0) {
        remove();
        return;
      }
      Promise.all(animations.map((animation) => animation.finished.catch(() => undefined))).then(
        () => remove(),
      );
    });
  }

  open<C, R = unknown, D = unknown>(
    component: Type<C>,
    config: ForDialogOpenConfig<D> = {},
  ): ForDialogRef<R> {
    this.#ensureOutlet();

    const id = this.#idGen.next('for-dialog-instance');
    let removed = false;
    const remove = (): void => {
      if (removed) {
        return;
      }
      removed = true;
      this.#entries.update((arr) => arr.filter((e) => e.id !== id));
    };

    const animateEnter = config.animateEnter ?? this.#defaults.animateEnter;
    const animateLeave = config.animateLeave ?? this.#defaults.animateLeave;

    const ref = new ForDialogRef<R>(() => this.#beginLeave(id, animateLeave, remove));

    const hostClass = resolveConfigClass(config) ?? '';
    const consumerProviders = config.providers ?? [];
    const data = config.data ?? null;

    let cachedInjector: Injector | null = null;
    let cachedParent: Injector | null = null;

    const entry: InternalDialogEntry = {
      id,
      component: component as Type<unknown>,
      hostClass,
      dismissible: config.dismissible,
      modal: config.modal,
      alert: config.alert,
      returnFocus: config.returnFocus,
      initialFocus: config.initialFocus,
      ariaLabel: config.ariaLabel,
      animateEnter,
      autoFocusOnOpen: config.autoFocusOnOpen,
      autoFocusOnClose: config.autoFocusOnClose,
      escapeKeyDown: config.escapeKeyDown,
      pointerDownOutside: config.pointerDownOutside,
      focusOutside: config.focusOutside,
      interactOutside: config.interactOutside,
      ref: ref as ForDialogRef<unknown>,
      handleClose(value: unknown): void {
        ref.close(value as R);
      },
      injectorFor(parent: Injector): Injector {
        if (cachedInjector && cachedParent === parent) {
          return cachedInjector;
        }
        cachedParent = parent;
        cachedInjector = Injector.create({
          parent,
          providers: [
            { provide: FOR_DIALOG_DATA, useValue: data },
            { provide: ForDialogRef, useValue: ref },
            ...consumerProviders,
          ],
        });
        return cachedInjector;
      },
    };

    this.#entries.update((arr) => [...arr, entry]);
    this.#appRef.tick();

    return ref;
  }

  #ensureOutlet(): void {
    if (this.#outletRef) {
      return;
    }
    const outletRef = createComponent(ForDialogOutlet, {
      environmentInjector: this.#envInjector,
    });
    this.#appRef.attachView(outletRef.hostView);
    outletRef.instance.init({
      entries: this.#entries.asReadonly(),
      closeAllForDestroy: () => this.#closeAllForDestroy(),
    });
    this.#outletRef = outletRef;
  }
}
