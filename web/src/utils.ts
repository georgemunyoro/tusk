import type { TreeNode } from "./components/TreeRenderer";

export function tokenizeStringTree(stringTree: string) {
  const tokens = [];
  let current: string[] = [];

  for (const c of stringTree ?? "") {
    if (c === "(" || c === ")") {
      if (current.length) {
        tokens.push(current.join(""));
        current = [];
      }
      tokens.push(c);
    } else if ([" ", "\t", "\n", "\r\n", "\r"].includes(c)) {
      if (current.length) {
        tokens.push(current.join(""));
        current = [];
      }
    } else {
      current.push(c);
    }
  }

  return tokens;
}
export function parseTokens(tokens: string[]) {
  const stack: any = [];
  for (const token of tokens) {
    if (token === "(") stack.push([]);
    else if (token === ")") {
      const node = stack.pop();
      if (!stack.length) return node;
      stack[stack.length - 1].push(node);
    } else stack[stack.length - 1].push(token);
  }

  return [];
}
export function toTree(node: any) {
  if (typeof node === "string") return { type: node };
  if (!node) return {};
  const root = node[0];
  const children = node.slice(1);
  return { type: root, children: children.map(toTree) };
}

type RFNode = {
  id: string;
  position: { x: number; y: number };
  data: { label: string };
};

type RFEdge = {
  id: string;
  source: string;
  target: string;
};

export function treeToFlow(
  root: TreeNode,
  _x = 0,
  y = 0,
  levelGap = 200,
  siblingGap = 120
) {
  const nodes: RFNode[] = [];
  const edges: RFEdge[] = [];

  let idCounter = 0;

  function walk(
    node: TreeNode,
    depth: number,
    offsetY: number,
    parentId?: string
  ) {
    const id = `n${idCounter++}`;

    nodes.push({
      id,
      position: {
        x: depth * levelGap,
        y: offsetY,
      },
      data: {
        label: node.type,
      },
    });

    if (parentId) {
      edges.push({
        id: `${parentId}-${id}`,
        source: parentId,
        target: id,
      });
    }

    if (!node.children?.length) return 1;

    let subtreeHeight = 0;

    node.children.forEach((child: any) => {
      const height = walk(child, depth + 1, y + subtreeHeight * siblingGap, id);
      subtreeHeight += height;
    });

    return Math.max(subtreeHeight, 1);
  }

  walk(root, 0, 0);

  return { nodes, edges };
}
