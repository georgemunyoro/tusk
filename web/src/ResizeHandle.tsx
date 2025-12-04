import { PanelResizeHandle } from "react-resizable-panels";
import { clsx } from "clsx";

export const RESIZE_HANDLE_SIZE = 6;

export function ResizeHandle({ vertical = false }: { vertical?: boolean }) {
  return (
    <PanelResizeHandle
      className={clsx(
        "relative flex items-center justify-center bg-zinc-900 transition-colors hover:bg-blue-600/20 focus:outline-none data-[resize-handle-active]:bg-blue-600/20",
        vertical ? "h-[6px] w-full cursor-row-resize" : "w-[6px] h-full cursor-col-resize"
      )}
    >
      <div
        className={clsx(
          "bg-zinc-700 rounded-full transition-colors",
          vertical ? "h-1 w-8" : "h-8 w-1"
        )}
      />
    </PanelResizeHandle>
  );
}
