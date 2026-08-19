"use client";

import { cn, hexToRgba, initials } from "@/lib/utils";
import type { PortalApp } from "@/lib/types";

export function AppLogo({
  app,
  size = 52,
  radius = 16,
  className,
}: {
  app: Pick<PortalApp, "name" | "shortName" | "logoUrl" | "color">;
  size?: number;
  radius?: number;
  className?: string;
}) {
  const label = app.shortName?.trim() || initials(app.name);
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden font-display font-bold text-white",
        className,
      )}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
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
