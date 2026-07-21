import React from "react";
import { CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface StepIndicatorProps {
  step: number;
  label: string;
  active: boolean;
  completed: boolean;
}

export function StepIndicator({ step, label, active, completed }: StepIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-3", active ? "text-[var(--color-hacker-text-main)]" : completed ? "text-[var(--color-hacker-text-main)]" : "text-[var(--color-hacker-text-main)]")}>
      <div className={cn(
        "w-8 h-8 flex items-center justify-center text-xs font-bold border transition-all",
        active ? "border-[var(--color-hacker-black-white)] bg-hacker-text-submain text-black" : completed ? "border-hacker-green" : "border-hacker-text-main"
      )}>
        {completed ? <CheckCircle2 className="w-4 h-4" /> : step}
      </div>
      <span className="text-[10px] tracking-[0.3em] font-bold">{label}</span>
    </div>
  );
}
