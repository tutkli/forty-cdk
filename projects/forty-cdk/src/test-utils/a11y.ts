/**
 * Assert that `target.aria-labelledby` references `host.id`.
 *
 * The check is "host id appears in the space-separated list" rather than
 * exact match, which covers primitives that compose multiple ids
 * (e.g. dialog title + description, or menu item + description).
 *
 * Failures throw with a `[forty-cdk/test-utils]`-prefixed message so the
 * Vitest report points at the assertion call site, not deep inside the
 * directive being tested.
 *
 * Example:
 *
 *   const trigger = r.query('[forMenuTrigger]')!;
 *   const content = document.querySelector('[forMenuContent]')!;
 *   assertA11yLabelledBy(trigger, content);
 */
export function assertA11yLabelledBy(host: Element, target: Element): void {
  if (!host.id) {
    throw new Error(
      `[forty-cdk/test-utils] assertA11yLabelledBy: host <${host.tagName.toLowerCase()}> has no id; aria-labelledby cannot reference it.`,
    );
  }
  const labelledBy = target.getAttribute('aria-labelledby');
  if (!labelledBy) {
    throw new Error(
      `[forty-cdk/test-utils] assertA11yLabelledBy: target <${target.tagName.toLowerCase()}> has no aria-labelledby attribute.`,
    );
  }
  const ids = labelledBy.split(/\s+/).filter(Boolean);
  if (!ids.includes(host.id)) {
    throw new Error(
      `[forty-cdk/test-utils] assertA11yLabelledBy: target's aria-labelledby="${labelledBy}" does not include host id "${host.id}".`,
    );
  }
}
