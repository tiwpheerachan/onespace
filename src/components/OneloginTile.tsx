"use client";

import { ArrowUpRight } from "lucide-react";
import type { OneloginApp } from "@/lib/onelogin-apps";

/** Text labels, passed in from the page (which has the locale). */
export interface OneloginTileLabels {
  open: string;
  maintainedBy: string;
  stUp: string;
  stDown: string;
  stReady: string;
}

/** Two-letter initials from a name — keeps Thai vowels/marks so a Thai word isn't split. */
function initials(name: string): string {
  const words = name.replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ").trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0] ?? "?").slice(0, 2).toUpperCase();
}

/**
 * A tile for a Onelogin app — a faithful port of Onelogin's own launcher card
 * (LaunchCard), so the same app looks identical in Onelogin and here. Opens in a
 * new tab (Lark/Google sign-in refuses to be framed). No pin/details: these apps
 * live in Onelogin, not our catalogue. Styling: the .lcard block in globals.css.
 */
export function OneloginTile({ app, labels }: { app: OneloginApp; labels: OneloginTileLabels }) {
  const meta = app.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const st = app.status === true ? "up" : app.status === false ? "down" : "ready";
  const stText = st === "up" ? labels.stUp : st === "down" ? labels.stDown : labels.stReady;
  const shape = app.logoShape === "circle" || app.logoShape === "wide" ? app.logoShape : "rounded";

  return (
    <div className={`lcard${app.cover ? " has-cover" : ""}`} style={{ ["--ac" as string]: app.color }}>
      <a className="lc-stretch" href={app.url} target="_blank" rel="noopener noreferrer"
        aria-label={`${labels.open} ${app.name}`} />

      <span className="lc-hero">
        {app.cover && <img className="lc-cover-img" src={app.cover} alt="" />}
        <span className="lc-scrim" />
        <span className={`lc-status ${st}`}><i />{stText}</span>
        {app.badge && <span className="lc-badge">{app.badge}</span>}
        <span className="lc-hero-foot">
          <span className={`lc-logo s-${shape}`}>
            {app.logo ? <img src={app.logo} alt="" /> : initials(app.name)}
          </span>
          <span className="lc-title">
            <b title={app.name}>{app.name}</b>
            <span title={meta}>{meta}</span>
          </span>
        </span>
      </span>

      <span className="lc-body">
        <span className="lc-desc">{app.description}</span>
        {app.ownerName && (
          <span className="lc-owner">
            {app.ownerAvatar
              ? <img className="lc-ava" src={app.ownerAvatar} alt="" referrerPolicy="no-referrer" />
              : <span className="lc-ava lc-ava-f">{initials(app.ownerName)}</span>}
            <span className="lc-owner-t">{labels.maintainedBy} <b>{app.ownerName}</b></span>
          </span>
        )}
        <span className="lc-div" />
        <span className="lc-foot">
          <span />
          <span className="lc-fab" aria-hidden="true"><ArrowUpRight size={20} /></span>
        </span>
      </span>
    </div>
  );
}
