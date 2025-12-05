import { Editor, type EditorProps, type Monaco } from "@monaco-editor/react";
import { shikiToMonaco } from "@shikijs/monaco";
import { useEffect, useState } from "react";
import { DEFAULT_EDITOR_OPTIONS, highlighterPromise } from "../../lib/editor-config";
import type { HighlighterGeneric } from "shiki";

interface CodeEditorProps extends EditorProps {
  language?: string;
}

export function CodeEditor({ language = "plaintext", ...props }: CodeEditorProps) {
  const [highlighter, setHighlighter] = useState<HighlighterGeneric<any, any> | null>(null);

  useEffect(() => {
    highlighterPromise.then(setHighlighter);
  }, []);

  const handleBeforeMount = (monaco: Monaco) => {
    if (language === "ANTLR4") {
      monaco.languages.register({ id: "ANTLR4" });
    }
    
    if (highlighter) {
      shikiToMonaco(highlighter, monaco);
    }
    
    props.beforeMount?.(monaco);
  };

  // If highlighter is not ready yet, we might want to show a loader or just render without shiki for a split second.
  // But since shikiToMonaco is called in beforeMount, we need highlighter to be ready if we want it to work immediately.
  // However, beforeMount is called when Editor mounts.
  
  // A better approach might be to only render Editor when highlighter is ready if highlighting is critical,
  // or just let it update. shikiToMonaco might need to be called again if highlighter comes later?
  // No, shikiToMonaco registers the provider.

  // Let's try to wait for highlighter before rendering Editor if it's not ready, 
  // or just pass it if it resolves quickly.
  
  if (!highlighter) return null; // Or a loading spinner

  return (
    <Editor
      {...DEFAULT_EDITOR_OPTIONS}
      language={language}
      {...props}
      beforeMount={handleBeforeMount}
    />
  );
}
