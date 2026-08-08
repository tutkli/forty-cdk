import { fortyError } from './errors';

const TEMPLATE_CAUSE =
  "Angular resolves a directive's dependencies at the template's declaration site rather than " +
  'where it is stamped, so a piece declared in an ng-template outside the root resolves nothing ' +
  'even when it renders inside it.';

/** Identity of a piece that resolved no coordination context, and of the root it needs. */
export interface OrphanContextSpec {
  /** Stable `FORCDK-<AREA>-<NNN>` identifier for this orphan case. */
  readonly code: string;
  /** The piece the error names, e.g. `'ForDialogTitle'` or `'[forSelectOption]'`. */
  readonly piece: string;
  /** Selector(s) of the root it must sit inside, e.g. `'[forDialog]'`. */
  readonly root: string;
  /** Token that resolved nothing, e.g. `'FOR_DIALOG_CONTEXT'`. */
  readonly token: string;
  /** Overrides the entry point derived from `code` — for a shared core resolver. */
  readonly scope?: string;
}

/**
 * The error a piece throws when it resolved no coordination context — by far
 * the library's most common developer mistake, and the one whose prose had
 * drifted furthest: the same failure was reported with, and without, the
 * ng-template caveat that is its real cause about a fifth of the time.
 *
 * The caveat now ships once, in this module, so every orphan report carries it
 * at no per-entry-point cost.
 */
export function orphanContextError(spec: OrphanContextSpec): Error {
  return fortyError({
    code: spec.code,
    scope: spec.scope,
    message: `${spec.piece} must be used inside a ${spec.root} element.`,
    cause: `No ${spec.token} provider is visible from ${spec.piece}. ${TEMPLATE_CAUSE}`,
    fix: `Move ${spec.piece} inside a ${spec.root} element, declaring any ng-template it lives in there too.`,
  });
}

/** Identity of an overlay trigger that resolved its root through neither channel. */
export interface UnresolvedRootSpec {
  /** Stable `FORCDK-<AREA>-<NNN>` identifier for this trigger's unresolved-root case. */
  readonly code: string;
  /** The trigger's selector, e.g. `'[forPopoverTrigger]'`. */
  readonly trigger: string;
  /** Selector of the root, e.g. `'[forPopover]'`. */
  readonly root: string;
  /** Token that resolved nothing, e.g. `'FOR_POPOVER_CONTEXT'`. */
  readonly token: string;
  /** The root's `exportAs` name, for the template-reference fix, e.g. `'forPopover'`. */
  readonly exportAs: string;
}

/**
 * The error an overlay trigger throws when neither of its two channels resolved
 * a root: no visible `token` provider, and no explicit root passed through its
 * own input. Distinct from {@link orphanContextError} because the second
 * channel makes the remedy different — a trigger stamped from an ng-template
 * can stay where it is and take the root by reference.
 */
export function unresolvedRootError(spec: UnresolvedRootSpec): Error {
  return fortyError({
    code: spec.code,
    message: `${spec.trigger} could not resolve its ${spec.root} root.`,
    cause: `No ${spec.token} provider is visible and no explicit root was passed. ${TEMPLATE_CAUSE}`,
    fix:
      `Move ${spec.trigger} inside the ${spec.root} element, or pass the root explicitly: ` +
      `${spec.trigger}="root" with #root="${spec.exportAs}".`,
  });
}
