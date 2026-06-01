export interface PlaygroundPrimitive {
  readonly slug: string;
  readonly title: string;
}

export interface PlaygroundGroup {
  readonly label: string;
  readonly primitives: readonly PlaygroundPrimitive[];
}

export const PLAYGROUND_GROUPS: readonly PlaygroundGroup[] = [
  {
    label: 'Overlays',
    primitives: [
      { slug: 'dialog', title: 'Dialog' },
      { slug: 'drawer', title: 'Drawer' },
      { slug: 'popover', title: 'Popover' },
      { slug: 'dropdown-menu', title: 'Dropdown Menu' },
      { slug: 'context-menu', title: 'Context Menu' },
      { slug: 'menu', title: 'Menu' },
      { slug: 'menubar', title: 'Menubar' },
      { slug: 'navigation-menu', title: 'Navigation Menu' },
      { slug: 'hover-card', title: 'Hover Card' },
      { slug: 'tooltip', title: 'Tooltip' },
      { slug: 'select', title: 'Select' },
      { slug: 'combobox', title: 'Combobox' },
      { slug: 'toast', title: 'Toast' },
    ],
  },
  {
    label: 'Forms & selection',
    primitives: [
      { slug: 'switch', title: 'Switch' },
      { slug: 'checkbox', title: 'Checkbox' },
      { slug: 'toggle', title: 'Toggle' },
      { slug: 'radio-group', title: 'Radio Group' },
      { slug: 'slider', title: 'Slider' },
      { slug: 'listbox', title: 'Listbox' },
    ],
  },
  {
    label: 'Disclosure & layout',
    primitives: [
      { slug: 'accordion', title: 'Accordion' },
      { slug: 'disclosure', title: 'Disclosure' },
      { slug: 'tabs', title: 'Tabs' },
      { slug: 'toolbar', title: 'Toolbar' },
      { slug: 'separator', title: 'Separator' },
      { slug: 'scroll-area', title: 'Scroll Area' },
      { slug: 'aspect-ratio', title: 'Aspect Ratio' },
    ],
  },
  {
    label: 'Display & feedback',
    primitives: [
      { slug: 'avatar', title: 'Avatar' },
      { slug: 'progress', title: 'Progress' },
      { slug: 'meter', title: 'Meter' },
    ],
  },
];
