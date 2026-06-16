import type { TreeNodeData } from './tree-node';

export const CATEGORIES: readonly TreeNodeData[] = [
  {
    id: 'engineering',
    name: 'Engineering',
    children: [
      {
        id: 'frontend',
        name: 'Frontend',
        children: [
          { id: 'angular', name: 'Angular' },
          { id: 'react', name: 'React' },
          { id: 'vue', name: 'Vue' },
        ],
      },
      {
        id: 'backend',
        name: 'Backend',
        children: [
          { id: 'node', name: 'Node.js' },
          { id: 'go', name: 'Go' },
          { id: 'python', name: 'Python' },
        ],
      },
    ],
  },
  {
    id: 'design',
    name: 'Design',
    children: [
      { id: 'product-design', name: 'Product Design' },
      { id: 'brand', name: 'Brand' },
      { id: 'research', name: 'Research' },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    children: [
      { id: 'content', name: 'Content' },
      { id: 'seo', name: 'SEO' },
      { id: 'social', name: 'Social' },
    ],
  },
];

export function buildDescendantsMap(
  roots: readonly TreeNodeData[],
): Map<string, readonly string[]> {
  const map = new Map<string, readonly string[]>();
  const walk = (node: TreeNodeData): string[] => {
    const out: string[] = [];
    for (const child of node.children ?? []) {
      out.push(child.id, ...walk(child));
    }
    map.set(node.id, out);
    return out;
  };
  for (const root of roots) {
    walk(root);
  }
  return map;
}

export function buildAncestorsMap(
  roots: readonly TreeNodeData[],
): Map<string, readonly string[]> {
  const map = new Map<string, readonly string[]>();
  const walk = (node: TreeNodeData, ancestors: readonly string[]): void => {
    map.set(node.id, ancestors);
    for (const child of node.children ?? []) {
      walk(child, [...ancestors, node.id]);
    }
  };
  for (const root of roots) {
    walk(root, []);
  }
  return map;
}

export function collectMatchIds(roots: readonly TreeNodeData[], query: string): Set<string> {
  const needle = query.trim().toLowerCase();
  const ids = new Set<string>();
  if (!needle) {
    return ids;
  }
  const walk = (node: TreeNodeData): void => {
    if (node.name.toLowerCase().includes(needle)) {
      ids.add(node.id);
    }
    for (const child of node.children ?? []) {
      walk(child);
    }
  };
  for (const root of roots) {
    walk(root);
  }
  return ids;
}

export function filterNodes(
  roots: readonly TreeNodeData[],
  query: string,
): readonly TreeNodeData[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return roots;
  }
  const filter = (node: TreeNodeData): TreeNodeData | null => {
    if (node.name.toLowerCase().includes(needle)) {
      return node;
    }
    const children = (node.children ?? [])
      .map(filter)
      .filter((child): child is TreeNodeData => child !== null);
    if (children.length === 0) {
      return null;
    }
    return { ...node, children };
  };
  return roots.map(filter).filter((node): node is TreeNodeData => node !== null);
}
