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
      { slug: 'popover', title: 'Popover', ready: true },
      { slug: 'dropdown-menu', title: 'Dropdown Menu', ready: true },
      { slug: 'context-menu', title: 'Context Menu', ready: true },
      { slug: 'menu', title: 'Menu', ready: true },
      { slug: 'menubar', title: 'Menubar', ready: true },
      { slug: 'navigation-menu', title: 'Navigation Menu', ready: true },
      { slug: 'hover-card', title: 'Hover Card', ready: true },
      { slug: 'tooltip', title: 'Tooltip', ready: true },
      { slug: 'select', title: 'Select', ready: true },
      { slug: 'combobox', title: 'Combobox', ready: true },
      { slug: 'toast', title: 'Toast', ready: true },
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
      { slug: 'listbox', title: 'Listbox', ready: true },
    ],
  },
  {
    label: 'Disclosure & layout',
    primitives: [
      { slug: 'accordion', title: 'Accordion', ready: true },
      { slug: 'disclosure', title: 'Disclosure', ready: true },
      { slug: 'tabs', title: 'Tabs', ready: true },
      { slug: 'toolbar', title: 'Toolbar', ready: true },
      { slug: 'separator', title: 'Separator', ready: true },
      { slug: 'scroll-area', title: 'Scroll Area', ready: true },
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
