export function captureContent(host: HTMLElement): () => void {
  const parents: (readonly [Node, readonly ChildNode[]])[] = [];
  const texts: (readonly [ChildNode, string | null])[] = [];
  const visit = (node: Node): void => {
    const children = Array.from(node.childNodes);
    parents.push([node, children]);
    for (const child of children) {
      if (child.nodeType === child.TEXT_NODE) {
        texts.push([child, child.nodeValue]);
      } else {
        visit(child);
      }
    }
  };
  visit(host);
  return () => {
    for (const [parent, children] of parents) {
      const current = parent.childNodes;
      if (current.length !== children.length || children.some((child, i) => current[i] !== child)) {
        (parent as ParentNode).replaceChildren(...children);
      }
    }
    for (const [text, value] of texts) {
      if (text.nodeValue !== value) {
        text.nodeValue = value;
      }
    }
  };
}
