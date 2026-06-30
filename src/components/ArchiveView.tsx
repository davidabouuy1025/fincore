import React from "react";
import { Database, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { ArchiveEntry } from "../types";

interface ArchiveViewProps {
  key?: string;
  archive: ArchiveEntry[];
  setView: (v: "upload" | "dashboard" | "archive") => void;
  loadReports: (y: string, s: string) => Promise<void>;
}

export function ArchiveView({ archive, setView, loadReports }: ArchiveViewProps) {
  return (
    <motion.div
      key="archive"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="font-sans animate-none p-8 lg:p-12"
    >
      <header className="mb-10 border-b border-slate-200 pb-8">
        <p className="text-[10px] tracking-[0.2em] font-extrabold text-slate-400 uppercase mb-2">Persistent Document Store</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Historical Filesystem Archive</h1>
      </header>

      {archive.length === 0 ? (
        <div className="h-[50vh] flex flex-col items-center justify-center text-slate-400 gap-4">
          <Database className="w-12 h-12 opacity-25" />
          <p className="text-xs tracking-wider uppercase font-bold text-slate-400 opacity-60">Archive Storage empty</p>
          <button
            onClick={() => setView("upload")}
            className="text-xs border border-slate-200 bg-white shadow-xs rounded-lg px-6 py-2.5 hover:border-hacker-green hover:text-hacker-green hover:shadow-xs transition-all font-bold cursor-pointer"
          >
            → INGEST FIRST DOCUMENT
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {archive.map((yItem, i) => (
            <div key={i} className="space-y-4">
              <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                <span className="text-slate-300 font-mono text-lg">📁</span>
                {yItem.year}
              </h2>
              <div className="space-y-2">
                {yItem.sectors.map((s: string, j: number) => (
                  <button
                    key={j}
                    onClick={() => loadReports(yItem.year, s)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between hover:border-hacker-green hover:bg-slate-50 transition-all group text-left cursor-pointer shadow-3xs"
                  >
                    <span className="text-xs font-bold tracking-wide text-slate-700 group-hover:text-hacker-green">{s.replace(/_/g, " ")}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-hacker-green group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
