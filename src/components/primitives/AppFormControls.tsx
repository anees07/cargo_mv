import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/cn";
import { typography } from "../../theme/typography";

const control = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-ocean-500 focus:ring-2 focus:ring-ocean-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 md:text-base";

export function AppInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(control, className)} />;
}

export function AppSearchInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} type={props.type ?? "search"} className={cn(control, "pl-9", className)} />;
}

export function AppTextarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(control, "min-h-28 py-3", className)} />;
}

export function AppSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(control, className)} />;
}

export function FieldLabel({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={cn("mb-1.5 block", typography.label, className)} />;
}
