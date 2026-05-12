/**
 * Canonical list of every primitive shipped by `forty-cdk`, with the metadata
 * the docs site needs to render navigation, page metadata, and per-primitive
 * frontmatter — none of which is recoverable from the auto-generated API JSON.
 *
 * Order here is the order shown in the side-nav and in `llms.txt`. Group by
 * family for human readability.
 *
 * When adding a primitive: re-export it from `forty-cdk/src/public-api.ts`,
 * add an entry here, and re-run `pnpm docs:prebuild` to refresh the API JSON.
 */
export type PrimitiveFamily =
  | 'overlay'
  | 'form'
  | 'navigation'
  | 'layout'
  | 'feedback'
  | 'data-display';

export interface ExampleEntry {
  /** Filename under `src/examples/<slug>/` without `.ts` (e.g. `'basic'`). */
  name: string;
  /** Heading shown above the preview/code tabs. */
  title: string;
  /** Optional one-line caption. */
  description?: string;
}

export interface PrimitiveEntry {
  /** URL slug + folder name under `src/lib/<slug>/`. */
  slug: string;
  /** Display title (used in nav, hero, `<title>` tag). */
  title: string;
  /** One-line description for the cards index and `llms.txt`. */
  description: string;
  /** Visual grouping in the sidenav. */
  family: PrimitiveFamily;
  /** Full URL to the WAI-ARIA APG pattern the primitive implements. */
  apgUrl: string;
  /**
   * Live examples shipped under `src/examples/<slug>/`. Each example is a
   * standalone `@Component` with `export default`. Listed examples appear in
   * the primitive page in declared order. Omit when no examples exist yet.
   */
  examples?: readonly ExampleEntry[];
}

export const PRIMITIVE_REGISTRY: readonly PrimitiveEntry[] = [
  // ---------- Overlays / floating ----------
  {
    slug: 'dialog',
    title: 'Dialog',
    description: 'Modal dialog with focus trap, body scroll lock, and return-focus.',
    family: 'overlay',
    apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/',
  },
  {
    slug: 'drawer',
    title: 'Drawer',
    description: 'Side-sheet with swipe-to-dismiss gesture support.',
    family: 'overlay',
    apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/',
  },
  {
    slug: 'popover',
    title: 'Popover',
    description: 'Non-modal floating surface anchored to a trigger.',
    family: 'overlay',
    apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/',
  },
  {
    slug: 'tooltip',
    title: 'Tooltip',
    description: 'Hover/focus tooltip with hover-on-touch fallback.',
    family: 'overlay',
    apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/',
  },
  {
    slug: 'hover-card',
    title: 'Hover card',
    description: 'Rich preview opened by hover with cadence-based dwell timing.',
    family: 'overlay',
    apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/',
  },
  {
    slug: 'dropdown-menu',
    title: 'Dropdown menu',
    description: 'Click-triggered menu with roving tabindex and submenus.',
    family: 'overlay',
    apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/menu/',
  },
  {
    slug: 'context-menu',
    title: 'Context menu',
    description: 'Right-click / long-press menu with placement awareness.',
    family: 'overlay',
    apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/menu/',
  },
  {
    slug: 'menu',
    title: 'Menu',
    description: 'Composable menu primitive (used by Dropdown/Context/Menubar).',
    family: 'overlay',
    apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/menu/',
  },

  // ---------- Form controls ----------
  {
    slug: 'switch',
    title: 'Switch',
    description: 'Toggle switch wired to Signal Forms via FormCheckboxControl.',
    family: 'form',
    apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/switch/',
  },
  {
    slug: 'checkbox',
    title: 'Checkbox',
    description: 'Tri-state checkbox wired to Signal Forms via FormCheckboxControl.',
    family: 'form',
    apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/',
  },
  {
    slug: 'radio-group',
    title: 'Radio group',
    description: 'Single-select radio group with roving tabindex.',
    family: 'form',
    apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/radio/',
  },
  {
    slug: 'toggle',
    title: 'Toggle',
    description: 'Toggle button (pressed / unpressed).',
    family: 'form',
    apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/button/',
  },
  {
    slug: 'slider',
    title: 'Slider',
    description: 'Single-thumb range slider with pointer-capture drag.',
    family: 'form',
    apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/slider/',
  },
  {
    slug: 'listbox',
    title: 'Listbox',
    description: 'Single/multi-select listbox with roving tabindex and typeahead.',
    family: 'form',
    apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/listbox/',
  },
  {
    slug: 'combobox',
    title: 'Combobox',
    description: 'Editable combobox with aria-activedescendant navigation.',
    family: 'form',
    apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/combobox/',
  },
  {
    slug: 'select',
    title: 'Select',
    description: 'Closed-list select with anchored popover and roving tabindex.',
    family: 'form',
    apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/combobox/',
  },

  // ---------- Navigation / composition ----------
  {
    slug: 'tabs',
    title: 'Tabs',
    description: 'Tablist + tabpanel with arrow-key navigation.',
    family: 'navigation',
    apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/tabs/',
  },
  {
    slug: 'menubar',
    title: 'Menubar',
    description: 'Horizontal application menubar with submenus.',
    family: 'navigation',
    apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/menubar/',
  },
  {
    slug: 'navigation-menu',
    title: 'Navigation menu',
    description: 'Top-level site navigation with mega-menu support.',
    family: 'navigation',
    apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/',
  },
  {
    slug: 'toolbar',
    title: 'Toolbar',
    description: 'Grouped actions with arrow-key roving tabindex.',
    family: 'navigation',
    apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/',
  },

  // ---------- Layout & disclosure ----------
  {
    slug: 'disclosure',
    title: 'Disclosure',
    description: 'Single show/hide pair — the canonical gateway primitive.',
    family: 'layout',
    apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/',
    examples: [
      {
        name: 'basic',
        title: 'Basic',
        description: 'Mount/unmount via @if, default state vocabulary.',
      },
      {
        name: 'controlled',
        title: 'Controlled',
        description: 'Read the open signal from outside and observe (openChange).',
      },
    ],
  },
  {
    slug: 'accordion',
    title: 'Accordion',
    description: 'Grouped disclosures with single/multiple expansion modes.',
    family: 'layout',
    apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/accordion/',
  },
  {
    slug: 'scroll-area',
    title: 'Scroll area',
    description: 'Custom scrollbar rail with native-fallback semantics.',
    family: 'layout',
    apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/scrollbar/',
  },
  {
    slug: 'separator',
    title: 'Separator',
    description: 'Decorative or focusable resizer separator.',
    family: 'layout',
    apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/separator/',
  },
  {
    slug: 'aspect-ratio',
    title: 'Aspect ratio',
    description: 'Content wrapper that preserves a fixed aspect ratio.',
    family: 'layout',
    apgUrl: 'https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/',
  },

  // ---------- Feedback ----------
  {
    slug: 'toast',
    title: 'Toast',
    description: 'Stacked transient notification with swipe-to-dismiss.',
    family: 'feedback',
    apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/alert/',
  },
  {
    slug: 'progress',
    title: 'Progress',
    description: 'Determinate / indeterminate progress indicator.',
    family: 'feedback',
    apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/meter/',
  },
  {
    slug: 'meter',
    title: 'Meter',
    description: 'HTML5 meter with optimum / sub-optimum quality buckets.',
    family: 'feedback',
    apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/meter/',
  },

  // ---------- Data display ----------
  {
    slug: 'avatar',
    title: 'Avatar',
    description: 'Image with status-driven fallback (idle/loading/loaded/error).',
    family: 'data-display',
    apgUrl: 'https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/',
  },
] as const;

export const PRIMITIVE_BY_SLUG: Readonly<Record<string, PrimitiveEntry>> = Object.fromEntries(
  PRIMITIVE_REGISTRY.map((entry) => [entry.slug, entry]),
);
