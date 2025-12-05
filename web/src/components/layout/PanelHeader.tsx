import type { ReactNode } from "react";

interface PanelHeaderProps {
  title: string;
  children?: ReactNode;
}

export function PanelHeader({ title, children }: PanelHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/30 px-4 py-2 text-xs font-medium text-zinc-400">
      <span>{title}</span>
      {children}
    </div>
  );
}
