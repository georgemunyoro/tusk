import { PanelGroup, Panel } from "react-resizable-panels";
import { Editor, type EditorProps, type Monaco } from "@monaco-editor/react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TreeRenderer, type TreeNode } from "./TreeRenderer";
import { useLocalStorage } from "@uidotdev/usehooks";
import { shikiToMonaco } from "@shikijs/monaco";
import { createHighlighter, type BundledTheme } from "shiki";
import { ResizeHandle } from "./ResizeHandle";
import { Button } from "./components/Button";
import { Select } from "./components/Select";
import { RefreshCw, Network, FolderTree, AlertCircle } from "lucide-react";
import { toTree, parseTokens, tokenizeStringTree } from "./utils";
import { antlrLangSyntaxConfig } from "./antlrLangSyntaxConfig";
import "@xyflow/react/dist/style.css";
import { TreeDagre } from "./components/DagreGraph";

const DEFAULT_THEME: BundledTheme = "ayu-dark";

const highlighter = await createHighlighter({
  themes: [DEFAULT_THEME],
  langs: ["plaintext", antlrLangSyntaxConfig as any],
});

const DEFAULT_EDITOR_OPTIONS: EditorProps = {
  theme: DEFAULT_THEME,
  options: {
    fontSize: 14,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    minimap: {
      enabled: false,
    },
    scrollBeyondLastLine: false,
    padding: { top: 16, bottom: 16 },
    lineNumbers: "on",
    renderLineHighlight: "all",
  },
} as const;

type ParseResponse = {
  errors: string[];
  grammar_name: string;
  rules: string[];
  string_tree: string;
};

function App() {
  const [grammar, setGrammar] = useLocalStorage<string>("grammar", "");
  const [source, setSource] = useLocalStorage<string>("source", "");
  const [rule, setRule] = useLocalStorage<string>("rule", "");
  const [view, setView] = useLocalStorage<"tree" | "graph">("view", "tree");

  const { data, status, refetch, isFetching } = useQuery<ParseResponse>({
    queryKey: ["parseinfo", grammar, source, rule],
    queryFn: async () =>
      fetch("http://localhost:5000/parse", {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grammar, source, rule }),
      }).then((res) => res.json()),
  });

  const tree: TreeNode | null = useMemo(() => {
    if (!data || !data.string_tree) return null;
    return toTree(
      parseTokens(tokenizeStringTree(data.string_tree))
    ) as TreeNode;
  }, [data?.string_tree]);

  return (
    <div className="flex h-screen w-screen flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Header */}
      <header className="flex h-12 items-center justify-between border-b border-zinc-800 bg-zinc-900/50 px-4 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-blue-600 flex items-center justify-center font-bold text-white">
            T
          </div>
          <span className="font-semibold">Tusk</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Add any global actions here */}
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" autoSaveId="horizontal">
          {/* Left Panel: Grammar */}
          <Panel defaultSize={40} minSize={20}>
            <div className="flex h-full flex-col border-r border-zinc-800">
              <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/30 px-4 py-2 text-xs font-medium text-zinc-400">
                <span>GRAMMAR</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <Editor
                  {...DEFAULT_EDITOR_OPTIONS}
                  value={grammar}
                  onChange={(newValue) => setGrammar(newValue ?? "")}
                  language="ANTLR4"
                  beforeMount={(monaco: Monaco) => {
                    monaco.languages.register({ id: "ANTLR4" });
                    shikiToMonaco(highlighter, monaco);
                  }}
                  className="h-full"
                />
              </div>
            </div>
          </Panel>

          <ResizeHandle />

          {/* Right Panel */}
          <Panel minSize={30}>
            <PanelGroup direction="vertical" autoSaveId="vertical">
              {/* Source Input */}
              <Panel defaultSize={30} minSize={20}>
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/30 px-4 py-2 text-xs font-medium text-zinc-400">
                    <span>SOURCE</span>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <Editor
                      {...DEFAULT_EDITOR_OPTIONS}
                      value={source}
                      onChange={(newValue) => setSource(newValue ?? "")}
                      className="h-full"
                    />
                  </div>
                </div>
              </Panel>

              <ResizeHandle vertical />

              {/* Output / Controls */}
              <Panel minSize={30} className="flex flex-col bg-zinc-900/20">
                {/* Toolbar */}
                <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/30 p-2">
                  <div className="flex items-center gap-2">
                    <Select
                      value={rule}
                      onChange={(e) => setRule(e.target.value)}
                      className="w-48 bg-zinc-900 border-zinc-700"
                    >
                      <option disabled value="">
                        Select Rule
                      </option>
                      {data?.rules.map((rule) => (
                        <option key={rule} value={rule}>
                          {rule}
                        </option>
                      ))}
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetch()}
                      isLoading={isFetching}
                    >
                      <RefreshCw
                        className={`mr-2 h-3 w-3 ${
                          isFetching ? "animate-spin" : ""
                        }`}
                      />
                      Parse
                    </Button>
                  </div>

                  <div className="flex items-center rounded-md border border-zinc-800 bg-zinc-900 p-0.5">
                    <button
                      onClick={() => setView("tree")}
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
                      onClick={() => setView("graph")}
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
                  {status === "pending" && !data ? (
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
                        onClick={() => refetch()}
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
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}

export default App;
