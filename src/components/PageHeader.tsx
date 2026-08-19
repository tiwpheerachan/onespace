"use client";

import { motion } from "framer-motion";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6"
    >
      <div>
        <h1 className="heading text-[clamp(1.35rem,2.1vw,1.75rem)] leading-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </motion.header>
  );
}
