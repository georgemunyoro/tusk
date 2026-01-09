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
import { ParseError, useParse } from "./hooks/useParse";
import { type TreeNode } from "./components/TreeRenderer";

function App() {
  const [grammar, setGrammar] = useLocalStorage<string>("grammar", "");
  const [lexer, setLexer] = useLocalStorage<string>("lexer", "");
  const [parser, setParser] = useLocalStorage<string>("parser", "");
  const [source, setSource] = useLocalStorage<string>("source", "");
  const [rule, setRule] = useLocalStorage<string>("rule", "");
  const [view, setView] = useLocalStorage<"tree" | "graph">("view", "tree");
  const [grammarMode, setGrammarMode] = useLocalStorage<"combined" | "split">(
    "grammar_mode",
    "combined"
  );

  const debouncedGrammar = useDebounce(grammar, 400);
  const debouncedLexer = useDebounce(lexer, 400);
  const debouncedParser = useDebounce(parser, 400);
  const debouncedSource = useDebounce(source, 400);

  const { data, status, refetch, isFetching, error } = useParse({
    grammar: grammarMode === "combined" ? debouncedGrammar : undefined,
    lexer: grammarMode === "split" ? debouncedLexer : undefined,
    parser: grammarMode === "split" ? debouncedParser : undefined,
    source: debouncedSource,
    rule,
  });

  const errorMessages = useMemo(() => {
    const messages: string[] = [];

    if (data?.errors?.length) {
      messages.push(...data.errors);
    }

    if (error instanceof ParseError && error.details.length > 0) {
      messages.push(...error.details);
    } else if (error instanceof Error && error.message) {
      messages.push(error.message);
    }

    return Array.from(new Set(messages.filter(Boolean)));
  }, [data?.errors, error]);

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
              <PanelHeader title="GRAMMAR">
                <div className="flex items-center rounded-md border border-zinc-800 bg-zinc-900 p-0.5 text-[10px] uppercase tracking-wide">
                  <button
                    onClick={() => setGrammarMode("combined")}
                    className={`rounded px-2 py-1 transition-colors ${
                      grammarMode === "combined"
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Combined
                  </button>
                  <button
                    onClick={() => setGrammarMode("split")}
                    className={`rounded px-2 py-1 transition-colors ${
                      grammarMode === "split"
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Split
                  </button>
                </div>
              </PanelHeader>
              <div className="flex-1 overflow-hidden">
                {grammarMode === "combined" ? (
                  <CodeEditor
                    value={grammar}
                    onChange={(newValue) => setGrammar(newValue ?? "")}
                    language="ANTLR4"
                    className="h-full"
                  />
                ) : (
                  <PanelGroup direction="vertical" autoSaveId="grammar-vertical">
                    <Panel defaultSize={50} minSize={20}>
                      <div className="flex h-full flex-col">
                        <PanelHeader title="LEXER" />
                        <div className="flex-1 overflow-hidden">
                          <CodeEditor
                            value={lexer}
                            onChange={(newValue) => setLexer(newValue ?? "")}
                            language="ANTLR4"
                            className="h-full"
                          />
                        </div>
                      </div>
                    </Panel>

                    <ResizeHandle vertical />

                    <Panel minSize={20}>
                      <div className="flex h-full flex-col">
                        <PanelHeader title="PARSER" />
                        <div className="flex-1 overflow-hidden">
                          <CodeEditor
                            value={parser}
                            onChange={(newValue) => setParser(newValue ?? "")}
                            language="ANTLR4"
                            className="h-full"
                          />
                        </div>
                      </div>
                    </Panel>
                  </PanelGroup>
                )}
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
                  errorMessages={errorMessages}
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
