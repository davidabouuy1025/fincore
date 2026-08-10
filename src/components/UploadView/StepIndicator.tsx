import React from "react";
import { Check } from "lucide-react";
import { StepIndicatorProps } from "./types";
import { cn } from "./utils";

export function StepIndicator({ step, label, active, completed }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border transition-all duration-300",
          active
            ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
            : completed
              ? "border-emerald-600 bg-emerald-600 text-black font-extrabold"
              : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500"
        )}
      >
        {completed ? <Check className="w-4 h-4 text-black font-extrabold" /> : step}
      </div>
      <span
        className={cn(
          "text-[10px] tracking-[0.2em] font-black uppercase transition-colors duration-300",
          active
            ? "text-emerald-500 dark:text-emerald-400"
            : completed
              ? "text-emerald-600"
              : "text-slate-400 dark:text-slate-500"
        )}
      >
        {label}
      </span>
    </div>
  );
}
