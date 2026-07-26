import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { AlertTriangle, Check, ChevronDown, ChevronRight, CircleHelp, Info, LoaderCircle, Search, X } from "lucide-react";
import type { ActionTone } from "../types";

export const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";

export function Button({ className, variant = "secondary", loading = false, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }) {
  return <button className={cn("inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", variant === "primary" && "bg-[#15252f] text-white shadow-sm hover:bg-[#203945] focus:ring-[#7ccdb0]", variant === "secondary" && "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 focus:ring-slate-300", variant === "quiet" && "text-slate-600 hover:bg-slate-100 focus:ring-slate-300", variant === "danger" && "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 focus:ring-rose-300", className)} disabled={loading || props.disabled} {...props}>{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}{children}</button>;
}

export function IconButton({ label, className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button aria-label={label} title={label} className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7ccdb0]", className)} {...props}>{children}</button>;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#59b795] focus:ring-2 focus:ring-[#d8f5e8]", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <div className="relative"><select className={cn("h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm text-slate-700 outline-none focus:border-[#59b795] focus:ring-2 focus:ring-[#d8f5e8]", className)} {...props} /><ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" /></div>;
}

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: ActionTone | "active" | "pending" | "trial" | "past_due" | "cancelled" | "expired" | "invited" | "suspended" | "blocked" }) {
  const toneClass = tone === "success" || tone === "active" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/10" : tone === "warning" || tone === "pending" || tone === "trial" || tone === "past_due" || tone === "invited" || tone === "suspended" ? "bg-amber-50 text-amber-700 ring-amber-600/10" : tone === "danger" || tone === "blocked" || tone === "cancelled" || tone === "expired" ? "bg-rose-50 text-rose-700 ring-rose-600/10" : "bg-slate-100 text-slate-600 ring-slate-600/10";
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ring-1 ring-inset", toneClass)}><span className="h-1.5 w-1.5 rounded-full bg-current" />{label.replace(/_/g, " ")}</span>;
}

export function SectionCard({ title, description, action, children, className }: { title?: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={cn("rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.03)]", className)}>{title || action ? <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4"><div>{title ? <h2 className="text-sm font-bold text-slate-900">{title}</h2> : null}{description ? <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p> : null}</div>{action}</div> : null}{children}</section>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#13845e]">{eyebrow || "Platform control"}</p><h1 className="text-2xl font-bold tracking-[-0.02em] text-slate-950 sm:text-3xl">{title}</h1>{description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p> : null}</div>{action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}</div>;
}

export function MetricCard({ label, value, detail, icon, tone = "mint" }: { label: string; value: string; detail: string; icon: ReactNode; tone?: "mint" | "blue" | "amber" | "rose" }) {
  const iconClass = tone === "mint" ? "bg-[#dff8eb] text-[#08754e]" : tone === "blue" ? "bg-[#e5f0ff] text-[#2c64a5]" : tone === "amber" ? "bg-[#fff2d8] text-[#a66d08]" : "bg-[#ffe5e8] text-[#b84453]";
  return <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.03)]"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-3 text-2xl font-bold tracking-[-0.03em] text-slate-950">{value}</p></div><span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", iconClass)}>{icon}</span></div><p className="mt-4 text-xs text-slate-500">{detail}</p></div>;
}

export function EmptyState({ title, description, icon = <CircleHelp className="h-5 w-5" />, action }: { title: string; description: string; icon?: ReactNode; action?: ReactNode }) {
  return <div className="flex flex-col items-center justify-center px-6 py-16 text-center"><span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">{icon}</span><h3 className="text-sm font-bold text-slate-800">{title}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{description}</p>{action ? <div className="mt-5">{action}</div> : null}</div>;
}

export function SearchField({ value, onChange, placeholder = "Search" }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <div className="relative w-full sm:max-w-xs"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="pl-9" /></div>;
}

export function Modal({ title, description, onClose, children }: { title: string; description?: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#08131a]/50 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label={title}><div className="flex items-start justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-base font-bold text-slate-900">{title}</h2>{description ? <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p> : null}</div><IconButton label="Close dialog" onClick={onClose}><X className="h-4 w-4" /></IconButton></div>{children}</div></div>;
}

export function ConfirmDialog({ title, description, confirmLabel, tone = "danger", onClose, onConfirm, loading = false }: { title: string; description: string; confirmLabel: string; tone?: "primary" | "danger"; onClose: () => void; onConfirm: () => void; loading?: boolean }) {
  return <Modal title={title} description={description} onClose={onClose}><div className="flex items-center justify-end gap-2 px-5 py-4"><Button variant="quiet" onClick={onClose}>Cancel</Button><Button variant={tone} onClick={onConfirm} loading={loading}>{confirmLabel}</Button></div></Modal>;
}

export function Alert({ tone, children }: { tone: "info" | "warning" | "danger"; children: ReactNode }) {
  const classes = tone === "info" ? "border-sky-200 bg-sky-50 text-sky-800" : tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-rose-200 bg-rose-50 text-rose-800";
  const Icon = tone === "info" ? Info : AlertTriangle;
  return <div className={cn("flex gap-3 rounded-lg border px-4 py-3 text-sm leading-6", classes)}><Icon className="mt-0.5 h-4 w-4 shrink-0" />{children}</div>;
}

export function TableHead({ children }: { children: ReactNode }) { return <thead className="bg-slate-50/80 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">{children}</thead>; }
export function TableRow({ children, className }: { children: ReactNode; className?: string }) { return <tr className={cn("border-t border-slate-100 transition hover:bg-slate-50/70", className)}>{children}</tr>; }
export function TableCell({ children, className }: { children: ReactNode; className?: string }) { return <td className={cn("px-5 py-4 align-middle text-sm text-slate-600", className)}>{children}</td>; }
export function TableHeaderCell({ children, className }: { children: ReactNode; className?: string }) { return <th className={cn("px-5 py-3 font-bold", className)}>{children}</th>; }

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-[#dff8eb] font-bold text-[#08754e]", size === "sm" && "h-7 w-7 text-[10px]", size === "md" && "h-9 w-9 text-xs", size === "lg" && "h-12 w-12 text-sm")}>{initials}</span>;
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} title={label} onClick={() => onChange(!checked)} className={cn("relative h-6 w-11 shrink-0 rounded-full transition focus:outline-none focus:ring-2 focus:ring-[#7ccdb0] focus:ring-offset-2", checked ? "bg-[#16845d]" : "bg-slate-300")}><span className={cn("absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition", checked ? "left-6" : "left-1")} /></button>;
}

export function ProgressBar({ value, color = "bg-[#16845d]" }: { value: number; color?: string }) { return <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>; }

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  return <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500"><span>Page {page} of {totalPages}</span><div className="flex gap-1"><IconButton label="Previous page" disabled={page === 1} onClick={() => onChange(page - 1)}><ChevronRight className="h-4 w-4 rotate-180" /></IconButton><IconButton label="Next page" disabled={page === totalPages} onClick={() => onChange(page + 1)}><ChevronRight className="h-4 w-4" /></IconButton></div></div>;
}

export function Checkmark({ checked }: { checked: boolean }) { return checked ? <Check className="h-4 w-4 text-emerald-600" /> : <span className="h-4 w-4 rounded-full border border-slate-200" />; }
