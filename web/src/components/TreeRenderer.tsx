import { useState } from "react";
import { ChevronRight, ChevronDown, Circle } from "lucide-react";
import { clsx } from "clsx";

export type TreeNode = {
  type: any;
  children?: any[];
};

function isTreeNode(value: any): value is TreeNode {
  return value && typeof value === "object" && "type" in value;
}

export function TreeRenderer({ node, depth = 0 }: { node: TreeNode | null; depth?: number }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!isTreeNode(node)) return null;

  const hasChildren = Array.isArray(node.children) && node.children.length > 0;

  return (
    <div className="select-none text-sm">
      {/* Node Header */}
      <div
        className={clsx(
          "flex items-center gap-1.5 rounded-sm px-2 py-1 transition-colors",
          hasChildren ? "cursor-pointer hover:bg-zinc-800" : "text-zinc-400"
        )}
        style={{ marginLeft: `${depth * 12}px` }}
        onClick={() => hasChildren && setCollapsed(!collapsed)}
      >
        {/* Icon */}
        <div className="flex h-4 w-4 items-center justify-center text-zinc-500">
          {hasChildren ? (
            collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )
          ) : (
            <Circle className="h-1.5 w-1.5 fill-zinc-700 text-zinc-700" />
          )}
        </div>

        {/* Node Label */}
        <span className={clsx("font-mono", hasChildren ? "text-zinc-200" : "text-zinc-400")}>
          {String(node.type)}
        </span>
      </div>

      {/* Children */}
      {!collapsed && hasChildren && (
        <div>
          {node.children!.map((child, i) => (
            <TreeRenderer key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
