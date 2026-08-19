"use client";

import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui";
import { usePrefs } from "@/lib/i18n/provider";

export function Confirm({
  open,
  title,
  body,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  body: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = usePrefs();
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      width="max-w-md"
      footer={
        <>
          <button onClick={onCancel} className="btn-ghost btn-sm">
            {t.common.cancel}
          </button>
          <button
            onClick={onConfirm}
            className="btn btn-sm h-9 bg-rose-600 text-white transition hover:bg-rose-700"
          >
            {t.common.delete}
          </button>
        </>
      }
    >
      <div className="flex gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <p className="text-[13.5px] leading-relaxed text-ink-soft">{body}</p>
      </div>
    </Modal>
  );
}
