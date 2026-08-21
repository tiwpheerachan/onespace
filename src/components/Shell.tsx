"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Boxes,
  ChevronDown,
  ChevronUp,
  Command,
  Gauge,
  Github,
  KeyRound,
  LayoutGrid,
  Languages,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CommandPalette } from "@/components/CommandPalette";
import { MatrixClock } from "@/components/MatrixClock";
import { Avatar } from "@/components/ui";
import { Wordmark } from "@/components/Wordmark";
import { usePortal } from "@/lib/data/store";
import { LANG_META, LANGS } from "@/lib/i18n/dictionaries";
import { usePrefs } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

function Brand({ compact = false }: { compact?: boolean }) {
  const { t } = usePrefs();
  return (
    <Link href="/dashboard" className="group flex items-center gap-3">
      {compact ? (
        <span className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface">
          <span className="block h-5 w-5 rounded-full border-[2.5px] border-ink [clip-path:inset(0_0_18%_0)]" />
        </span>
      ) : (
        <span className="leading-tight">
          <Wordmark height={20} className="mb-1" />
          <span className="block text-[11px] tracking-wide text-ink-mute">{t.brand.suffix}</span>
        </span>
      )}
    </Link>
  );
}

function LanguageMenu() {
  const { lang, setLang, t } = usePrefs();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const close = () => setOpen(false);
    if (open) document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-[12.5px] font-semibold text-ink-soft transition hover:border-brand-300 hover:text-ink"
        title={t.common.language}
      >
        <Languages className="h-4 w-4" />
        <span className="hidden sm:inline">{LANG_META[lang].native}</span>
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-lift"
          >
            {LANGS.map((l) => (
              <button
                key={l}
                onClick={() => {
                  setLang(l);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition",
                  l === lang ? "bg-canvas font-semibold text-ink" : "text-ink-soft hover:bg-canvas",
                )}
              >
                <span className="text-base leading-none">{LANG_META[l].flag}</span>
                {LANG_META[l].native}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = usePrefs();
  return (
    <button
      onClick={toggleTheme}
      className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface text-ink-soft transition hover:border-brand-300 hover:text-ink"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ y: 14, opacity: 0, rotate: -30 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: -14, opacity: 0, rotate: 30 }}
          transition={{ duration: 0.2 }}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

function UserMenu() {
  const { t } = usePrefs();
  const { currentUser, currentRole, signOut } = usePortal();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const close = () => setOpen(false);
    if (open) document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  if (!currentUser) return null;

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-xl border border-transparent p-1 pr-2 transition hover:border-line hover:bg-surface"
      >
        <Avatar
          name={currentUser.name}
          src={currentUser.avatarUrl}
          size={32}
          color={currentRole?.color ?? "#1f43e6"}
        />
        <span className="hidden text-left leading-tight md:block">
          <span className="block text-[12.5px] font-semibold text-ink">{currentUser.name}</span>
          <span className="block text-[11px] text-ink-mute">{currentRole?.name}</span>
        </span>
        <ChevronDown className="hidden h-3.5 w-3.5 text-ink-mute md:block" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-lift"
          >
            <div className="border-b border-line px-3 py-3">
              <p className="text-[13px] font-semibold text-ink">{currentUser.name}</p>
              <p className="truncate text-[11.5px] text-ink-mute">{currentUser.email}</p>
              <p className="mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold"
                 style={{ background: `${currentRole?.color}1a`, color: currentRole?.color }}>
                {currentRole?.name}
              </p>
            </div>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] text-ink-soft transition hover:bg-canvas hover:text-ink"
            >
              <Settings className="h-4 w-4" />
              {t.common.settings}
            </Link>
            <button
              onClick={async () => {
                await signOut();
                router.push("/login");
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
            >
              <LogOut className="h-4 w-4" />
              {t.common.signOut}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** A boolean that persists to localStorage — used for nav collapse prefs. */
function usePersistentBool(key: string, initial: boolean) {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    try {
      const s = window.localStorage.getItem(key);
      if (s != null) setValue(s === "1");
    } catch {
      /* ignore */
    }
  }, [key]);
  const set = (v: boolean) => {
    setValue(v);
    try {
      window.localStorage.setItem(key, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  };
  return [value, set] as const;
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { t } = usePrefs();
  const { can, supabaseReady, apps } = usePortal();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistentBool("nav.sidebar.collapsed", false);
  const [headerHidden, setHeaderHidden] = usePersistentBool("nav.header.hidden", false);

  useEffect(() => setMobileOpen(false), [pathname]);

  const sections = [
    {
      label: t.nav.main,
      items: [
        { href: "/dashboard", label: t.nav.dashboard, icon: LayoutGrid, show: true },
        { href: "/performance", label: t.nav.performance, icon: Gauge, show: true },
      ],
    },
    {
      label: t.nav.admin,
      items: [
        { href: "/admin/insights", label: t.nav.insights, icon: BarChart3, show: can("audit.view") },
        { href: "/admin/apps", label: t.nav.apps, icon: Boxes, show: can("app.manage") },
        {
          href: "/admin/access",
          label: t.nav.access,
          icon: KeyRound,
          show: can("app.manage") || can("user.manage") || can("role.manage"),
        },
        { href: "/admin/audit", label: t.nav.audit, icon: ScrollText, show: can("audit.view") },
      ],
    },
    {
      label: t.common.settings,
      items: [{ href: "/settings", label: t.nav.settings, icon: Settings, show: true }],
    },
  ]
    .map((s) => ({ ...s, items: s.items.filter((i) => i.show) }))
    .filter((s) => s.items.length);

  const navList = (collapsed: boolean, layoutIdSuffix: string) => (
    <nav className={cn("flex flex-1 flex-col gap-7", collapsed ? "px-2.5" : "px-3")}>
      {sections.map((section) => (
        <div key={section.label}>
          {!collapsed && (
            <p className="mb-2 px-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-mute">
              {section.label}
            </p>
          )}
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const activeItem = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "group relative flex items-center rounded-xl text-[13.5px] font-medium transition-colors",
                    collapsed ? "justify-center px-2.5 py-2.5" : "gap-3 px-3 py-2.5",
                    activeItem ? "text-ink" : "text-ink-soft hover:text-ink",
                  )}
                >
                  {activeItem && (
                    <motion.span
                      layoutId={`nav-active-${layoutIdSuffix}`}
                      transition={{ type: "spring", stiffness: 400, damping: 34 }}
                      className="absolute inset-0 rounded-xl border border-line bg-surface shadow-card"
                    />
                  )}
                  <Icon
                    className={cn(
                      "relative h-[18px] w-[18px] shrink-0 transition-colors",
                      activeItem ? "text-brand-600" : "text-ink-mute group-hover:text-ink-soft",
                    )}
                  />
                  {!collapsed && <span className="relative">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* ── desktop sidebar ─────────────────────────────── */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-surface/60 py-6 backdrop-blur-xl transition-[width] duration-300 ease-out lg:flex",
          sidebarCollapsed ? "w-[74px]" : "w-[264px]",
        )}
      >
        <div className={cn("flex items-center pb-8", sidebarCollapsed ? "flex-col gap-3 px-3" : "justify-between px-6")}>
          <Brand compact={sidebarCollapsed} />
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? t.nav.expand : t.nav.collapse}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-mute transition hover:bg-canvas hover:text-ink"
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
          </button>
        </div>
        {navList(sidebarCollapsed, "desktop")}
        {!sidebarCollapsed && (
          <div className="mt-6 px-6">
            <div className="rounded-xl border border-line bg-canvas/70 p-3.5">
              <p className="text-[11.5px] font-semibold text-ink">{t.brand.company}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-ink-mute">
                {apps.length} {t.apps.count}
              </p>
              <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-line">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "86%" }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full bg-gradient-to-r from-brand-600 to-teal-500"
                />
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ── mobile drawer ───────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-[70] lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-slate-900/35 backdrop-blur-[2px]"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 360, damping: 34 }}
              className="relative flex h-full w-[280px] flex-col border-r border-line bg-surface py-6"
            >
              <div className="flex items-center justify-between px-6 pb-8">
                <Brand />
                <button onClick={() => setMobileOpen(false)} className="text-ink-mute">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {navList(false, "mobile")}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* ── main column ─────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {headerHidden && (
          <button
            onClick={() => setHeaderHidden(false)}
            title={t.nav.showBar}
            className="sticky top-0 z-40 flex h-6 w-full items-center justify-center border-b border-line bg-surface/80 text-ink-mute backdrop-blur transition hover:text-ink"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
        <header className={cn("sticky top-0 z-40 border-b border-line glass", headerHidden && "hidden")}>
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-soft lg:hidden"
            >
              <Menu className="h-[18px] w-[18px]" />
            </button>

            <button
              onClick={() => setPaletteOpen(true)}
              className="group flex h-9 flex-1 items-center gap-2.5 rounded-xl border border-line bg-surface px-3 text-left text-[13px] text-ink-mute transition hover:border-brand-300 sm:max-w-md"
            >
              <Command className="h-4 w-4" />
              <span className="flex-1 truncate">{t.nav.palette}</span>
              <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 text-[10.5px] font-semibold sm:block">
                ⌘K
              </kbd>
            </button>

            <div className="ml-auto flex items-center gap-2">
              {!supabaseReady && (
                <span className="hidden items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 md:inline-flex dark:bg-amber-500/10 dark:text-amber-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {t.demo.badge}
                </span>
              )}
              <MatrixClock
                size={5}
                gap={1}
                className="mr-1 hidden rounded-xl border border-line bg-surface/70 px-2.5 py-1.5 text-ink-soft md:flex"
              />
              <LanguageMenu />
              <ThemeToggle />
              <button
                onClick={() => setHeaderHidden(true)}
                title={t.nav.hideBar}
                className="hidden h-9 w-9 items-center justify-center rounded-lg text-ink-mute transition hover:bg-canvas hover:text-ink sm:flex"
              >
                <ChevronUp className="h-[18px] w-[18px]" />
              </button>
              <span className="mx-1 hidden h-6 w-px bg-line sm:block" />
              <UserMenu />
            </div>
          </div>
        </header>

        <main className="relative flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-brand-50/60 to-transparent dark:from-brand-500/5" />
          <div className="relative mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">{children}</div>
        </main>

        <footer className="border-t border-line px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-2 text-[11.5px] text-ink-mute sm:flex-row">
            <p>
              © {new Date().getFullYear()} {t.brand.company} · {t.brand.name} {t.brand.suffix}
            </p>
            <p className="flex items-center gap-1.5">
              <Github className="h-3.5 w-3.5" />
              Next.js · Supabase · Tailwind
            </p>
          </div>
        </footer>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
