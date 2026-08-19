"use client";

import { AlertTriangle, Check, Copy, Eye, EyeOff, KeyRound, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { Field, Switch } from "@/components/ui";
import { emptySso, genClientId, genClientSecret, withAuthz } from "@/lib/authz";
import { usePrefs } from "@/lib/i18n/provider";
import type { AppCapability, AppResource, PortalApp, ResourceType } from "@/lib/types";
import { cn, uid } from "@/lib/utils";

type Patch = (p: Partial<PortalApp>) => void;

/* ── copyable credential field ──────────────────────────────────────────── */

function CredField({
  label,
  value,
  secret = false,
  onRegenerate,
  hint,
}: {
  label: string;
  value: string;
  secret?: boolean;
  onRegenerate?: () => void;
  hint?: string;
}) {
  const { t } = usePrefs();
  const [show, setShow] = useState(!secret);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={secret && !show ? "•".repeat(Math.min(value.length, 40)) : value}
          className="input flex-1 font-mono text-[12px]"
        />
        {secret && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="btn-ghost btn-sm shrink-0 px-2.5"
            title={show ? t.sso.hide : t.sso.reveal}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
        <button type="button" onClick={copy} className="btn-ghost btn-sm shrink-0 px-2.5" title={t.common.copy}>
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </button>
        {onRegenerate && (
          <button type="button" onClick={onRegenerate} className="btn-ghost btn-sm shrink-0 px-2.5" title={t.sso.regenerate}>
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
      </div>
    </Field>
  );
}

/* ── SSO / OIDC tab ─────────────────────────────────────────────────────── */

export function SsoTab({ draft, patch }: { draft: PortalApp; patch: Patch }) {
  const { t } = usePrefs();
  const sso = withAuthz(draft).sso;

  const setSso = (p: Partial<typeof sso>) => patch({ sso: { ...sso, ...p } });

  const toggleEnabled = (on: boolean) => {
    if (on && !sso.clientId) {
      patch({ sso: { ...sso, enabled: true, clientId: genClientId(), clientSecret: genClientSecret() } });
    } else {
      setSso({ enabled: on });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 rounded-xl border border-line bg-canvas/50 p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-surface text-ink-soft">
            <KeyRound className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[13.5px] font-semibold text-ink">{t.sso.enable}</p>
            <p className="mt-0.5 text-[12px] text-ink-mute">{t.sso.enableHint}</p>
          </div>
        </div>
        <Switch checked={sso.enabled} onChange={toggleEnabled} />
      </div>

      {!sso.enabled ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-[12.5px] text-ink-mute">
          {t.sso.disabled}
        </p>
      ) : (
        <>
          <CredField label={t.sso.clientId} value={sso.clientId} />
          <CredField
            label={t.sso.clientSecret}
            value={sso.clientSecret}
            secret
            hint={t.sso.secretHint}
            onRegenerate={() => setSso({ clientSecret: genClientSecret() })}
          />

          <Field label={t.sso.redirectUris} hint={t.sso.redirectHint}>
            <textarea
              className="input h-24 resize-none py-2.5 font-mono text-[12px]"
              value={sso.redirectUris.join("\n")}
              onChange={(e) =>
                setSso({ redirectUris: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })
              }
              placeholder={"https://your-app.example.com/sso/callback\nhttp://localhost:3000/sso/callback"}
            />
          </Field>

          <div
            className={cn(
              "rounded-xl border p-4 transition-colors",
              sso.enforceAuthz ? "border-line bg-canvas/50" : "border-amber-300/60 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10",
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[13.5px] font-semibold text-ink">{t.sso.enforce}</p>
                <p className="mt-0.5 text-[12px] text-ink-mute">{t.sso.enforceHint}</p>
              </div>
              <Switch checked={sso.enforceAuthz} onChange={(v) => setSso({ enforceAuthz: v })} />
            </div>
            {!sso.enforceAuthz && (
              <p className="mt-3 flex items-start gap-2 border-t border-amber-300/40 pt-3 text-[12px] font-medium text-amber-700 dark:border-amber-500/20 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {t.sso.enforceWarn}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Schema tab (resources + capabilities) ──────────────────────────────── */

const RTYPES: ResourceType[] = ["table", "page"];

export function SchemaTab({ draft, patch }: { draft: PortalApp; patch: Patch }) {
  const { t } = usePrefs();
  const a = withAuthz(draft);
  const resources = a.resources;
  const capabilities = a.capabilities;

  const setResources = (r: AppResource[]) => patch({ resources: r });
  const setCaps = (c: AppCapability[]) => patch({ capabilities: c });

  const patchRes = (i: number, p: Partial<AppResource>) =>
    setResources(resources.map((r, idx) => (idx === i ? { ...r, ...p } : r)));
  const patchCap = (i: number, p: Partial<AppCapability>) =>
    setCaps(capabilities.map((c, idx) => (idx === i ? { ...c, ...p } : c)));

  return (
    <div className="space-y-7">
      {/* resources */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <div>
            <p className="text-[13.5px] font-semibold text-ink">{t.schema.resources}</p>
            <p className="text-[11.5px] text-ink-mute">{t.schema.resourcesHint}</p>
          </div>
          <button
            type="button"
            onClick={() => setResources([...resources, { key: "", name: "", rtype: "table" }])}
            className="btn-ghost btn-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            {t.schema.addResource}
          </button>
        </div>

        {resources.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-[12px] text-ink-mute">
            {t.schema.noResources}
          </p>
        ) : (
          <div className="space-y-2">
            {resources.map((r, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl border border-line bg-surface p-2">
                <input
                  value={r.key}
                  onChange={(e) => patchRes(i, { key: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                  placeholder={t.schema.keyLabel}
                  className="input h-9 w-28 shrink-0 font-mono text-[12px]"
                />
                <input
                  value={r.name}
                  onChange={(e) => patchRes(i, { name: e.target.value })}
                  placeholder={t.schema.displayName}
                  className="input h-9 flex-1"
                />
                <select
                  value={r.rtype}
                  onChange={(e) => patchRes(i, { rtype: e.target.value as ResourceType })}
                  className="input h-9 w-24 shrink-0"
                >
                  {RTYPES.map((rt) => (
                    <option key={rt} value={rt}>
                      {rt === "table" ? t.schema.table : t.schema.page}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => patchRes(i, { sensitive: !r.sensitive })}
                  title={t.schema.sensitive}
                  className={cn(
                    "flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[11.5px] font-semibold transition",
                    r.sensitive
                      ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                      : "border-line text-ink-mute hover:text-ink",
                  )}
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t.schema.sensitive}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResources(resources.filter((_, idx) => idx !== i))}
                  className="shrink-0 rounded-lg p-2 text-ink-mute transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* capabilities */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <div>
            <p className="text-[13.5px] font-semibold text-ink">{t.schema.capabilities}</p>
            <p className="text-[11.5px] text-ink-mute">{t.schema.capabilitiesHint}</p>
          </div>
          <button
            type="button"
            onClick={() => setCaps([...capabilities, { key: "", name: "" }])}
            className="btn-ghost btn-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            {t.schema.addCapability}
          </button>
        </div>

        {capabilities.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-[12px] text-ink-mute">
            {t.schema.noCapabilities}
          </p>
        ) : (
          <div className="space-y-2">
            {capabilities.map((c, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl border border-line bg-surface p-2">
                <input
                  value={c.key}
                  onChange={(e) => patchCap(i, { key: e.target.value.toLowerCase().replace(/\s+/g, ".") })}
                  placeholder="leave.approve"
                  className="input h-9 w-40 shrink-0 font-mono text-[12px]"
                />
                <input
                  value={c.name}
                  onChange={(e) => patchCap(i, { name: e.target.value })}
                  placeholder={t.schema.displayName}
                  className="input h-9 flex-1"
                />
                <button
                  type="button"
                  onClick={() => setCaps(capabilities.filter((_, idx) => idx !== i))}
                  className="shrink-0 rounded-lg p-2 text-ink-mute transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export { emptySso };
