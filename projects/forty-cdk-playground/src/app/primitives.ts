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
          'A side or bottom sheet built on the modal dialog pattern, adding pointer-driven swipe-to-dismiss and snap points.',
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
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/',
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
        slug: 'button',
        title: 'Button',
        description:
          'Turns any element — a native <button> or a custom host like <div> / <span> — into an accessible button with keyboard activation. Disabled stays focusable (aria-disabled, never the native attribute) and pressed / hovered / focus-visible are reflected as data-* hooks.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/button/',
      },
      {
        slug: 'field',
        title: 'Field',
        description:
          'Headless wiring that ties a label, description and error region to a control, and reflects validation state as data-* for styling. Any forty-cdk form control auto-associates; native inputs opt in with forFieldControl.',
      },
      {
        slug: 'fieldset',
        title: 'Fieldset',
        description:
          'Headless grouping that gives a set of related fields a shared accessible name — a native <fieldset> / legend, or role=group + aria-labelledby on any element — plus an optional shared disabled state that reaches custom-role controls.',
      },
      {
        slug: 'input',
        title: 'Input',
        description:
          'Attribute directives for single- and multi-line text: a string value() that auto-wires with Signal Forms and reflects every form state (empty, disabled, readonly, invalid …) as data-* / aria-* hooks.',
      },
      {
        slug: 'search',
        title: 'Search',
        description:
          "A role='searchbox' text input that mirrors its value to a signal and reflects validation state, paired with a clear button that self-hides while the field is empty. Reuses forInput's form-value wiring, so it auto-wires with Signal Forms and Field.",
      },
      {
        slug: 'number-input',
        title: 'Number Input',
        description:
          'A numeric spinbutton with keyboard stepping, optional +/− buttons, min / max / step clamping and Intl number formatting for the displayed text and aria-valuetext.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/',
      },
      {
        slug: 'otp-input',
        title: 'OTP Input',
        description:
          'A one-time-code / PIN field on the single-input model: typed and pasted characters fill styled slots, with masking, character filtering and a complete event.',
      },
      {
        slug: 'file-upload',
        title: 'File Upload',
        description:
          "A headless drag-and-drop / dialog file-selection zone: a visually-hidden native <input type='file'> stays the accessible control while a trigger button opens the picker, and dropping files emits the same change. Supports multiple, accept filters and whole-folder (directory) selection.",
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
        slug: 'date-field',
        title: 'Date Field',
        description:
          'A segmented date (and optional time) input over a pluggable date adapter — each part a spinbutton with keyboard stepping, locale-driven segment order and min / max clamping.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/',
      },
      {
        slug: 'date-range-field',
        title: 'Date Range Field',
        description:
          'A segmented date (and optional time) range input over a pluggable date adapter: two labelled spinbutton endpoints (start / end) sharing locale, granularity and bounds. Implements FormValueControl, so the committed range auto-wires with Signal Forms — null until both endpoints are filled and ordered.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/',
      },
      {
        slug: 'time-field',
        title: 'Time Field',
        description:
          'A segmented time-of-day input over a pluggable date adapter, with 12 / 24-hour cycles, optional seconds, and min / max time clamping.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/',
      },
      {
        slug: 'time-range-field',
        title: 'Time Range Field',
        description:
          'A segmented time-of-day range input over a time-capable date adapter: two labelled spinbutton endpoints (start / end) sharing the hour cycle and min / max bounds. Implements FormValueControl, so the committed range auto-wires with Signal Forms — null until both endpoints are filled and ordered.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/',
      },
      {
        slug: 'time-picker',
        title: 'Time Picker',
        description:
          'A trigger that opens a floating listbox of generated time slots over a pluggable date adapter, with a configurable step, 12 / 24-hour labels and min / max bounds. Picking a slot preserves the date, so it composes inside a date-time picker.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/listbox/',
      },
      {
        slug: 'calendar',
        title: 'Calendar',
        description:
          'A single-date calendar grid implementing the APG Grid pattern over a pluggable date adapter: roving-tabindex day navigation, month / year paging, and min / max / per-date availability.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/grid/',
      },
      {
        slug: 'date-picker',
        title: 'Date Picker',
        description:
          'A trigger that opens a floating calendar to pick a date, composing ForCalendar inside a dismissable popover with min / max bounds and per-date availability.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/',
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
        slug: 'carousel',
        title: 'Carousel',
        description:
          'A slideshow of content panels with previous / next controls, an indicator group, optional looping and multi-slide views, and an accessible autoplay mode with a pause control.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/carousel/',
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
        slug: 'stepper',
        title: 'Stepper',
        description:
          'A multi-step wizard built on the Tabs pattern: a step list with indicators and separators, a content panel per step, Next / Previous navigation, linear gating with optional Signal Forms completion, a display-only progress mode and an optional progress bar.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/tabs/',
      },
      {
        slug: 'toolbar',
        title: 'Toolbar',
        description: 'A container that groups a set of controls under roving-tabindex navigation.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/',
      },
      {
        slug: 'breadcrumbs',
        title: 'Breadcrumbs',
        description:
          "A labelled navigation landmark for a breadcrumb trail: links with aria-current='page' on the current page and decorative separators hidden from assistive technology.",
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/',
      },
      {
        slug: 'pagination',
        title: 'Pagination',
        description:
          "A navigation landmark that derives a visible page list with ellipsis gaps from page, count, siblingCount and boundaryCount, with previous / next buttons and aria-current='page' on the active page.",
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/examples/navigation.html',
      },
      {
        slug: 'separator',
        title: 'Separator',
        description:
          'A static, optionally semantic divider between groups of content or controls, horizontal or vertical.',
      },
      {
        slug: 'pane-resizer',
        title: 'Pane Resizer',
        description:
          'A focusable divider that resizes the panes on either side — draggable and keyboard-operable, with an optional collapse behaviour.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/',
      },
      {
        slug: 'table',
        title: 'Table',
        description:
          'A headless data table that decorates a native <table> or a <div> CSS grid with WAI-ARIA table / grid semantics: sticky headers, 2D keyboard navigation, row selection, sortable headers, column resizing and column / row reordering.',
        apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/grid/',
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
    label: 'Utilities',
    primitives: [
      {
        slug: 'breakpoints',
        title: 'Breakpoints',
        description:
          'A signal-first, zoneless, SSR-safe viewport breakpoint observer (injectBreakpoints). Configure the breakpoint map once via provideForBreakpoints — or use the Tailwind scale by default — then read up / down / between / only / active or any arbitrary media query, each as a live Signal<boolean>.',
      },
      {
        slug: 'drag-drop',
        title: 'Drag & Drop',
        description:
          'Headless, accessible drag-and-drop for sortable lists and cross-list transfers, driven by both keyboard and pointer. Ships drag handles, custom preview / placeholder templates, live-sort, FLIP reorder animations, auto-scroll, and boundary / axis-lock constraints.',
      },
      {
        slug: 'virtualization',
        title: 'Virtualization',
        description:
          'A headless windowing core (injectVirtualizer) plus an ergonomic [forVirtualViewport] + *forVirtualFor layer that render only the visible slice of huge lists. Fixed or measured item sizes, horizontal lists, scroll-to-index, and an infinite-scroll detector. List primitives (Select, Combobox, Listbox, Tree, Table) compose it directly.',
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

export function groupLabelForSlug(slug: string): string {
  for (const group of PLAYGROUND_GROUPS) {
    if (group.primitives.some((primitive) => primitive.slug === slug)) {
      return group.label;
    }
  }
  throw new Error(`[playground] unknown primitive slug: ${slug}`);
}
