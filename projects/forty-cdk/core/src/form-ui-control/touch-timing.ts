/**
 * A user-driven dismissal of a form control's open surface, named by the
 * channel that requested it.
 *
 * Internal core tier — exported from `forty-cdk/core` for the library's own
 * entry points, with no semver guarantee.
 */
export type TouchDismissal = 'escape' | 'pointerDownOutside' | 'focusOutside';

/**
 * Whether a `focusout` leaves the control. Returns `false` when the element
 * receiving focus sits inside any of `boundaries`, the elements that together
 * make up the control (its host, an open surface, a composite root around a
 * trigger and a field), and `true` otherwise, including when focus leaves the
 * document.
 *
 * Every form control that marks itself touched from a `focusout` decides it
 * here, so a focus move between the parts of one control never touches it.
 *
 * Internal core tier — exported from `forty-cdk/core` for the library's own
 * entry points, with no semver guarantee.
 */
export function leavesControl(
  event: FocusEvent,
  boundaries: readonly (Node | null | undefined)[],
): boolean {
  const next = event.relatedTarget as Node | null;
  if (!next) {
    return true;
  }
  return !boundaries.some((boundary) => boundary?.contains(next) ?? false);
}

/**
 * Whether a dismissal marks the control touched. An outside interaction is the
 * control's blur and touches it; Escape leaves focus in the control and blurs
 * nothing, so it does not.
 *
 * Internal core tier — exported from `forty-cdk/core` for the library's own
 * entry points, with no semver guarantee.
 */
export function dismissMarksTouched(dismissal: TouchDismissal): boolean {
  return dismissal !== 'escape';
}
