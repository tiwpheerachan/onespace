"use client";

import { motion } from "framer-motion";
import { Wordmark } from "@/components/Wordmark";

export function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-6"
      >
        <Wordmark height={26} />
        <div className="h-1 w-40 overflow-hidden rounded-full bg-line">
          <motion.div
            className="h-full w-1/3 rounded-full bg-gradient-to-r from-brand-600 to-teal-500"
            animate={{ x: ["-120%", "320%"] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </div>
  );
}
