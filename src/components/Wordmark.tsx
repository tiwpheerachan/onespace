"use client";

import { cn } from "@/lib/utils";

/**
 * The ONE SPACE wordmark. The asset is pure-black glyphs on transparency
 * (`public/onespace-logo.png`), so:
 *   • tone="ink"   → black glyphs, and white in dark theme (follows .dark)
 *   • tone="light" → forced white glyphs, for dark backdrops like the hero
 *   • tone="dark"  → forced black glyphs, whatever the theme
 * `height` drives the size; width follows the wordmark's aspect ratio (~7.6:1).
 */
export function Wordmark({
  height = 22,
  tone = "ink",
  className,
}: {
  height?: number;
  tone?: "ink" | "light" | "dark";
  className?: string;
}) {
  const filter =
    tone === "light"
      ? "brightness(0) invert(1)" // black → white, alpha preserved
      : tone === "dark"
        ? "brightness(0)" // force black
        : undefined; // ink: black asset, flipped to white under .dark via CSS below

  return (
    <span
      className={cn(
        "inline-flex select-none items-center",
        tone === "ink" && "onespace-ink",
        className,
      )}
      aria-label="ONE SPACE"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/onespace-logo.png"
        alt="ONE SPACE"
        draggable={false}
        style={{ height, width: "auto", filter }}
        className="block"
      />
    </span>
  );
}
