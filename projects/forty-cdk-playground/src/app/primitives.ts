export interface PlaygroundPrimitive {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly apgUrl?: string;
}

export interface PlaygroundGroup {
  readonly label: string;
  readonly primitives: readonly PlaygroundPrimitive[];
}

export const PLAYGROUND_GROUPS: readonly PlaygroundGroup[] = [
  {
    label: 'Overlays',
    primitives: [
      {
        slug: 'dialog',
        title: 'Dialog',
        description:
          'A modal window overlaid on the page, with a focus trap, scroll lock and Escape / dismiss handling. Also openable imperatively through ForDialogManager.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/',
      },
      {
        slug: 'drawer',
        title: 'Drawer',
        description:
          'A side or bottom sheet built on the modal dialog pattern, adding pointer-driven swipe-to-dismiss and Vaul-style snap points.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/',
      },
      {
        slug: 'popover',
        title: 'Popover',
        description:
          'A non-modal floating panel anchored to its trigger by floating-ui, dismissed on Escape, pointer-down outside or focus outside.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/',
      },
      {
        slug: 'dropdown-menu',
        title: 'Dropdown Menu',
        description:
          'A button that opens a menu of actions, with full keyboard navigation, typeahead and submenus.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/',
      },
      {
        slug: 'context-menu',
        title: 'Context Menu',
        description:
          'A menu opened by right-click or long-press, anchored to the pointer position.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/menu/',
      },
      {
        slug: 'menu',
        title: 'Menu',
        description:
          'The shared menu surface — items, checkbox / radio items, groups, separators and submenus — composed by every menu-family primitive.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/menu/',
      },
      {
        slug: 'menubar',
        title: 'Menubar',
        description:
          'A horizontal bar of menus, as in a desktop application, with roving tabindex across the triggers.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/menubar/',
      },
      {
        slug: 'navigation-menu',
        title: 'Navigation Menu',
        description:
          'A site-navigation header built on the disclosure pattern: buttons that expand panels of links into a shared viewport.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/',
      },
      {
        slug: 'hover-card',
        title: 'Hover Card',
        description:
          'A floating card that opens on hover to preview the content behind a link, with a pointer bridge keeping it open.',
      },
      {
        slug: 'tooltip',
        title: 'Tooltip',
        description:
          'A small floating label that describes its trigger on hover or focus, without ever taking focus itself.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/',
      },
      {
        slug: 'select',
        title: 'Select',
        description:
          'A custom select: a trigger that opens a portaled listbox popup to pick one or many options, with groups and separators.',
        apgUrl:
          'https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/',
      },
      {
        slug: 'combobox',
        title: 'Combobox',
        description:
          'An editable input paired with a filterable listbox popup, supporting single or multi selection with chips.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/combobox/',
      },
      {
        slug: 'toast',
        title: 'Toast',
        description:
          'Brief, auto-dismissing notifications stacked in a corner, opened programmatically through ForToastManager.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/alert/',
      },
    ],
  },
  {
    label: 'Forms & selection',
    primitives: [
      {
        slug: 'field',
        title: 'Field',
        description:
          'Headless wiring that ties a label, description and error region to a control, and reflects validation state as data-* for styling. Any forty-cdk form control auto-associates; native inputs opt in with forFieldControl.',
      },
      {
        slug: 'switch',
        title: 'Switch',
        description: 'A binary on / off control toggled by click, Enter or Space.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/switch/',
      },
      {
        slug: 'checkbox',
        title: 'Checkbox',
        description: 'A checkbox supporting the three states checked, unchecked and indeterminate.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/',
      },
      {
        slug: 'toggle',
        title: 'Toggle',
        description: 'A two-state button that stays pressed or unpressed.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/button/',
      },
      {
        slug: 'radio-group',
        title: 'Radio Group',
        description:
          'A set of radio buttons where only one option can be selected, with arrow-key navigation.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/radio/',
      },
      {
        slug: 'slider',
        title: 'Slider',
        description: 'A draggable thumb that picks a numeric value along a track.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/slider/',
      },
      {
        slug: 'listbox',
        title: 'Listbox',
        description:
          'A scrollable list of selectable options with roving-tabindex navigation, single or multi selection.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/listbox/',
      },
      {
        slug: 'tree',
        title: 'Tree',
        description:
          'A nested tree view for hierarchical data: expandable nodes with roving-tabindex navigation, single or multi selection, and typeahead.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/treeview/',
      },
      {
        slug: 'calendar',
        title: 'Calendar',
        description:
          'A single-date calendar grid implementing the APG Grid pattern over a pluggable date adapter: roving-tabindex day navigation, month / year paging, and min / max / per-date availability.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/grid/',
      },
    ],
  },
  {
    label: 'Disclosure & layout',
    primitives: [
      {
        slug: 'accordion',
        title: 'Accordion',
        description:
          'A stack of collapsible sections, optionally allowing multiple panels open at once.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/accordion/',
      },
      {
        slug: 'disclosure',
        title: 'Disclosure',
        description: 'A single trigger that shows or hides a related region of content.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/',
      },
      {
        slug: 'tabs',
        title: 'Tabs',
        description: 'A tablist that switches between panels of content.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/tabs/',
      },
      {
        slug: 'toolbar',
        title: 'Toolbar',
        description: 'A container that groups a set of controls under roving-tabindex navigation.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/',
      },
      {
        slug: 'separator',
        title: 'Separator',
        description: 'A divider between groups of content, optionally a focusable resizer.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/',
      },
      {
        slug: 'scroll-area',
        title: 'Scroll Area',
        description: 'A scrollable region with cross-browser, stylable synthetic scrollbars.',
      },
      {
        slug: 'aspect-ratio',
        title: 'Aspect Ratio',
        description: 'A container that keeps its content at a fixed width-to-height ratio.',
      },
    ],
  },
  {
    label: 'Display & feedback',
    primitives: [
      {
        slug: 'avatar',
        title: 'Avatar',
        description: 'A user image with a graceful fallback across its loading lifecycle.',
      },
      {
        slug: 'progress',
        title: 'Progress',
        description: 'A bar that reflects the completion progress of a task.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/meter/',
      },
      {
        slug: 'meter',
        title: 'Meter',
        description:
          'A gauge that shows a scalar value within a known range, bucketed into quality bands.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/meter/',
      },
    ],
  },
];

export function primitiveBySlug(slug: string): PlaygroundPrimitive {
  for (const group of PLAYGROUND_GROUPS) {
    const found = group.primitives.find((primitive) => primitive.slug === slug);
    if (found) {
      return found;
    }
  }
  throw new Error(`[playground] unknown primitive slug: ${slug}`);
}
