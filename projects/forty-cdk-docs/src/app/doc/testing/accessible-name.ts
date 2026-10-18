export type NameSource =
  'aria-labelledby' | 'aria-label' | 'label' | 'alt' | 'content' | 'title' | 'placeholder';

export interface AccessibleName {
  readonly name: string;
  readonly source: NameSource | null;
}

export const AUTHOR_SOURCES: ReadonlySet<NameSource> = new Set([
  'aria-labelledby',
  'aria-label',
  'label',
]);

const NAME_FROM_CONTENT: ReadonlySet<string> = new Set([
  'button',
  'cell',
  'checkbox',
  'columnheader',
  'gridcell',
  'heading',
  'link',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'row',
  'rowheader',
  'switch',
  'tab',
  'tooltip',
  'treeitem',
]);

const UNNAMED_INPUT_TYPES: ReadonlySet<string> = new Set([
  'hidden',
  'file',
  'color',
  'date',
  'datetime-local',
  'month',
  'time',
  'week',
]);

export function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function roleOf(el: Element): string | null {
  const explicit = el.getAttribute('role')?.trim().split(/\s+/)[0];
  if (explicit) {
    return explicit;
  }
  switch (el.localName) {
    case 'button':
      return 'button';
    case 'a':
      return el.hasAttribute('href') ? 'link' : null;
    case 'textarea':
      return 'textbox';
    case 'select':
      return (el as HTMLSelectElement).multiple || (el as HTMLSelectElement).size > 1
        ? 'listbox'
        : 'combobox';
    case 'progress':
      return 'progressbar';
    case 'meter':
      return 'meter';
    case 'img':
      return el.getAttribute('alt') === '' ? 'presentation' : 'img';
    case 'input':
      return inputRole(el as HTMLInputElement);
    default:
      return null;
  }
}

function inputRole(input: HTMLInputElement): string | null {
  const type = input.type.toLowerCase();
  if (UNNAMED_INPUT_TYPES.has(type)) {
    return null;
  }
  switch (type) {
    case 'checkbox':
      return 'checkbox';
    case 'radio':
      return 'radio';
    case 'range':
      return 'slider';
    case 'number':
      return 'spinbutton';
    case 'button':
    case 'submit':
    case 'reset':
    case 'image':
      return 'button';
    case 'search':
      return input.hasAttribute('list') ? 'combobox' : 'searchbox';
    default:
      return input.hasAttribute('list') ? 'combobox' : 'textbox';
  }
}

function hiddenSelf(el: Element): boolean {
  if (el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true') {
    return true;
  }
  if (['style', 'script', 'template'].includes(el.localName)) {
    return true;
  }
  const style = el.ownerDocument.defaultView?.getComputedStyle(el);
  return style?.display === 'none' || style?.visibility === 'hidden';
}

export function isExposed(el: Element): boolean {
  for (let node: Element | null = el; node; node = node.parentElement) {
    if (hiddenSelf(node) || node.hasAttribute('inert')) {
      return false;
    }
  }
  return true;
}

function subtreeText(node: Node, control: Element | null, root: boolean): string {
  if (node.nodeType === node.TEXT_NODE) {
    return node.textContent ?? '';
  }
  if (!(node instanceof Element) || node === control) {
    return '';
  }
  if (!root && hiddenSelf(node)) {
    return '';
  }
  const ariaLabel = collapse(node.getAttribute('aria-label') ?? '');
  if (ariaLabel && !root) {
    return ariaLabel;
  }
  if (node.localName === 'img') {
    return node.getAttribute('alt') ?? '';
  }
  if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
    return node.value;
  }
  return [...node.childNodes].map((child) => subtreeText(child, control, false)).join(' ');
}

export function visibleText(el: Element): string {
  return collapse(subtreeText(el, null, true));
}

export function labelText(el: Element): string {
  const labels = 'labels' in el ? (el as HTMLInputElement).labels : null;
  return collapse([...(labels ?? [])].map((label) => subtreeText(label, el, true)).join(' '));
}

export function namesFromContent(role: string | null): boolean {
  return role !== null && NAME_FROM_CONTENT.has(role);
}

export function accessibleName(el: Element): AccessibleName {
  const doc = el.ownerDocument;
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const name = collapse(
      labelledBy
        .split(/\s+/)
        .map((id) => doc.getElementById(id))
        .filter((ref): ref is HTMLElement => ref !== null)
        .map(
          (ref) =>
            collapse(ref.getAttribute('aria-label') ?? '') ||
            subtreeText(ref, ref === el ? null : el, true),
        )
        .join(' '),
    );
    if (name) {
      return { name, source: 'aria-labelledby' };
    }
  }
  const ariaLabel = collapse(el.getAttribute('aria-label') ?? '');
  if (ariaLabel) {
    return { name: ariaLabel, source: 'aria-label' };
  }
  const label = labelText(el);
  if (label) {
    return { name: label, source: 'label' };
  }
  if (el.localName === 'img') {
    const alt = collapse(el.getAttribute('alt') ?? '');
    if (alt) {
      return { name: alt, source: 'alt' };
    }
  }
  if (namesFromContent(roleOf(el))) {
    const content = visibleText(el);
    if (content) {
      return { name: content, source: 'content' };
    }
  }
  const title = collapse(el.getAttribute('title') ?? '');
  if (title) {
    return { name: title, source: 'title' };
  }
  const placeholder = collapse(el.getAttribute('placeholder') ?? '');
  if (placeholder) {
    return { name: placeholder, source: 'placeholder' };
  }
  return { name: '', source: null };
}
