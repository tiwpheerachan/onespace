"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CornerDownLeft, LayoutGrid, Moon, Search, Sun, Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppLogo } from "@/components/AppLogo";
import { usePortal } from "@/lib/data/store";
import { LANG_META, LANGS } from "@/lib/i18n/dictionaries";
import { usePrefs } from "@/lib/i18n/provider";
import { cn, normalise } from "@/lib/utils";

interface Item {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const { t, setLang, theme, setTheme } = usePrefs();
  const { apps, canOpen, registerLaunch, can } = usePortal();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const appItems: Item[] = apps
      .filter((a) => canOpen(a))
      .map((a) => ({
        id: `app-${a.id}`,
        group: t.palette.apps,
        label: a.name,
        hint: t.cat[a.category],
        icon: <AppLogo app={a} size={26} radius={8} />,
        run: () => {
          registerLaunch(a);
          window.open(a.url, "_blank", "noopener,noreferrer");
        },
      }));

    const pages: Item[] = [
      { path: "/dashboard", label: t.nav.dashboard, perm: true },
      { path: "/admin/apps", label: t.nav.apps, perm: can("app.manage") },
      { path: "/admin/users", label: t.nav.users, perm: can("user.manage") },
      { path: "/admin/roles", label: t.nav.roles, perm: can("role.manage") },
      { path: "/admin/audit", label: t.nav.audit, perm: can("audit.view") },
      { path: "/settings", label: t.nav.settings, perm: true },
    ]
      .filter((p) => p.perm)
      .map((p) => ({
        id: `page-${p.path}`,
        group: t.palette.pages,
        label: p.label,
        icon: <LayoutGrid className="h-4 w-4" />,
        run: () => router.push(p.path),
      }));

    const actions: Item[] = [
      {
        id: "act-theme",
        group: t.palette.actions,
        label: theme === "dark" ? t.common.light : t.common.dark,
        icon: theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
        run: () => setTheme(theme === "dark" ? "light" : "dark"),
      },
      ...LANGS.map((l) => ({
        id: `act-lang-${l}`,
        group: t.palette.actions,
        label: `${t.common.language}: ${LANG_META[l].native}`,
        icon: <Languages className="h-4 w-4" />,
        run: () => setLang(l),
      })),
    ];

    return [...appItems, ...pages, ...actions];
  }, [apps, canOpen, registerLaunch, router, t, theme, setTheme, setLang, can]);

  const filtered = useMemo(() => {
    const q = normalise(query.trim());
    if (!q) return items;
    return items.filter((i) => normalise(i.label + " " + (i.hint ?? "")).includes(q));
  }, [items, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    filtered.forEach((i) => map.set(i.group, [...(map.get(i.group) ?? []), i]));
    return [...map.entries()];
  }, [filtered]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
        return;
      }
      if (!open) return;
      if (e.key === "Escape") onOpenChange(false);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = filtered[active];
        if (item) {
          item.run();
          onOpenChange(false);
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, filtered, active, onOpenChange]);

  let cursor = -1;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[12vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-[3px]"
          />
          <motion.div
            initial={{ opacity: 0, y: -14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface shadow-lift"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="h-4 w-4 shrink-0 text-ink-mute" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                placeholder={t.palette.placeholder}
                className="h-14 flex-1 bg-transparent text-[14.5px] text-ink outline-none placeholder:text-ink-mute"
              />
              <kbd className="rounded-md border border-line px-1.5 py-0.5 text-[10.5px] font-semibold text-ink-mute">
                ESC
              </kbd>
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-2">
              {grouped.length === 0 && (
                <p className="px-3 py-10 text-center text-[13px] text-ink-mute">{t.palette.empty}</p>
              )}
              {grouped.map(([group, list]) => (
                <div key={group} className="mb-1">
                  <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-mute">
                    {group}
                  </p>
                  {list.map((item) => {
                    cursor += 1;
                    const idx = cursor;
                    return (
                      <button
                        key={item.id}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => {
                          item.run();
                          onOpenChange(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                          idx === active ? "bg-canvas" : "hover:bg-canvas/70",
                        )}
                      >
                        <span className="flex h-7 w-7 items-center justify-center text-ink-soft">
                          {item.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-medium text-ink">
                            {item.label}
                          </span>
                          {item.hint && (
                            <span className="block truncate text-[11.5px] text-ink-mute">{item.hint}</span>
                          )}
                        </span>
                        {idx === active && <CornerDownLeft className="h-3.5 w-3.5 text-ink-mute" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
