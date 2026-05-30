export interface PlaygroundPrimitive {
  readonly slug: string;
  readonly title: string;
  readonly ready: boolean;
}

export interface PlaygroundGroup {
  readonly label: string;
  readonly primitives: readonly PlaygroundPrimitive[];
}

export const PLAYGROUND_GROUPS: readonly PlaygroundGroup[] = [
  {
    label: 'Overlays',
    primitives: [
      { slug: 'dialog', title: 'Dialog', ready: true },
      { slug: 'drawer', title: 'Drawer', ready: true },
      { slug: 'popover', title: 'Popover', ready: false },
      { slug: 'dropdown-menu', title: 'Dropdown Menu', ready: false },
      { slug: 'context-menu', title: 'Context Menu', ready: false },
      { slug: 'menu', title: 'Menu', ready: false },
      { slug: 'menubar', title: 'Menubar', ready: false },
      { slug: 'navigation-menu', title: 'Navigation Menu', ready: false },
      { slug: 'hover-card', title: 'Hover Card', ready: false },
      { slug: 'tooltip', title: 'Tooltip', ready: false },
      { slug: 'select', title: 'Select', ready: false },
      { slug: 'combobox', title: 'Combobox', ready: false },
      { slug: 'toast', title: 'Toast', ready: false },
    ],
  },
  {
    label: 'Forms & selection',
    primitives: [
      { slug: 'switch', title: 'Switch', ready: true },
      { slug: 'checkbox', title: 'Checkbox', ready: true },
      { slug: 'toggle', title: 'Toggle', ready: true },
      { slug: 'radio-group', title: 'Radio Group', ready: true },
      { slug: 'slider', title: 'Slider', ready: true },
      { slug: 'listbox', title: 'Listbox', ready: false },
    ],
  },
  {
    label: 'Disclosure & layout',
    primitives: [
      { slug: 'accordion', title: 'Accordion', ready: true },
      { slug: 'disclosure', title: 'Disclosure', ready: true },
      { slug: 'tabs', title: 'Tabs', ready: true },
      { slug: 'toolbar', title: 'Toolbar', ready: false },
      { slug: 'separator', title: 'Separator', ready: true },
      { slug: 'scroll-area', title: 'Scroll Area', ready: false },
      { slug: 'aspect-ratio', title: 'Aspect Ratio', ready: true },
    ],
  },
  {
    label: 'Display & feedback',
    primitives: [
      { slug: 'avatar', title: 'Avatar', ready: true },
      { slug: 'progress', title: 'Progress', ready: true },
      { slug: 'meter', title: 'Meter', ready: true },
    ],
  },
];
