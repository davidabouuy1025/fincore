import React from "react";
import { ParsedDocument } from "../../types";

export interface StepIndicatorProps {
  step: number;
  label: string;
  active: boolean;
  completed: boolean;
}

export interface Attachment {
  id: string;
  companyName: string;
  year: string;
  period?: string;
  currency?: string;
  files: File[];
  existingStoredFiles?: { name: string; size: number; storedFileName: string }[];
  selectedPages: string; // "1,2,3,10-20,45-60"
  isExpanded: boolean;
  validationError?: string;
  isEditingExisting?: boolean;
}

export interface UploadViewProps {
  uploadStep: "select" | "review";
  year: string;
  setYear: (y: string) => void;
  sector: string;
  setSector: (s: string) => void;
  dragOver: boolean;
  setDragOver: (b: boolean) => void;
  pendingFiles: File[];
  setPendingFiles: React.Dispatch<React.SetStateAction<File[]>>;
  isParsing: boolean;
  isSaving: boolean;
  parsedDocuments: ParsedDocument[];
  handleDrop: (e: React.DragEvent) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleParse: () => void;
  handleSaveAll: () => void;
  setUploadStep: (step: "select" | "review") => void;
  updateDocumentName: (index: number, name: string) => void;
  updateDocumentField: (index: number, category: string, fieldId: string, value: string) => void;
  updateDocumentYear?: (index: number, year: string) => void;
  updateDocumentSector?: (index: number, sector: string) => void;
  toggleDocumentExpanded: (index: number) => void;
  removeDocument: (index: number) => void;
  addMoreDocuments: () => void;
  useAi: boolean;
  setUseAi: (b: boolean) => void;
  loadReports?: (y: string, s: string) => Promise<void>;
  fetchArchive?: () => Promise<void>;
}
