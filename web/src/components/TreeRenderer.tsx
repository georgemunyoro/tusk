import { useMemo, useState } from "react";
import { ChevronRight, ChevronDown, Circle } from "lucide-react";
import { clsx } from "clsx";

export type TreeNode = {
  type: any;
  children?: any[];
};

function isTreeNode(value: any): value is TreeNode {
  return value && typeof value === "object" && "type" in value;
}

export function TreeRenderer({
  node,
  depth = 0,
}: {
  node: TreeNode | null;
  depth?: number;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const indentPx = 16;

  if (!isTreeNode(node)) return null;

  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const label = useMemo(() => String(node.type), [node.type]);
  const childCount = node.children?.length ?? 0;
  const isCollapsible = hasChildren;

  return (
    <div className="select-none text-sm">
      {/* Node Header */}
      <button
        type="button"
        className={clsx(
          "group flex w-full items-center gap-2 px-2 text-left transition-colors",
          isCollapsible
            ? "cursor-pointer hover:bg-zinc-900/60"
            : "text-zinc-400"
        )}
        style={{
          paddingLeft: `${depth * indentPx + 4}px`,
          minHeight: "22px",
        }}
        onClick={() => isCollapsible && setCollapsed(!collapsed)}
        aria-expanded={isCollapsible ? !collapsed : undefined}
        aria-label={label}
      >
        {/* Icon */}
        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-zinc-500">
          {hasChildren ? (
            collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )
          ) : (
            <Circle className="h-1.5 w-1.5 fill-zinc-700 text-zinc-700" />
          )}
        </span>

        {/* Node Label */}
        <span
          className={clsx(
            "min-w-0 flex-1 truncate font-mono text-[13px]",
            hasChildren ? "text-zinc-200" : "text-zinc-400"
          )}
          title={label}
        >
          {label}
        </span>
        {hasChildren && (
          <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100">
            {childCount}
          </span>
        )}
      </button>

      {/* Children */}
      {!collapsed &&
        hasChildren &&
        node.children!.map((child, i) => (
          <TreeRenderer key={i} node={child} depth={depth + 1} />
        ))}
    </div>
  );
}
