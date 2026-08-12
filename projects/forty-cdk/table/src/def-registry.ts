import {
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injectable,
  InjectionToken,
  type Provider,
  type Signal,
} from '@angular/core';

import { Collection, fortyError, isUnset } from 'forty-cdk/core';

import type {
  ForTableColumnDef,
  ForTableColumnDragPlaceholder,
  ForTablePlaceholderCellDefault,
} from './column-def';
import type { ForTableRowDef } from './row-def';

/**
 * The def registry a `<for-table-body>` renders from — the seam that lets a
 * **scaffold wrapper** own the table shell while its consumers keep declaring
 * plain `[forTableColumnDef]` / `[forTableRowDef]` blocks.
 *
 * Defs discover their registry through DI at construction, and element DI follows
 * the **declaration** tree: a def projected through a wrapper's `<ng-content>` is
 * a child of the wrapper's host, not of the `<for-table-body>` inside the
 * wrapper's template, so it never sees the body's own registry. A wrapper
 * therefore provides its own registry with `provideForTableDefRegistry()` and
 * hands it to its inner body through `[defs]`; projected defs register with it,
 * and the body renders them exactly as if they had been declared inside its own
 * tags. See the table README for the full recipe.
 *
 * A **preset column component** (`<ds-text-column name="code" …>` collapsing a
 * column's header / data templates into one line) needs none of this: the preset
 * host is declared inside the body's tags, so the def in the preset's view
 * resolves the body's registry through the element-injector chain.
 *
 * The read members here are the whole public surface. How defs wire themselves
 * into a registry is a separate, unexported protocol, so the library keeps
 * refactoring it; the only supported implementation is the one
 * `provideForTableDefRegistry()` installs, and `<for-table-body>` rejects any
 * other value bound to `[defs]`.
 */
export interface ForTableDefRegistry {
  /**
   * The `name` of every registered `[forTableColumnDef]`, in document order — the
   * default column order a bound `<for-table-body>` renders. A wrapper can seed
   * its own `[displayedColumns]` from it (say, to move a fixed action column to
   * the end) without knowing which defs its consumer projected.
   *
   * Reading it resolves each def's `name` input, and a def whose binding is not
   * written yet is left out, so read it from a template, a `computed`, or an
   * `afterNextRender` — not from a constructor, where the projected defs' inputs
   * are not bound yet and the list would come back short.
   */
  readonly columnNames: Signal<readonly string[]>;
}

export const FOR_TABLE_DEF_REGISTRY = new InjectionToken<ForTableDefRegistry>(
  'FOR_TABLE_DEF_REGISTRY',
);

/**
 * One registered def paired with the DOM node that positions it — the comment
 * anchor of its `<ng-container>`, or the element it sits on. The node orders the
 * registry in document position, so a def declared inside a preset component's
 * view (which constructs after every directly declared def) still renders in its
 * authored place.
 */
export interface TableDefHandle<D> {
  /**
   * The def's host node — the comment anchor of its `<ng-container>` /
   * `<ng-template>`, or the element it sits on.
   */
  readonly host: Node;
  /** The registered def instance. */
  readonly def: D;
}

/**
 * The def-registration protocol: how the four declarative pieces wire themselves
 * into the registry a `<for-table-body>` reads. Kept off
 * {@link ForTableDefRegistry} — this is the surface the library refactors, and
 * nothing outside `forty-cdk/table` needs to call it.
 */
export interface TableDefRegistration {
  /** Whether nothing at all has registered — the body's guard against defs registered on the wrong registry. */
  readonly isEmpty: Signal<boolean>;
  /** Registers a column def. */
  registerColumnDef(handle: TableDefHandle<ForTableColumnDef>): void;
  /** Unregisters a column def. Reference-based. */
  unregisterColumnDef(handle: TableDefHandle<ForTableColumnDef>): void;
  /** Registers a row variant def. */
  registerRowDef(handle: TableDefHandle<ForTableRowDef<unknown>>): void;
  /** Unregisters a row variant def. Reference-based. */
  unregisterRowDef(handle: TableDefHandle<ForTableRowDef<unknown>>): void;
  /** Registers the shared column drag placeholder template. */
  registerColumnDragPlaceholder(handle: TableDefHandle<ForTableColumnDragPlaceholder>): void;
  /** Unregisters the shared column drag placeholder template. Reference-based. */
  unregisterColumnDragPlaceholder(handle: TableDefHandle<ForTableColumnDragPlaceholder>): void;
  /** Registers the body-level default placeholder-cell template. */
  registerPlaceholderCellDefault(handle: TableDefHandle<ForTablePlaceholderCellDefault>): void;
  /** Unregisters the body-level default placeholder-cell template. Reference-based. */
  unregisterPlaceholderCellDefault(handle: TableDefHandle<ForTablePlaceholderCellDefault>): void;
}

export const TABLE_DEF_REGISTRATION = new InjectionToken<TableDefRegistration>(
  'TABLE_DEF_REGISTRATION',
);

/**
 * Owns the registered declarative defs of one `<for-table-body>`, exposing them
 * in document order.
 *
 * Document order (rather than construction order) is what keeps the seam a
 * drop-in replacement for the content queries it replaces: a def inside a preset
 * component's view constructs after every directly declared def, an `@if`-mounted
 * def constructs whenever it mounts, and a `@for`-reordered set of defs moves its
 * nodes without re-running constructors. `Collection` resolves all three from the
 * handles' host nodes.
 */
@Injectable()
export class TableDefRegistry implements ForTableDefRegistry, TableDefRegistration {
  readonly #columns = new Collection<TableDefHandle<ForTableColumnDef>>();
  readonly #rowDefs = new Collection<TableDefHandle<ForTableRowDef<unknown>>>();
  readonly #dragPlaceholders = new Collection<TableDefHandle<ForTableColumnDragPlaceholder>>();
  readonly #placeholderDefaults = new Collection<TableDefHandle<ForTablePlaceholderCellDefault>>();

  /**
   * Registered column defs, in document order.
   *
   * A def registers in its view's **creation** pass but has its `name` bound in
   * that view's **update** pass, and for a def declared in a preset component's
   * view those two passes straddle the body's own render — so a def is held back
   * until its name can be read. Reading the unwritten input tracks it, so the
   * binding's write folds the def in. See `unsetInput`.
   */
  readonly columnDefs: Signal<readonly ForTableColumnDef[]> = computed(() =>
    this.#columns
      .items()
      .map((handle) => handle.def)
      .filter((def) => !isUnset(def.name())),
  );

  /**
   * Registered row variant defs, in document order (first match wins per datum).
   * Held back until the def's `when` predicate can be read, exactly like
   * {@link columnDefs}.
   */
  readonly rowDefs: Signal<readonly ForTableRowDef<unknown>[]> = computed(() =>
    this.#rowDefs
      .items()
      .map((handle) => handle.def)
      .filter((def) => !isUnset(def.when())),
  );

  /** The shared column drag placeholder (the first in document order), or `null`. */
  readonly columnDragPlaceholder: Signal<ForTableColumnDragPlaceholder | null> = computed(
    () => this.#dragPlaceholders.items()[0]?.def ?? null,
  );

  /** The body-level default placeholder-cell template (the first in document order), or `null`. */
  readonly placeholderCellDefault: Signal<ForTablePlaceholderCellDefault | null> = computed(
    () => this.#placeholderDefaults.items()[0]?.def ?? null,
  );

  /** The `name` of every registered column def, in document order. */
  readonly columnNames: Signal<readonly string[]> = computed(() =>
    this.columnDefs().map((def) => def.name()),
  );

  /** Whether no def of any kind is registered. */
  readonly isEmpty: Signal<boolean> = computed(
    () =>
      this.#columns.items().length === 0 &&
      this.#rowDefs.items().length === 0 &&
      this.#dragPlaceholders.items().length === 0 &&
      this.#placeholderDefaults.items().length === 0,
  );

  /** Registers a column def so it joins the rendered columns at its document position. */
  registerColumnDef(handle: TableDefHandle<ForTableColumnDef>): void {
    this.#columns.register(handle);
  }

  /** Unregisters a column def. Reference-based. */
  unregisterColumnDef(handle: TableDefHandle<ForTableColumnDef>): void {
    this.#columns.unregister(handle);
  }

  /** Registers a row variant def so its matched data rows render the variant. */
  registerRowDef(handle: TableDefHandle<ForTableRowDef<unknown>>): void {
    this.#rowDefs.register(handle);
  }

  /** Unregisters a row variant def. Reference-based. */
  unregisterRowDef(handle: TableDefHandle<ForTableRowDef<unknown>>): void {
    this.#rowDefs.unregister(handle);
  }

  /** Registers the shared drag placeholder stamped into every reorderable header cell. */
  registerColumnDragPlaceholder(handle: TableDefHandle<ForTableColumnDragPlaceholder>): void {
    this.#dragPlaceholders.register(handle);
  }

  /** Unregisters the shared column drag placeholder. Reference-based. */
  unregisterColumnDragPlaceholder(handle: TableDefHandle<ForTableColumnDragPlaceholder>): void {
    this.#dragPlaceholders.unregister(handle);
  }

  /** Registers the default placeholder-cell template columns fall back to. */
  registerPlaceholderCellDefault(handle: TableDefHandle<ForTablePlaceholderCellDefault>): void {
    this.#placeholderDefaults.register(handle);
  }

  /** Unregisters the default placeholder-cell template. Reference-based. */
  unregisterPlaceholderCellDefault(handle: TableDefHandle<ForTablePlaceholderCellDefault>): void {
    this.#placeholderDefaults.unregister(handle);
  }
}

/**
 * The provider set installing a def registry on a host: the registry itself, the
 * public {@link FOR_TABLE_DEF_REGISTRY} read token, and the internal
 * registration protocol the declarative defs resolve.
 *
 * `<for-table-body>` declares it so defs declared inside its own tags register
 * with it. A **scaffold wrapper** declares it too, so defs its consumers project
 * through `<ng-content>` reach a registry at all, and binds
 * `inject(FOR_TABLE_DEF_REGISTRY)` to its inner body's `[defs]`.
 */
export function provideForTableDefRegistry(): Provider[] {
  return [
    TableDefRegistry,
    { provide: FOR_TABLE_DEF_REGISTRY, useExisting: TableDefRegistry },
    { provide: TABLE_DEF_REGISTRATION, useExisting: TableDefRegistry },
  ];
}

/**
 * Resolves the registry `<for-table-body>`'s own `providers` install.
 *
 * The lookup is optional only so the failure can be reported in the library's own
 * vocabulary: {@link TableDefRegistry} is absent from every barrel, so
 * a bare `NG0201: No provider found for _TableDefRegistry` names a symbol the
 * consumer cannot import and suggests no repair. The only shape that reaches it is
 * a subclass declaring its own `@Component` — Angular replaces the inherited
 * `providers` array wholesale — which is not a supported way to wrap the body.
 */
export function injectOwnTableDefRegistry(): TableDefRegistry {
  const registry = inject(TableDefRegistry, { optional: true });
  if (!registry) {
    throw fortyError({
      code: 'FORCDK-TABLE-001',
      message: '<for-table-body> found no def registry of its own.',
      cause:
        'A subclass declaring its own @Component replaces the providers it would have inherited. ' +
        'Subclassing the body is not a supported wrapping shape anyway, because a subclass ' +
        'inherits no template either.',
      fix:
        "Compose <for-table-body> inside a wrapper's template, and give the wrapper its own " +
        "provideForTableDefRegistry() bound to the body's [defs].",
    });
  }
  return registry;
}

function injectTableDefRegistration(piece: string): TableDefRegistration {
  const registration = inject(TABLE_DEF_REGISTRATION, { optional: true });
  if (!registration) {
    throw fortyError({
      code: 'FORCDK-TABLE-002',
      message: `${piece} must be used inside a <for-table-body>.`,
      cause: `No TABLE_DEF_REGISTRATION provider is visible from ${piece}.`,
      fix:
        `Move ${piece} inside a <for-table-body>, or into a component that provides ` +
        "provideForTableDefRegistry() and binds that registry to a body's [defs].",
    });
  }
  return registration;
}

function injectDefHost(): Node {
  return inject<ElementRef<Node>>(ElementRef).nativeElement;
}

/**
 * Registers a `[forTableColumnDef]` with the surrounding registry for the def's
 * lifetime. Call it from the def's constructor — it resolves the registry, the
 * host node, and the `DestroyRef` from the ambient injection context.
 */
export function registerTableColumnDef(def: ForTableColumnDef): void {
  const registration = injectTableDefRegistration('ForTableColumnDef');
  const handle: TableDefHandle<ForTableColumnDef> = { host: injectDefHost(), def };
  registration.registerColumnDef(handle);
  inject(DestroyRef).onDestroy(() => registration.unregisterColumnDef(handle));
}

/**
 * Registers a `[forTableRowDef]` with the surrounding registry for the def's
 * lifetime, type-erased over the def's row type — the same erasure the
 * `contentChildren(ForTableRowDef)` query performed implicitly before defs registered
 * themselves. The body only ever matches a def against data from the same `rows`
 * input, so the erasure is sound.
 */
export function registerTableRowDef<T>(def: ForTableRowDef<T>): void {
  const registration = injectTableDefRegistration('ForTableRowDef');
  const handle: TableDefHandle<ForTableRowDef<unknown>> = {
    host: injectDefHost(),
    def: def as unknown as ForTableRowDef<unknown>,
  };
  registration.registerRowDef(handle);
  inject(DestroyRef).onDestroy(() => registration.unregisterRowDef(handle));
}

/**
 * Registers a `[forTableColumnDragPlaceholder]` with the surrounding registry for the
 * template's lifetime.
 */
export function registerTableColumnDragPlaceholder(def: ForTableColumnDragPlaceholder): void {
  const registration = injectTableDefRegistration('ForTableColumnDragPlaceholder');
  const handle: TableDefHandle<ForTableColumnDragPlaceholder> = { host: injectDefHost(), def };
  registration.registerColumnDragPlaceholder(handle);
  inject(DestroyRef).onDestroy(() => registration.unregisterColumnDragPlaceholder(handle));
}

/**
 * Registers a `[forTablePlaceholderCellDefault]` with the surrounding registry for the
 * template's lifetime.
 */
export function registerTablePlaceholderCellDefault(def: ForTablePlaceholderCellDefault): void {
  const registration = injectTableDefRegistration('ForTablePlaceholderCellDefault');
  const handle: TableDefHandle<ForTablePlaceholderCellDefault> = { host: injectDefHost(), def };
  registration.registerPlaceholderCellDefault(handle);
  inject(DestroyRef).onDestroy(() => registration.unregisterPlaceholderCellDefault(handle));
}

/**
 * Narrows a `[defs]`-bound registry to the library's own implementation. The
 * registration protocol is not public, so a hand-rolled `ForTableDefRegistry` has
 * no way to receive registrations — binding one is an authoring error, not a
 * supported extension point.
 */
export function assertTableDefRegistry(registry: ForTableDefRegistry): TableDefRegistry {
  if (!(registry instanceof TableDefRegistry)) {
    throw fortyError({
      code: 'FORCDK-TABLE-003',
      message: '<for-table-body> [defs] was bound to a value that is not a library def registry.',
      cause:
        'The registration protocol is not public, so a hand-rolled ForTableDefRegistry has no way ' +
        'to receive registrations.',
      fix: 'Bind [defs] to the registry provideForTableDefRegistry() installs.',
    });
  }
  return registry;
}
