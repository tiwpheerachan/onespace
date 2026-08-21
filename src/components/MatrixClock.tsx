"use client";

import { useEffect, useState } from "react";
import { Matrix, digits, type Frame } from "@/components/ui/matrix";
import { cn } from "@/lib/utils";

/* A slim one-column colon so the clock stays compact in the top bar. */
const COLON: Frame = [[0], [0], [1], [0], [1], [0], [0]];
const COLON_OFF: Frame = [[0], [0], [0], [0], [0], [0], [0]];

/**
 * A live dot-matrix HH:MM clock, built on the Matrix component. The colon blinks
 * once a second. Renders nothing until mounted, so the server and first client
 * paint agree (the time is client-only). Drop it in any corner.
 */
export function MatrixClock({
  size = 5,
  gap = 1,
  className,
}: {
  size?: number;
  gap?: number;
  className?: string;
}) {
  const [now, setNow] = useState<Date | null>(null);
  const [colonOn, setColonOn] = useState(true);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => {
      setNow(new Date());
      setColonOn((v) => !v);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Reserve the final height before mount so nothing jumps.
  const h = 7 * (size + gap) - gap;
  if (!now) return <span aria-hidden className={cn("inline-block", className)} style={{ height: h }} />;

  const h24 = now.getHours();
  const m = now.getMinutes();
  const parts: Array<{ type: "digit"; value: number } | { type: "colon" }> = [
    { type: "digit", value: Math.floor(h24 / 10) },
    { type: "digit", value: h24 % 10 },
    { type: "colon" },
    { type: "digit", value: Math.floor(m / 10) },
    { type: "digit", value: m % 10 },
  ];

  return (
    <div
      className={cn("flex items-center text-ink", className)}
      style={{ gap: gap + 1 }}
      title={now.toLocaleTimeString()}
    >
      {parts.map((part, i) =>
        part.type === "colon" ? (
          <Matrix
            key={i}
            rows={7}
            cols={1}
            pattern={colonOn ? COLON : COLON_OFF}
            size={size}
            gap={gap}
            palette={{ on: "currentColor", off: "currentColor" }}
            ariaLabel=":"
          />
        ) : (
          <Matrix
            key={i}
            rows={7}
            cols={5}
            pattern={digits[part.value]}
            size={size}
            gap={gap}
            palette={{ on: "currentColor", off: "currentColor" }}
            ariaLabel={String(part.value)}
          />
        ),
      )}
    </div>
  );
}
