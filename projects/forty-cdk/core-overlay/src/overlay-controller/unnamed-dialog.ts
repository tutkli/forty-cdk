import { afterNextRender, ElementRef, inject, isDevMode } from '@angular/core';
import { fortyWarn } from 'forty-cdk/core';

/** Identifies the surface and its two naming channels in the dev-mode missing-name warning. */
export interface UnnamedDialogConfig {
  /** Entry-point name used in the `[forty-cdk/<primitive>]` prefix (e.g. `'dialog'`). */
  readonly primitive: string;
  /** Selector of the piece carrying the dialog role (e.g. `'[forDialog]'`). */
  readonly piece: string;
  /** Selector of the title piece that names the surface (e.g. `'[forDialogTitle]'`). */
  readonly title: string;
  /**
   * Where the consumer binds `ariaLabel` for this surface, quoted into the fix (e.g.
   * `'[forPopover]'`, whose content reads the root's input).
   */
  readonly ariaLabelOn: string;
}

/**
 * Warns — dev mode only, once per instance — when a surface carrying the dialog role has no
 * accessible name after its first render: neither an `aria-labelledby` nor a non-empty
 * `aria-label` resolved on its host.
 *
 * The attributes are read from the host inside `afterNextRender`, so a title registered during the
 * first render, a bound `ariaLabel` and a static `aria-label` attribute all count. Must be called
 * from an injection context on the surface's own host. A production build registers no render hook
 * at all, and the check is inert on the server.
 */
export function warnIfDialogUnnamed(config: UnnamedDialogConfig): void {
  if (!isDevMode()) {
    return;
  }
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  afterNextRender(() => {
    const label = host.getAttribute('aria-label')?.trim() ?? '';
    if (label !== '' || host.hasAttribute('aria-labelledby')) {
      return;
    }
    fortyWarn({
      code: 'FORCDK-CORE-011',
      scope: config.primitive,
      message: `${config.piece} has no accessible name.`,
      cause:
        'Neither `aria-labelledby` nor a non-empty `aria-label` resolved on its host, so assistive ' +
        'technology announces the surface as a bare "dialog". Automated audits tagged for WCAG ' +
        'A / AA do not report it.',
      fix: `Render a ${config.title} inside it, or bind \`ariaLabel\` on ${config.ariaLabelOn}.`,
    });
  });
}
