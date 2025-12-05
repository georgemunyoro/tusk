import { createHighlighter, type BundledTheme } from "shiki";
import { antlrLangSyntaxConfig } from "./antlrLangSyntaxConfig";
import { type EditorProps } from "@monaco-editor/react";

export const DEFAULT_THEME: BundledTheme = "ayu-dark";

export const highlighterPromise = createHighlighter({
  themes: [DEFAULT_THEME],
  langs: ["plaintext", antlrLangSyntaxConfig as any],
});

export const DEFAULT_EDITOR_OPTIONS: EditorProps = {
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
