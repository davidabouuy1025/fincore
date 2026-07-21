import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { hover } from "motion";

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface NavBtnProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

export function NavBtn({ icon, label, active, onClick }: NavBtnProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-12 h-12 flex items-center justify-center rounded-lg transition-all group cursor-pointer",
        active ? "bg-hacker-green shadow-xl" : "hover:text-hacker-green"
      )}
      style={{color: active ? "var(--color-sidebar-icon-active)" : "var(--color-sidebar-icon)"}}
    >
      {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
      <span className="absolute left-full ml-4 bg-slate-800 text-white text-[9px] font-bold px-3 py-1.5 tracking-[0.2em] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
        {label}
      </span>
    </button>
  );
}
