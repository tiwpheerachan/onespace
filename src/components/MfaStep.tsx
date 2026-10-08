"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { mfaEnroll, mfaVerify } from "@/lib/data/repository";
import { usePortal } from "@/lib/data/store";
import { usePrefs } from "@/lib/i18n/provider";

/**
 * The second step of a password sign-in (the emergency admin): a 6-digit code
 * from an authenticator app — or, the first time, setting that app up from a
 * QR code. Styled for the dark login card.
 */
export function MfaStep({
  mode,
  email,
  onDone,
  onCancel,
}: {
  mode: "verify" | "enroll";
  email: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { t } = usePrefs();
  const { finishSignIn } = usePortal();
  const [setup, setSetup] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState(false);

  useEffect(() => {
    if (mode !== "enroll") return;
    let alive = true;
    mfaEnroll().then((s) => {
      if (!alive) return;
      if (s) setSetup(s);
      else setWrong(true);
    });
    return () => {
      alive = false;
    };
  }, [mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setWrong(false);
    const ok = (await mfaVerify(code, setup?.factorId)) && (await finishSignIn(email));
    if (ok) return onDone();
    setWrong(true);
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="mt-7 space-y-4">
      <div className="flex items-center gap-2.5">
        <ShieldCheck className="h-5 w-5 text-white/80" />
        <h3 className="text-[15px] font-semibold text-white">
          {mode === "enroll" ? t.login.mfaEnrollTitle : t.login.mfaVerifyTitle}
        </h3>
      </div>
      <p className="text-[12.5px] leading-relaxed text-white/60">
        {mode === "enroll" ? t.login.mfaEnrollBody : t.login.mfaVerifyBody}
      </p>

      {mode === "enroll" && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white p-4">
          {setup ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={setup.qr} alt="QR" className="h-44 w-44" />
          ) : (
            <Loader2 className="h-6 w-6 animate-spin text-black/40" />
          )}
          {setup && (
            <p className="break-all text-center font-mono text-[11px] text-black/70">
              {t.login.mfaSecret}: {setup.secret}
            </p>
          )}
        </div>
      )}

      <input
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3.5 text-center font-mono text-lg tracking-[0.5em] text-white outline-none focus:border-white/40 focus:bg-white/10"
        placeholder="000000"
      />

      {wrong && (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/15 px-3.5 py-2.5 text-[12.5px] font-medium text-rose-200">
          {t.login.mfaWrong}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || code.length !== 6 || (mode === "enroll" && !setup)}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {t.login.mfaConfirm}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="block w-full text-center text-[12px] text-white/50 hover:text-white/80 hover:underline"
      >
        {t.login.mfaBack}
      </button>
    </form>
  );
}
