const TRANSITION_END_SAFETY_MS = 50;

function parseTimeMs(segment: string): number {
  const value = parseFloat(segment);
  if (!Number.isFinite(value)) {
    return 0;
  }
  return segment.endsWith('ms') ? value : value * 1000;
}

function splitList(value: string | undefined): string[] {
  return value ? value.split(',').map((segment) => segment.trim()) : [];
}

/**
 * The delay plus duration (ms) of the computed transition on `transform` (or `all`), or of the
 * longest configured transition when none animates `transform`; `0` when none is configured.
 */
function transformTransitionEndMs(style: CSSStyleDeclaration): number {
  const durations = splitList(style.transitionDuration);
  if (durations.length === 0) {
    return 0;
  }
  const delays = splitList(style.transitionDelay);
  const properties = splitList(style.transitionProperty);
  let transformEnd = 0;
  let longestEnd = 0;
  (properties.length > 0 ? properties : ['all']).forEach((property, i) => {
    if (property === 'none') {
      return;
    }
    const duration = parseTimeMs(durations[i % durations.length] ?? '');
    const delay = delays.length > 0 ? parseTimeMs(delays[i % delays.length] ?? '') : 0;
    const end = duration > 0 ? Math.max(0, duration + delay) : 0;
    longestEnd = Math.max(longestEnd, end);
    if (property === 'transform' || property === 'all') {
      transformEnd = end;
    }
  });
  return transformEnd || longestEnd;
}

/**
 * Calls `onDone` exactly once, when the `transform` transition of `el` itself ends: on a
 * `transitionend` whose target is `el` and whose property is `transform`, or, if none arrives, once
 * the delay plus duration of the computed transition on `transform` (or `all`, or of the longest
 * configured transition when none animates `transform`) and a small safety margin have elapsed.
 * A `transitionend` of another property, or one bubbling up from a descendant, is ignored. Calls
 * `onDone` synchronously when `el` has no transition configured.
 *
 * Reads the computed style of `el` once, so call it after the styling hook that configures the
 * transition is in place.
 */
export function awaitTransformTransition(el: HTMLElement, win: Window, onDone: () => void): void {
  const endMs = transformTransitionEndMs(win.getComputedStyle(el));
  if (endMs === 0) {
    onDone();
    return;
  }
  let done = false;
  const controller = new AbortController();
  const finish = (): void => {
    if (done) {
      return;
    }
    done = true;
    controller.abort();
    onDone();
  };
  el.addEventListener(
    'transitionend',
    (event: TransitionEvent): void => {
      if (event.target !== el || (event.propertyName && event.propertyName !== 'transform')) {
        return;
      }
      finish();
    },
    { signal: controller.signal },
  );
  win.setTimeout(finish, endMs + TRANSITION_END_SAFETY_MS);
}
