import logoUrl from "../../assets/tusk.webp";

export function Header() {
  return (
    <header className="flex h-12 items-center justify-between border-b border-zinc-800 bg-zinc-900/50 px-4 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <img src={logoUrl} className="w-6 h-6" />
        <span className="font-semibold">Tusk</span>
      </div>
      <div className="flex items-center gap-2">
        {/* Add any global actions here */}
      </div>
    </header>
  );
}
