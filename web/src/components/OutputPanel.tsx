import { RefreshCw, Network, FolderTree, AlertCircle } from "lucide-react";
import { Button } from "./Button";
import { Select } from "./Select";
import { TreeDagre } from "./DagreGraph";
import { TreeRenderer, type TreeNode } from "./TreeRenderer";

interface OutputPanelProps {
  rule: string;
  onRuleChange: (rule: string) => void;
  rules: string[];
  onParse: () => void;
  isParsing: boolean;
  view: "tree" | "graph";
  onViewChange: (view: "tree" | "graph") => void;
  status: "pending" | "error" | "success";
  tree: TreeNode | null;
  hasData: boolean;
}

export function OutputPanel({
  rule,
  onRuleChange,
  rules,
  onParse,
  isParsing,
  view,
  onViewChange,
  status,
  tree,
  hasData,
}: OutputPanelProps) {
  return (
    <div className="flex flex-col h-full bg-zinc-900/20">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/30 p-2">
        <div className="flex items-center gap-2">
          <Select
            value={rule}
            onChange={(e) => onRuleChange(e.target.value)}
            className="w-48 bg-zinc-900 border-zinc-700"
          >
            <option disabled value="">
              Select Rule
            </option>
            {rules.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={onParse}
            isLoading={isParsing}
          >
            <RefreshCw
              className={`mr-2 h-3 w-3 ${isParsing ? "animate-spin" : ""}`}
            />
            Parse
          </Button>
        </div>

        <div className="flex items-center rounded-md border border-zinc-800 bg-zinc-900 p-0.5">
          <button
            onClick={() => onViewChange("tree")}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
              view === "tree"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <FolderTree className="h-3 w-3" />
            Tree
          </button>
          <button
            onClick={() => onViewChange("graph")}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
              view === "graph"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Network className="h-3 w-3" />
            Graph
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative flex-1 overflow-hidden bg-zinc-950/50">
        {status === "pending" && !hasData ? (
          <div className="flex h-full flex-col items-center justify-center text-zinc-500">
            <RefreshCw className="mb-2 h-8 w-8 animate-spin opacity-20" />
            <p>Parsing...</p>
          </div>
        ) : status === "error" ? (
          <div className="flex h-full flex-col items-center justify-center text-red-400">
            <AlertCircle className="mb-2 h-8 w-8 opacity-50" />
            <p>An unexpected error occurred.</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={onParse}
              className="mt-2"
            >
              Try again
            </Button>
          </div>
        ) : (
          <div className="h-full w-full overflow-hidden">
            {view === "graph" && tree && <TreeDagre node={tree} />}
            {view === "tree" && (
              <div className="h-full overflow-auto p-4">
                <TreeRenderer node={tree} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
