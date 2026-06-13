import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function AppModal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center safe-modal sm:items-center">
      <button aria-label="Close modal" className="absolute inset-0 bg-slate-950/50" onClick={onClose} />
      <div className={cn("relative max-h-[92dvh] w-full overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:mx-4 sm:rounded-2xl", wide ? "sm:max-w-3xl" : "sm:max-w-lg")}>
        {title && <div className="border-b border-slate-200 px-4 py-3 text-base font-semibold text-slate-950">{title}</div>}
        <div className="max-h-[calc(92dvh-3.5rem)] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog(props: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode }) {
  return <AppModal {...props} />;
}
