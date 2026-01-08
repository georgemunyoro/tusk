import { useEffect, useMemo, useRef, useState } from "react";

type RuleSelectProps = {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  maxOptions?: number;
};

export function RuleSelect({
  value,
  options,
  onChange,
  placeholder = "Search rule",
  maxOptions = 200,
}: RuleSelectProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filteredOptions = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return options;
    return options.filter((item) => item.toLowerCase().includes(search));
  }, [query, options]);

  const visibleOptions = filteredOptions.slice(0, maxOptions);
  const showDropdown =
    isFocused && (options.length > 0 || query.trim().length > 0);

  useEffect(() => {
    if (!showDropdown) return;
    const selectedIndex = visibleOptions.findIndex((item) => item === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [showDropdown, visibleOptions, value]);

  useEffect(() => {
    if (!isFocused) {
      setQuery("");
    }
  }, [isFocused]);

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    setQuery("");
    setIsFocused(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        Math.min(current + 1, visibleOptions.length - 1)
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const activeItem = visibleOptions[activeIndex];
      if (activeItem) {
        handleSelect(activeItem);
        return;
      }

      const exactMatch = filteredOptions.find(
        (item) => item.toLowerCase() === query.trim().toLowerCase()
      );
      if (exactMatch) {
        handleSelect(exactMatch);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative w-60 min-w-0">
      <input
        ref={inputRef}
        value={isFocused ? query : value}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => {
          setIsFocused(true);
          setQuery("");
        }}
        onBlur={() => {
          setIsFocused(false);
          setQuery("");
        }}
        onKeyDown={handleKeyDown}
        placeholder={value ? value : placeholder}
        className="input w-full min-w-0 bg-zinc-900 border-zinc-700 truncate overflow-hidden text-ellipsis"
        autoComplete="off"
        title={value || undefined}
      />
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-auto overflow-x-hidden rounded-md border border-zinc-800 bg-zinc-950 shadow-lg">
          {visibleOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-zinc-400">
              No matching rules.
            </div>
          ) : (
            <ul className="py-1 text-sm text-zinc-100">
              {visibleOptions.map((item, index) => (
                <li key={item}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`w-full max-w-full px-3 py-1.5 text-left hover:bg-zinc-800 ${
                      index === activeIndex
                        ? "bg-zinc-800 text-white"
                        : item === value
                        ? "bg-zinc-800/60 text-white"
                        : ""
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate">{item}</span>
                      {item === value && (
                        <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-300">
                          Active
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
              {filteredOptions.length > maxOptions && (
                <li className="px-3 py-1.5 text-xs text-zinc-400">
                  Showing {maxOptions} of {filteredOptions.length} rules.
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
