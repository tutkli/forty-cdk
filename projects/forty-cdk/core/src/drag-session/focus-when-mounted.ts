import { afterEveryRender, type Injector } from '@angular/core';

import { composedContains, resolveActiveElement } from '../composed-tree/composed-tree';

const MAX_RENDERS = 10;

/** A focus target: anything `focus()` can be called on. */
export type FocusWhenMountedTarget = HTMLElement | SVGElement;

/** Wiring for {@link focusWhenMounted}. */
export interface FocusWhenMountedOptions {
  /** Injector the render hook registers against; the hook is torn down with it. */
  readonly injector: Injector;
  /** The document focus is read from. */
  readonly document: Document;
  /**
   * The element focus must be on or inside when the step starts — the lifted item, or the
   * focused row. The step does nothing when focus is anywhere else.
   */
  readonly from: Element;
  /**
   * Resolves the element to focus among what is rendered, or `null` while it is not mounted
   * yet. Receives the element that held focus when the step started.
   */
  readonly target: (origin: FocusWhenMountedTarget) => FocusWhenMountedTarget | null;
  /** Brings the target into the rendered set. Runs once, synchronously, before any render. */
  readonly reveal?: () => void;
  /**
   * Runs once when the step ends, whether it moved focus, yielded to a focus move made
   * elsewhere, or gave up on a target that never mounted. Not called by `cancel()`.
   */
  readonly release?: () => void;
}

/** Handle on a pending {@link focusWhenMounted} step. */
export interface FocusWhenMountedRef {
  /** Abandon the step without moving focus and without calling `release`. */
  cancel(): void;
}

const NOOP_REF: FocusWhenMountedRef = { cancel: () => undefined };

/**
 * Moves focus to an element that may not be rendered yet, once a render has mounted it: the
 * step a keyboard drop or a dataset-wide jump owes the keyboard user when the element they
 * were on is moved, recycled or destroyed by the re-render that follows.
 *
 * It starts only when focus is on or inside `from`, and remembers that element as the origin.
 * `reveal` then runs synchronously (scroll the target into the window, pin it), and after each
 * render the step resolves `target`. Focus moves when it resolves and focus is still on the
 * origin or was lost to `<body>`; a focus move made elsewhere in the meantime wins, and so does
 * a target that is still unmounted after a bounded number of renders. Every one of those ends
 * calls `release` once.
 *
 * Internal core tier — exported from `forty-cdk/core` for the library's own entry points, with
 * no semver guarantee.
 */
export function focusWhenMounted(options: FocusWhenMountedOptions): FocusWhenMountedRef {
  const { document } = options;
  const active = resolveActiveElement(document);
  if (
    active === null ||
    !composedContains(options.from, active) ||
    !(active instanceof HTMLElement || active instanceof SVGElement)
  ) {
    return NOOP_REF;
  }
  const origin = active;
  let renders = 0;
  let done = false;

  options.reveal?.();

  const hook = afterEveryRender(
    () => {
      if (done) {
        return;
      }
      renders++;
      const current = resolveActiveElement(document);
      const lost =
        current === null || current === document.body || current === document.documentElement;
      if (!lost && current !== origin) {
        end();
        return;
      }
      const target = options.target(origin);
      if (target !== null) {
        if (current !== target) {
          target.focus();
        }
        end();
        return;
      }
      if (renders >= MAX_RENDERS) {
        end();
      }
    },
    { injector: options.injector },
  );

  function stop(): void {
    done = true;
    hook.destroy();
  }

  function end(): void {
    stop();
    options.release?.();
  }

  return {
    cancel: () => {
      if (!done) {
        stop();
      }
    },
  };
}
