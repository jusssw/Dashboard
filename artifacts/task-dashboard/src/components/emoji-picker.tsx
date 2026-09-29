import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { ALL_EMOJI as EMOJI_DATA } from '@/lib/emoji-data';

// Generated from Unicode's official emoji-data.txt (see src/lib/emoji-data.ts)
// so this covers the full emoji set, not a hand-picked subset.
const ALL_EMOJI = EMOJI_DATA.map(([emoji, keywords]) => ({ emoji, keywords }));

export function EmojiPicker({
  value,
  onChange,
  placeholder = '📄',
  className,
  buttonLabel = 'Choose page icon',
  testId,
}: {
  value: string;
  onChange: (emoji: string) => void;
  placeholder?: string;
  className?: string;
  buttonLabel?: string;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_EMOJI;
    return ALL_EMOJI.filter((item) => item.keywords.includes(q) || item.emoji === q);
  }, [query]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-label={buttonLabel}
        aria-expanded={open}
        className={className}
        data-testid={testId}
      >
        {value || placeholder}
      </button>

      {open && (
        <div
          className="absolute left-0 top-[calc(100%+8px)] z-50 w-80 animate-rise-in rounded-2xl border border-border bg-card p-3 shadow-2xl"
          role="dialog"
          aria-label="Emoji picker"
          data-testid="popover-emoji-picker"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search emoji"
              className="w-full rounded-xl border border-input bg-background py-2 pl-9 pr-8 text-sm placeholder:text-muted-foreground/60"
              data-testid="input-emoji-search"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="mt-3 grid max-h-72 grid-cols-8 gap-1 overflow-y-auto pr-0.5" data-testid="grid-emoji-results">
            {results.length === 0 ? (
              <p className="col-span-7 py-6 text-center text-xs text-muted-foreground">No emoji match "{query}".</p>
            ) : (
              results.map((item) => (
                <button
                  key={item.emoji}
                  type="button"
                  onClick={() => {
                    onChange(item.emoji);
                    setOpen(false);
                    setQuery('');
                  }}
                  aria-label={item.keywords}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-xl hover:bg-secondary"
                  data-testid={`button-emoji-${item.emoji}`}
                >
                  {item.emoji}
                </button>
              ))
            )}
          </div>

          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
                setQuery('');
              }}
              className="mt-2 w-full rounded-xl px-3 py-2 text-center text-xs font-semibold text-muted-foreground hover:bg-secondary"
              data-testid="button-clear-emoji"
            >
              Remove icon
            </button>
          )}
        </div>
      )}
    </div>
  );
}
