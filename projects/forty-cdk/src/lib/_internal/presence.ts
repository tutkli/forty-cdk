import {
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  type Signal,
  signal,
} from '@angular/core';

export interface PresenceOptions {
  /** Source-of-truth signal: whether the surface is logically open. */
  open: Signal<boolean>;

  /**
   * When true, `present()` is forced `true` regardless of `open`. Useful
   * when the consumer wants to control mount/unmount themselves (e.g. for
   * external orchestration of animations).
   */
  forceMount?: Signal<boolean>;
}

const noopForceMount = signal(false);

/**
 * Tracks whether a transient surface (dialog, tooltip, popover) should
 * remain mounted, accounting for closing animations. The consumer reads
 * `present()` to decide between rendering and unmounting (or applying
 * `[hidden]`); `data-state` should still flip synchronously on `open`
 * changes so CSS transitions can drive the close animation.
 *
 * State machine:
 * - `open() === true`            → `present === true`.
 * - `open()` flips true→false:
 *   - If the host has running animations (Web Animations API), `present`
 *     stays `true` until they all finish, then becomes `false`.
 *   - Otherwise, `present` becomes `false` immediately.
 * - `open()` flips back to true mid-exit cancels the pending unmount.
 * - `forceMount() === true` short-circuits the whole machine.
 *
 * Falls back to immediate unmount when `Element.getAnimations` is
 * unavailable (older browsers, jsdom).
 */
export class Presence {
  readonly #host: HTMLElement;
  readonly #open: Signal<boolean>;
  readonly #forceMount: Signal<boolean>;
  readonly #isExiting = signal(false);

  /**
   * `true` while the surface should stay in the DOM. The consumer
   * typically binds `[attr.hidden]` to `!present()` and applies its CSS
   * transition off `data-state`.
   */
  readonly present = computed<boolean>(() => {
    if (this.#forceMount()) {
      return true;
    }
    if (this.#open()) {
      return true;
    }
    return this.#isExiting();
  });

  constructor(host: HTMLElement, options: PresenceOptions) {
    this.#host = host;
    this.#open = options.open;
    this.#forceMount = options.forceMount ?? noopForceMount;

    let prevOpen = this.#open();
    let exitGeneration = 0;

    effect(() => {
      const isOpen = this.#open();
      if (prevOpen && !isOpen) {
        const myGen = ++exitGeneration;
        const animations = this.#runningAnimations();
        if (animations.length === 0) {
          this.#isExiting.set(false);
        } else {
          this.#isExiting.set(true);
          // Imperative bridge: wait for animations to settle, then
          // clear the exit flag if no newer transition has started and
          // the surface is still closed.
          Promise.allSettled(animations.map((a) => a.finished)).then(() => {
            if (myGen !== exitGeneration) {
              return;
            }
            if (!this.#open() && !this.#forceMount()) {
              this.#isExiting.set(false);
            }
          });
        }
      } else if (isOpen) {
        exitGeneration++;
        this.#isExiting.set(false);
      }
      prevOpen = isOpen;
    });
  }

  get host(): HTMLElement {
    return this.#host;
  }

  #runningAnimations(): Animation[] {
    const el = this.#host as HTMLElement & {
      getAnimations?: (options?: { subtree?: boolean }) => Animation[];
    };
    if (typeof el.getAnimations !== 'function') {
      return [];
    }
    return el.getAnimations({ subtree: true });
  }
}

/**
 * Creates a `Presence` for the directive's host element. Callers pass the
 * `open` and (optional) `forceMount` signals owned by the directive.
 */
export function injectPresence(options: PresenceOptions): Presence {
  const host = inject<ElementRef<HTMLElement>>(ElementRef);
  const presence = new Presence(host.nativeElement, options);
  // Tear down via DestroyRef so any pending exit promises are short-circuited
  // by the destroyed component being detached from the DOM.
  inject(DestroyRef);
  return presence;
}
