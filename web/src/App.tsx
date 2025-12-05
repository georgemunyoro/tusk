import { PanelGroup, Panel } from "react-resizable-panels";
import { useMemo } from "react";
import { useDebounce, useLocalStorage } from "@uidotdev/usehooks";
import { ResizeHandle } from "./components/layout/ResizeHandle";
import { toTree, parseTokens, tokenizeStringTree } from "./utils";
import "@xyflow/react/dist/style.css";
import { Header } from "./components/layout/Header";
import { PanelHeader } from "./components/layout/PanelHeader";
import { CodeEditor } from "./components/editor/CodeEditor";
import { OutputPanel } from "./components/OutputPanel";
import { useParse } from "./hooks/useParse";
import { type TreeNode } from "./components/TreeRenderer";

function App() {
  const [grammar, setGrammar] = useLocalStorage<string>("grammar", "");
  const [source, setSource] = useLocalStorage<string>("source", "");
  const [rule, setRule] = useLocalStorage<string>("rule", "");
  const [view, setView] = useLocalStorage<"tree" | "graph">("view", "tree");

  const debouncedGrammar = useDebounce(grammar, 400);
  const debouncedSource = useDebounce(source, 400);

  const { data, status, refetch, isFetching } = useParse({
    grammar: debouncedGrammar,
    source: debouncedSource,
    rule,
  });

  const tree: TreeNode | null = useMemo(() => {
    if (!data || !data.string_tree) return null;
    return toTree(
      parseTokens(tokenizeStringTree(data.string_tree))
    ) as TreeNode;
  }, [data?.string_tree]);

  return (
    <div className="flex h-screen w-screen flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      <Header />

      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" autoSaveId="horizontal">
          {/* Left Panel: Grammar */}
          <Panel defaultSize={40} minSize={20}>
            <div className="flex h-full flex-col border-r border-zinc-800">
              <PanelHeader title="GRAMMAR" />
              <div className="flex-1 overflow-hidden">
                <CodeEditor
                  value={grammar}
                  onChange={(newValue) => setGrammar(newValue ?? "")}
                  language="ANTLR4"
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
                  <PanelHeader title="SOURCE" />
                  <div className="flex-1 overflow-hidden">
                    <CodeEditor
                      value={source}
                      onChange={(newValue) => setSource(newValue ?? "")}
                      className="h-full"
                    />
                  </div>
                </div>
              </Panel>

              <ResizeHandle vertical />

              {/* Output / Controls */}
              <Panel minSize={30}>
                <OutputPanel
                  rule={rule}
                  onRuleChange={setRule}
                  rules={data?.rules || []}
                  onParse={() => refetch()}
                  isParsing={isFetching}
                  view={view}
                  onViewChange={setView}
                  status={status}
                  tree={tree}
                  hasData={!!data}
                />
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}

export default App;
