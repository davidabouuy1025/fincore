import React, { useState } from "react";
import { Eye, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ParsedDocument } from "../types";
import { FIELD_LABELS, CATEGORY_LABELS } from "../constants";
import { FieldInput } from "./FieldInput";

interface DocumentCardProps {
  key?: string;
  doc: ParsedDocument;
  docIndex: number;
  onUpdateName: (index: number, name: string) => void;
  onUpdateField: (index: number, category: string, fieldId: string, value: string) => void;
  onToggleExpanded: (index: number) => void;
  onRemove: (index: number) => void;
}

export function DocumentCard({
  doc,
  docIndex,
  onUpdateName,
  onUpdateField,
  onToggleExpanded,
  onRemove,
}: DocumentCardProps) {
  const [previewVisible, setPreviewVisible] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-10 h-10 border border-teal-200 bg-teal-50/50 flex items-center justify-center text-sm font-extrabold text-teal-800 rounded-lg">
            {docIndex + 1}
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={doc.companyName}
              onChange={(e) => onUpdateName(docIndex, e.target.value)}
              className="w-full bg-transparent border-b border-slate-200 px-0 py-1 text-sm font-bold text-slate-800 focus:outline-none focus:border-hacker-green transition-colors"
              placeholder="Company Name"
            />
            <div className="flex items-center gap-3 mt-1.5 font-sans">
              <span className="text-[10px] text-slate-400 font-medium">{doc.originalFileName}</span>
              <span className="text-[9px] font-bold px-2 py-0.5 bg-teal-50 border border-teal-100/50 text-teal-800 rounded">{doc.suggestedCompanyName}</span>
              <span className="text-[9px] font-bold px-2 py-0.5 bg-orange-50 border border-orange-100/50 text-orange-800 rounded">{doc.suggestedSector}</span>
              <span className="text-[9px] font-bold px-2 py-0.5 bg-yellow-50 border border-yellow-100/50 text-yellow-800 rounded">{doc.docType}</span>
              <span className="text-[10px] text-slate-400 font-medium opacity-75">{doc.rawTextLength} chars extracted</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 font-sans">
          <button
            onClick={() => setPreviewVisible(!previewVisible)}
            className="text-[10px] border border-slate-200 rounded-lg px-3 py-1.5 flex items-center gap-1.5 hover:bg-slate-50 hover:border-slate-300 font-semibold text-slate-600 transition-all cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" /> {previewVisible ? "Hide" : "View"} PDF
          </button>
          <button
            onClick={() => onToggleExpanded(docIndex)}
            className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
          >
            {doc.isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onRemove(docIndex)}
            className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview Panel */}
      <AnimatePresence>
        {previewVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 450, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-slate-100"
          >
            {doc.docType === "IMAGE" ? (
              <div className="w-full h-full overflow-auto flex items-start justify-center p-4 bg-slate-50">
                <img
                  src={`/reports/${doc.storedFileName}`}
                  alt={doc.companyName}
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-full object-contain rounded-lg border border-slate-200 shadow-xs"
                />
              </div>
            ) : (
              <iframe
                src={`/reports/${doc.storedFileName}#toolbar=0&navpanes=0`}
                className="w-full h-full bg-white"
                title="Source Document"
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expandable Fields */}
      <AnimatePresence>
        {doc.isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 space-y-6 bg-slate-50/20">
              {Object.entries(doc.extractedData).map(([category, fields]) => {
                const hasValues = Object.values(fields).some((f) => f.value !== null);
                if (!hasValues && category !== "incomeStatement" && category !== "balanceSheet") return null;

                return (
                  <div key={category}>
                    <p className="text-[10px] tracking-[0.1em] text-slate-400 font-extrabold uppercase mb-3 border-b border-slate-100 pb-2">
                      {CATEGORY_LABELS[category] || category.toUpperCase()}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {Object.entries(fields).map(([fieldId, field]) => (
                        <FieldInput
                          key={fieldId}
                          label={FIELD_LABELS[fieldId] || fieldId}
                          value={field.value || ""}
                          confidence={field.confidence}
                          onChange={(val) => onUpdateField(docIndex, category, fieldId, val)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
