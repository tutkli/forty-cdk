import { booleanAttribute, Directive, input, output, signal, type Signal } from '@angular/core';

import { hostAriaLabel, hostDescribedBy, hostLabelledBy } from '../host-attributes/host-aria';
import { type ModalShellConfig } from './modal-shell';
import { type VetoableEvent, type VetoableNativeEvent } from '../vetoable-event/vetoable-event';
import { fortyError } from '../errors/errors';

/**
 * Abstract base for free-floating modal-surface primitives — a directive that
 * mounts a modal surface as its own root, coordinates label / description
 * registration, and drives its lifecycle through {@link injectModalShell}.
 * `ForDialog` and `ForDrawer` extend it; a future modal Toast / full-screen
 * sheet / command palette can too.
 *
 * The base owns everything the two surfaces used to duplicate verbatim: the
 * `aria-labelledby` / `aria-describedby` registry, the single-backdrop registry
 * (with the duplicate-registration throw), the `requestClose` dismissible
 * gating, the `lastCloseValue` bridge read by the programmatic managers, the
 * seven shared ARIA / state host bindings (`role`, `aria-modal`, `aria-label`,
 * `aria-labelledby`, `aria-describedby`, `data-state="open"`, `tabindex="-1"`),
 * the non-defaults inputs and dismiss outputs, and the {@link modalShellConfig}
 * factory. Anything primitive-specific (Drawer's drag / snap / scale / stack,
 * the four defaults-backed inputs each subclass seeds from its own
 * `FOR_<PRIMITIVE>_DEFAULTS`) stays on the subclass.
 *
 * The base deliberately does **not** call {@link injectModalShell} itself —
 * each subclass calls `injectModalShell(this.modalShellConfig())` from its own
 * constructor. A base-owned call would register its `afterNextRender` during
 * `super()`, before a subclass (Drawer) could register its own pre-shell
 * `afterNextRender` (stack push + snap validation), breaking the documented
 * ordering.
 *
 * Implemented as an `@Directive()`-decorated abstract class because Angular
 * recognises signal inputs / outputs and host bindings only when the
 * `input()` / `output()` calls and the `host` block appear on a decorated
 * class; inheritance is the supported mechanism for sharing them across
 * directives.
 *
 * Internal core tier — exported from `forty-cdk/core` for the library's own
 * entry points, with no semver guarantee. Subclassing a library base is not a
 * supported contract, so it is deliberately absent from `CORE_PUBLISHERS` and
 * from every primitive's own barrel; the public-types gate ignores
 * `extends`-only heritage, which is why the base may appear in the shipped
 * `.d.ts` as the parent of `[forDialog]` / `[forDrawer]` without being blessed.
 */
@Directive({
  host: {
    '[attr.role]': 'alert() ? "alertdialog" : "dialog"',
    '[attr.aria-modal]': 'modal() ? "true" : null',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-labelledby]': 'labelledBy()',
    '[attr.aria-describedby]': 'describedBy()',
    'data-state': 'open',
    tabindex: '-1',
  },
})
export abstract class ModalSurfaceBase<Reason extends string> {
  /** When true, role becomes `alertdialog` (interrupts assistive tech). */
  readonly alert = input(false, { transform: booleanAttribute });

  /**
   * Explicit element focus returns to on close, read at close time. Overrides
   * the element the shell captures at construction — supply it when this
   * surface can be constructed while focus lives inside a *different, doomed*
   * surface, the canonical case being a close→open swap in one change-detection
   * pass. The programmatic managers thread the true origin through this input
   * automatically; declarative consumers driving such a swap by hand can bind
   * it too. `null` (default) keeps the construction-time capture, so ordinary
   * usage is unaffected. Has no effect in non-modal mode (the shell never moves
   * focus on close then).
   */
  readonly returnFocusTarget = input<HTMLElement | null>(null);

  /** Manual `aria-label`. Use this when no visible title element exists. */
  readonly ariaLabel = input<string | null>(null);

  /**
   * Resolved `aria-label`: a consumer-set static value on the surface when
   * present, else the {@link ariaLabel} input.
   */
  protected readonly resolvedAriaLabel = hostAriaLabel(() => this.ariaLabel() || null);

  /**
   * Portal target for the surface. Defaults to `document.body`. Pair with
   * `[modal]="false"` for a surface scoped to a positioned region instead of
   * the viewport. Read once at mount. The backdrop portals to the same
   * container.
   */
  readonly container = input<HTMLElement | null>(null);

  /**
   * Callback invoked just before the surface moves focus into itself on mount.
   * Receives a `VetoableEvent`; call `event.preventDefault()` to skip the
   * imperative focus move — useful when opening from an input you want to keep
   * focused. The focus trap (modal mode) still cycles Tab inside the surface
   * once focus enters it.
   *
   * Bound as a function reference (`[autoFocusOnOpen]="onOpen"`), not as an
   * event binding. The callback shape (rather than an `output()`) lets the
   * shell invoke it during the destroy hook without depending on Angular's
   * `OutputEmitterRef` lifecycle.
   */
  readonly autoFocusOnOpen = input<((event: VetoableEvent) => void) | undefined>(undefined);

  /**
   * Callback invoked just before focus returns to the previously focused
   * element on unmount. Receives a `VetoableEvent`; call
   * `event.preventDefault()` to skip the return-focus — useful when the
   * consumer wants to send focus elsewhere imperatively. Fires reliably on
   * both close paths: the `(dismiss)` output flow AND a direct
   * `open.set(false)` from the consumer.
   */
  readonly autoFocusOnClose = input<((event: VetoableEvent) => void) | undefined>(undefined);

  /**
   * Whether dismiss interactions (Escape, backdrop, outside interaction, and
   * any primitive-specific gesture) close the surface. Implemented by the
   * subclass so its default can be seeded from the primitive's scope defaults.
   */
  abstract readonly dismissible: Signal<boolean>;

  /**
   * Whether the surface activates modal semantics (`aria-modal`, focus trap,
   * body scroll lock, inert siblings). Implemented by the subclass so its
   * default can be seeded from the primitive's scope defaults.
   */
  abstract readonly modal: Signal<boolean>;

  /**
   * Whether focus returns to the previously focused element on close.
   * Implemented by the subclass so its default can be seeded from the
   * primitive's scope defaults.
   */
  abstract readonly returnFocus: Signal<boolean>;

  /**
   * Where to send focus on mount — `'first'` (first focusable descendant) or
   * `'container'` (the surface host). Implemented by the subclass so its
   * default can be seeded from the primitive's scope defaults.
   */
  abstract readonly initialFocus: Signal<'first' | 'container'>;

  /**
   * Entry-point name the shared surface errors report under, e.g. `'dialog'`.
   * The subclass supplies it because the shell's checks are shared while the
   * `[forty-cdk/<scope>]` prefix a consumer reads must name the primitive they
   * actually wrote.
   */
  protected abstract readonly entryPoint: string;

  /**
   * Emitted when the surface wants to close. Consumers wire this to flip the
   * signal that gates the surrounding `@if`. The reason union is
   * primitive-specific.
   */
  readonly dismiss = output<Reason>();

  /**
   * Fires when the user presses Escape while this surface is the topmost
   * dismissible layer. Call `preventDefault()` on the emitted veto to suppress
   * the subsequent `(dismiss)` emission. The original `KeyboardEvent` is on
   * `.event`.
   */
  readonly escapeKeyDown = output<VetoableNativeEvent<KeyboardEvent>>();

  /**
   * Fires when a pointer goes down outside the surface. Call `preventDefault()`
   * on the emitted veto to suppress the auto `(dismiss)`. The native
   * `PointerEvent` is on `.event`.
   */
  readonly pointerDownOutside = output<VetoableNativeEvent<PointerEvent>>();

  /**
   * Fires when focus moves outside the surface. `preventDefault()` on the veto
   * suppresses the auto `(dismiss)`. The native `FocusEvent` is on `.event`.
   */
  readonly focusOutside = output<VetoableNativeEvent<FocusEvent>>();

  /**
   * Composite event: fires alongside `pointerDownOutside` and `focusOutside`
   * and shares their veto state — `preventDefault()` on either one suppresses
   * the auto `(dismiss)`.
   */
  readonly interactOutside = output<VetoableNativeEvent<PointerEvent | FocusEvent>>();

  readonly #labelIds = signal<readonly string[]>([]);
  readonly #describedByIds = signal<readonly string[]>([]);
  readonly #backdropEl = signal<HTMLElement | null>(null);
  readonly #lastCloseValue = signal<unknown>(undefined);

  /**
   * Resolved `aria-labelledby`: a consumer-set static value when present, else
   * the space-joined ids of the registered titles, or `null` when none.
   */
  readonly labelledBy = hostLabelledBy(() => {
    const ids = this.#labelIds();
    return ids.length === 0 ? null : ids.join(' ');
  });

  /**
   * Resolved `aria-describedby`: a consumer-set static value composed with the
   * space-joined ids of the registered descriptions, or `null` when neither is
   * present.
   */
  readonly describedBy = hostDescribedBy(() => {
    const ids = this.#describedByIds();
    return ids.length === 0 ? null : ids.join(' ');
  });

  /** Register a title element's id into `aria-labelledby`. */
  registerLabel(id: string): void {
    this.#labelIds.update((arr) => (arr.includes(id) ? arr : [...arr, id]));
  }

  /** Remove a title element's id from `aria-labelledby`. */
  unregisterLabel(id: string): void {
    this.#labelIds.update((arr) => arr.filter((x) => x !== id));
  }

  /** Register a description element's id into `aria-describedby`. */
  registerDescription(id: string): void {
    this.#describedByIds.update((arr) => (arr.includes(id) ? arr : [...arr, id]));
  }

  /** Remove a description element's id from `aria-describedby`. */
  unregisterDescription(id: string): void {
    this.#describedByIds.update((arr) => arr.filter((x) => x !== id));
  }

  /**
   * Register the backdrop element so the dismissible layer treats it as part
   * of the surface (`exemptElements`). Throws when a second backdrop is
   * registered on the same surface. Pass `null` to unregister.
   */
  registerBackdrop(el: HTMLElement | null): void {
    const current = this.#backdropEl();
    if (el !== null && current !== null && current !== el) {
      throw fortyError({
        code: 'FORCDK-CORE-001',
        scope: this.entryPoint,
        message: 'A modal surface registered a second backdrop; only one is allowed.',
        fix: 'Keep a single backdrop element inside the surface.',
      });
    }
    this.#backdropEl.set(el);
  }

  /**
   * Request that the surface close. `'closeButton'` and `'programmatic'` always
   * emit `(dismiss)`; every other reason is gated on `dismissible()`. `value`
   * is the close result, captured for the programmatic managers' close bridge.
   */
  requestClose(reason: Reason, value?: unknown): void {
    if (reason !== 'closeButton' && reason !== 'programmatic' && !this.dismissible()) {
      return;
    }
    this.#lastCloseValue.set(value);
    this.dismiss.emit(reason);
  }

  /**
   * The `value` argument from the most recent `requestClose(reason, value)`
   * call. Read by the programmatic managers to bridge `[for…Close] [closeWith]`
   * into `For…Ref.close(value)`. Part of the internal composition surface with
   * no semver guarantee; declarative consumers never need this.
   */
  readonly lastCloseValue = this.#lastCloseValue.asReadonly();

  /**
   * The registered backdrop element, or `null` when none is rendered. Read by
   * the programmatic managers' surface registrar so `beginLeave` drives the
   * backdrop's exit animation by direct reference instead of a document query.
   * Part of the internal composition surface with no semver guarantee;
   * declarative consumers never need this.
   */
  readonly backdropElement = this.#backdropEl.asReadonly();

  protected modalShellConfig(): ModalShellConfig {
    return {
      modal: this.modal,
      returnFocus: this.returnFocus,
      returnFocusTarget: this.returnFocusTarget,
      initialFocus: this.initialFocus,
      container: this.container,
      autoFocusOnOpen: () => this.autoFocusOnOpen(),
      autoFocusOnClose: () => this.autoFocusOnClose(),
      dismiss: {
        dismissible: this.dismissible,
        requestClose: (reason) => this.requestClose(reason as Reason),
        emitEscapeKeyDown: (veto) => this.escapeKeyDown.emit(veto),
        emitPointerDownOutside: (veto) => this.pointerDownOutside.emit(veto),
        emitFocusOutside: (veto) => this.focusOutside.emit(veto),
        emitInteractOutside: (veto) => this.interactOutside.emit(veto),
        exemptElements: () => {
          const backdrop = this.#backdropEl();
          return backdrop ? [backdrop] : [];
        },
      },
    };
  }
}
