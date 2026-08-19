"use client";

import { AlertTriangle, Loader2, Search, UserPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui";
import { usePrefs } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

export interface DirectoryPerson {
  name?: string;
  en_name?: string;
  email?: string;
  job_title?: string;
  departments?: string[];
  avatar_url?: string;
  status?: string;
}
type Person = DirectoryPerson;

/**
 * Type-a-name → pick-a-person autocomplete, backed by the central directory
 * (Step G). Picking someone hands their email up via onPick — and the whole
 * directory record via onPickPerson, so a caller can prefill name / avatar /
 * department too. Searches run against our own /api proxy, so the API key never
 * reaches the browser.
 */
export function PersonSearch({
  onPick,
  onPickPerson,
  autoFocus,
  placeholder,
}: {
  onPick?: (email: string) => void;
  onPickPerson?: (p: DirectoryPerson) => void;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const { t } = usePrefs();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [stale, setStale] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/directory/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const data = await r.json();
        setItems(Array.isArray(data.items) ? data.items : []);
        setStale(Boolean(data.stale));
        setOpen(true);
      } catch {
        /* aborted or offline — leave the last results */
      } finally {
        setLoading(false);
      }
    }, 260); // debounce
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pick = (p: Person) => {
    if (p.email) onPick?.(p.email);
    onPickPerson?.(p);
    setQ("");
    setItems([]);
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" />
      <input
        value={q}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => items.length && setOpen(true)}
        placeholder={placeholder ?? t.access.searchPeople}
        className="input pl-10 pr-9"
      />
      {loading && <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink-mute" />}

      {open && (q.trim().length >= 2) && (
        <div className="absolute z-40 mt-2 max-h-[320px] w-full overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-lift">
          {stale && (
            <p className="mb-1 flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t.access.searchStale}
            </p>
          )}
          {items.length === 0 && !loading ? (
            <p className="px-3 py-4 text-center text-[12.5px] text-ink-mute">{t.common.noResults}</p>
          ) : (
            items.map((p, i) => (
              <button
                key={`${p.email}-${i}`}
                onClick={() => pick(p)}
                disabled={!p.email}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition hover:bg-canvas",
                  !p.email && "cursor-not-allowed opacity-50",
                )}
              >
                <Avatar name={p.name || p.email || "?"} src={p.avatar_url} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-semibold text-ink">
                      {p.name || p.en_name || p.email}
                    </span>
                    {p.status && p.status !== "active" && (
                      <span className="shrink-0 rounded bg-canvas px-1.5 py-0.5 text-[10px] font-semibold text-ink-mute">
                        {p.status}
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-[11.5px] text-ink-mute">
                    {[p.job_title, p.departments?.[0]].filter(Boolean).join(" · ") || p.email}
                  </span>
                </span>
                <UserPlus className="h-4 w-4 shrink-0 text-ink-mute" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
