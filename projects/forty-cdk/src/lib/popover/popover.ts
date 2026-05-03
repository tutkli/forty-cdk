import {
  booleanAttribute,
  computed,
  Directive,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
} from '@angular/core';
import type { Placement } from '@floating-ui/dom';

import type { FloatingAlign, FloatingSide } from '../_internal/floating/floating';
import { IdGenerator } from '../_internal/id-generator/id-generator';
import { FOR_POPOVER_CONTEXT, ForPopoverContext } from './popover-context';

/**
 * Headless implementation of the [WAI-ARIA Modeless Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/),
 * positioned against an internal trigger via `@floating-ui/dom`.
 *
 * Apply `[forPopover]` on a wrapper (the trigger and the content's `@if`
 * live inside it). The directive owns open state, ids, and the registries
 * that wire trigger / content / title / description / arrow together.
 *
 * Mount/unmount of the visible content is the consumer's responsibility —
 * wrap `[forPopoverContent]` with `@if (open())` and let `animate.enter` /
 * `animate.leave` handle transitions:
 *
 * ```html
 * <div forPopover [(open)]="isOpen">
 *   <button forPopoverTrigger>Open</button>
 *   @if (isOpen()) {
 *     <div forPopoverContent animate.leave="fade-out">…</div>
 *   }
 * </div>
 * ```
 *
 * Non-modal: focus is sent into the popover on open and returned to the
 * trigger on close, but Tab is allowed to leave the surface (use Dialog
 * if you need a focus trap).
 */
@Directive({
  selector: '[forPopover]',
  exportAs: 'forPopover',
  host: {
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
  providers: [{ provide: FOR_POPOVER_CONTEXT, useExisting: ForPopover }],
})
export class ForPopover implements ForPopoverContext {
  readonly #idGen = inject(IdGenerator);

  /**
   * Two-way bindable. Whether the popover is currently shown. The `model()`
   * change emitter (`(openChange)`) fires only on internal transitions
   * (trigger click, Escape, outside dismissal), never on consumer writes
   * via `[(open)]` — observe state changes without binding back.
   */
  readonly open = model<boolean>(false);

  /**
   * Floating-ui placement (e.g. `'bottom'`, `'bottom-start'`). Default
   * `'bottom'`. Legacy single-string API — new code should prefer the
   * `side` + `align` pair, which compose to the same placement.
   */
  readonly placement = input<Placement>('bottom');

  /**
   * Side the popover is anchored to. When set, takes precedence over
   * `placement`. Pair with `align` for the full positioning API
   * (`side="bottom" align="start"` ≡ `placement="bottom-start"`).
   */
  readonly side = input<FloatingSide | undefined>(undefined);

  /** Alignment along the chosen `side`. Defaults to `'center'`. */
  readonly align = input<FloatingAlign | undefined>(undefined);

  /**
   * Gap (px) between trigger and content along the *main* axis (perpendicular
   * to `side`). Default `8`. Forwarded to floating-ui's `offset` middleware.
   * Legacy alias kept for backward compatibility — new code should use
   * `sideOffset` instead.
   */
  readonly offset = input<number>(8);

  /**
   * Gap (px) along the main axis. When set, overrides the legacy `offset`.
   * Identical semantics to Radix's `sideOffset`.
   */
  readonly sideOffset = input(undefined, {
    transform: (v: unknown): number | undefined => (v == null ? undefined : numberAttribute(v)),
  });

  /** Gap (px) along the cross axis (parallel to `side`). Default `0`. */
  readonly alignOffset = input(0, { transform: numberAttribute });

  /**
   * When `true` (default), `flip` and `shift` keep the popover inside the
   * viewport. Disable for strict positioning where overflow is acceptable.
   */
  readonly avoidCollisions = input(true, { transform: booleanAttribute });

  /**
   * Padding (px) applied uniformly to the `flip`, `shift`, and `size`
   * middlewares. Default `8`. Mirrors Radix's `collisionPadding`.
   */
  readonly collisionPadding = input(8, { transform: numberAttribute });

  /**
   * Padding (px) for the `arrow` middleware so the arrow stays inside any
   * rounded corners on the popover content. Default `0`.
   */
  readonly arrowPadding = input(0, { transform: numberAttribute });

  /**
   * Stickiness behaviour for `shift`. `'partial'` (default) lets the
   * popover shift to stay visible. `'always'` disables `shift` so the
   * popover keeps its requested placement even off-screen. `false`
   * is treated as `'partial'`.
   */
  readonly sticky = input<'partial' | 'always' | false>('partial');

  /**
   * When `true`, sets `data-detached=""` on the content while the trigger
   * has scrolled off all clipping ancestors. Use to fade out popovers
   * tied to scrolled-away triggers.
   */
  readonly hideWhenDetached = input(false, { transform: booleanAttribute });

  /**
   * When true, trigger interaction is ignored and any open popover stays
   * open until the consumer flips `open` themselves. Disable on the trigger
   * side; the content side keeps its dismissable behavior unaffected.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * When true (default), Escape, pointer-down outside, and focus outside
   * close the popover. Disable for confirm flows that must be answered
   * via `[forPopoverClose]` (or by setting `open` programmatically).
   */
  readonly dismissible = input(true, { transform: booleanAttribute });

  /** When true (default), focus returns to the trigger on close. */
  readonly returnFocus = input(true, { transform: booleanAttribute });

  /**
   * Where to send focus when content mounts. `'first'` (default) finds
   * the first focusable descendant; `'container'` focuses the content
   * box itself (useful when there's nothing focusable inside).
   */
  readonly initialFocus = input<'first' | 'container'>('first');

  /** Manual `aria-label` on the content. Use this when no visible title element exists. */
  readonly ariaLabel = input<string | null>(null);

  /**
   * Fires when the user presses Escape while this popover is the topmost
   * dismissable layer. Call `event.preventDefault()` to suppress the
   * automatic close.
   */
  readonly escapeKeyDown = output<KeyboardEvent>();

  /**
   * Fires when a pointer goes down outside the popover (and outside the
   * trigger). `preventDefault()` suppresses the automatic close.
   */
  readonly pointerDownOutside = output<PointerEvent>();

  /**
   * Fires when focus moves outside the popover and trigger.
   * `preventDefault()` suppresses the automatic close.
   */
  readonly focusOutside = output<FocusEvent>();

  /**
   * Composite event: fires alongside `pointerDownOutside` and
   * `focusOutside`. `preventDefault()` suppresses the automatic close.
   */
  readonly interactOutside = output<PointerEvent | FocusEvent>();

  readonly triggerId = signal(this.#idGen.next('for-popover-trigger'));
  readonly contentId = signal(this.#idGen.next('for-popover-content'));

  readonly #triggerEl = signal<HTMLElement | null>(null);
  readonly trigger = this.#triggerEl.asReadonly();

  readonly #arrowEl = signal<HTMLElement | null>(null);
  readonly arrow = this.#arrowEl.asReadonly();

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

  registerTrigger(el: HTMLElement): void {
    this.#triggerEl.set(el);
  }
  unregisterTrigger(el: HTMLElement): void {
    if (this.#triggerEl() === el) {
      this.#triggerEl.set(null);
    }
  }

  registerArrow(el: HTMLElement): void {
    this.#arrowEl.set(el);
  }
  unregisterArrow(el: HTMLElement): void {
    if (this.#arrowEl() === el) {
      this.#arrowEl.set(null);
    }
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

  toggle(): void {
    if (this.disabled()) {
      return;
    }
    this.open.update((v) => !v);
  }

  emitEscapeKeyDown(event: KeyboardEvent): void {
    this.escapeKeyDown.emit(event);
    if (!event.defaultPrevented && this.dismissible()) {
      event.stopPropagation();
      this.open.set(false);
    }
  }

  emitPointerDownOutside(event: PointerEvent): void {
    this.pointerDownOutside.emit(event);
  }

  emitFocusOutside(event: FocusEvent): void {
    this.focusOutside.emit(event);
  }

  emitInteractOutside(event: PointerEvent | FocusEvent): void {
    this.interactOutside.emit(event);
    if (!event.defaultPrevented && this.dismissible()) {
      this.open.set(false);
    }
  }
}
