"use client";

import { cn, hexToRgba, initials } from "@/lib/utils";
import type { LogoShape, PortalApp } from "@/lib/types";

export function AppLogo({
  app,
  size = 52,
  radius = 16,
  shape,
  className,
}: {
  app: Pick<PortalApp, "name" | "shortName" | "logoUrl" | "color"> & { logoShape?: LogoShape };
  size?: number;
  radius?: number;
  /** Overrides app.logoShape when set. */
  shape?: LogoShape;
  className?: string;
}) {
  const label = app.shortName?.trim() || initials(app.name);
  const s = shape ?? app.logoShape ?? "rounded";

  // circle → fully round & square; portrait → taller than wide; rounded → square.
  const width = size;
  const height = s === "portrait" ? Math.round(size * 1.32) : size;
  const borderRadius = s === "circle" ? 9999 : radius;

  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden font-display font-bold text-white",
        className,
      )}
      style={{
        width,
        height,
        borderRadius,
        fontSize: size * 0.36,
        letterSpacing: "-0.03em",
        background: app.logoUrl
          ? undefined
          : `linear-gradient(140deg, ${app.color}, ${hexToRgba(app.color, 0.55)})`,
        boxShadow: app.logoUrl ? undefined : `0 10px 26px -12px ${hexToRgba(app.color, 0.9)}`,
      }}
    >
      {app.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={app.logoUrl} alt={app.name} className="h-full w-full object-cover" />
      ) : (
        <>
          <span
            className="absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(120% 90% at 20% 0%, rgba(255,255,255,.45), transparent 55%)",
            }}
          />
          <span className="relative">{label.slice(0, 2)}</span>
        </>
      )}
    </span>
  );
}
