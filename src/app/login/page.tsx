"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Fingerprint,
  Globe,
  KeyRound,
  Loader2,
  Mail,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppLogo } from "@/components/AppLogo";
import { Wordmark } from "@/components/Wordmark";
import { BlackHoleHeroSection } from "@/components/ui/blackhole-hero-section";
import { BlurFade } from "@/components/ui/blur-fade";
import { usePortal } from "@/lib/data/store";
import { LANG_META, LANGS } from "@/lib/i18n/dictionaries";
import { usePrefs } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const { t, lang, setLang } = usePrefs();
  const { signIn, currentUser, loading, apps, users, supabaseReady } = usePortal();
  const router = useRouter();

  const [email, setEmail] = useState("admin@shd-technology.co.th");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!loading && currentUser) router.replace("/dashboard");
  }, [loading, currentUser, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const ok = await signIn(email, password);
    if (ok) {
      router.push("/dashboard");
    } else {
      setError(true);
      setBusy(false);
    }
  };

  const features = [
    { icon: Fingerprint, title: t.login.f1Title, body: t.login.f1Body },
    { icon: ShieldCheck, title: t.login.f2Title, body: t.login.f2Body },
    { icon: ScrollText, title: t.login.f3Title, body: t.login.f3Body },
  ];

  const demoAccounts = users.filter((u) => u.status === "active").slice(0, 4);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* ── the black hole, bent light and all, as the whole backdrop ── */}
      <div className="absolute inset-0">
        <BlackHoleHeroSection
          focus={[0.78, 0.4]}
          scrim="left"
          scrimStrength={0.92}
          distance={24}
          elevation={-5.5}
          roll={-20}
          fov={46}
          glow={1}
          vignette={0.34}
          steps={300}
          resolution={0.7}
        />
      </div>

      {/* a touch more veil on the left so the form always reads */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent" />

      {/* ── language switch ─────────────────────────────── */}
      <div className="absolute right-5 top-5 z-20 flex items-center gap-1.5 sm:right-8 sm:top-7">
        <Globe className="mr-1 h-3.5 w-3.5 text-white/50" />
        {LANGS.map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-[12px] font-semibold transition",
              l === lang ? "bg-white text-black" : "text-white/60 hover:bg-white/10 hover:text-white",
            )}
          >
            {LANG_META[l].native}
          </button>
        ))}
      </div>

      {/* ── content ─────────────────────────────────────── */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col gap-12 px-6 py-14 sm:px-10 lg:grid lg:grid-cols-[1.05fr_minmax(380px,440px)] lg:items-center lg:gap-8 lg:py-0 lg:px-16">
        {/* left — brand + greeting */}
        <div className="max-w-xl">
          <BlurFade delay={0.05}>
            <Wordmark tone="light" height={30} className="lg:h-[38px]" />
          </BlurFade>

          <div className="mt-10">
            <BlurFade delay={0.2}>
              <h1 className="text-[3rem] font-light leading-[1.02] tracking-[-0.03em] text-white sm:text-6xl xl:text-7xl">
                {t.login.greeting}{" "}
                <span className="ml-1 inline-block origin-[70%_75%] animate-wave">👋</span>
              </h1>
            </BlurFade>
            <BlurFade delay={0.38}>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-white/60 sm:text-xl">
                {t.login.welcome}
              </p>
            </BlurFade>
            <BlurFade delay={0.5}>
              <p className="mt-2 text-[13.5px] font-medium uppercase tracking-[0.22em] text-white/35">
                {t.login.tagline}
              </p>
            </BlurFade>
          </div>

          <div className="mt-11 hidden max-w-md space-y-5 sm:block">
            {features.map((f, i) => (
              <BlurFade key={f.title} delay={0.6 + i * 0.12}>
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white/80 backdrop-blur">
                    <f.icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-[13.5px] font-semibold text-white">{f.title}</span>
                    <span className="mt-0.5 block text-[12.5px] leading-relaxed text-white/50">
                      {f.body}
                    </span>
                  </span>
                </div>
              </BlurFade>
            ))}
          </div>

          {/* marquee of registered systems */}
          {apps.length > 0 && (
            <BlurFade delay={0.9} className="mt-12 hidden lg:block">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
                {t.login.trusted} {apps.length} {t.login.systems}
              </p>
              <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_75%,transparent)]">
                <div className="flex w-max animate-marquee gap-3">
                  {[...apps, ...apps].map((a, i) => (
                    <span
                      key={`${a.id}-${i}`}
                      className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur"
                    >
                      <AppLogo app={a} size={22} radius={7} />
                      <span className="whitespace-nowrap text-[12px] font-medium text-white/70">
                        {a.name}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </BlurFade>
          )}
        </div>

        {/* right — the login card */}
        <BlurFade delay={0.3} className="w-full">
          <div className="w-full rounded-3xl border border-white/12 bg-white/[0.06] p-7 shadow-2xl backdrop-blur-2xl sm:p-8">
            <h2 className="text-[22px] font-semibold tracking-tight text-white">{t.login.title}</h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/55">{t.login.subtitle}</p>

            <form onSubmit={submit} className="mt-7 space-y-4">
              <div>
                <span className="mb-1.5 block text-[12.5px] font-medium text-white/70">{t.login.email}</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 w-full rounded-xl border border-white/15 bg-white/5 pl-10 pr-3.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/40 focus:bg-white/10 focus:ring-4 focus:ring-white/10"
                    placeholder="name@company.co.th"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-[12.5px] font-medium text-white/70">{t.login.password}</span>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    type={show ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 w-full rounded-xl border border-white/15 bg-white/5 pl-10 pr-10 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/40 focus:bg-white/10 focus:ring-4 focus:ring-white/10"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-white/60">
                  <input type="checkbox" defaultChecked className="h-3.5 w-3.5 rounded border-white/30 bg-transparent accent-white" />
                  {t.login.remember}
                </label>
                <button type="button" className="text-[12.5px] font-semibold text-white/80 hover:text-white hover:underline">
                  {t.login.forgot}
                </button>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-xl border border-rose-400/30 bg-rose-500/15 px-3.5 py-2.5 text-[12.5px] font-medium text-rose-200"
                  >
                    {t.login.error}
                  </motion.p>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={busy}
                className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.login.signingIn}
                  </>
                ) : (
                  <>
                    {t.login.signIn}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {!supabaseReady && (
              <div className="mt-7 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[12px] font-semibold text-white">{t.login.hintTitle}</p>
                <p className="mt-0.5 text-[11.5px] text-white/45">{t.login.hintBody}</p>
                <div className="mt-3 grid gap-1.5">
                  {demoAccounts.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setEmail(u.email);
                        setPassword("demo1234");
                      }}
                      className="flex items-center justify-between gap-3 rounded-lg border border-transparent px-2.5 py-1.5 text-left transition hover:border-white/15 hover:bg-white/5"
                    >
                      <span className="truncate text-[12px] font-medium text-white/70">{u.email}</span>
                      <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-white/60">
                        {u.roleKey}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </BlurFade>
      </div>
    </div>
  );
}
