export function Header() {
  return (
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
  );
}
