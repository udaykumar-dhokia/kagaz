"use client";

import React, { useState, useRef } from "react";
import { FileUp, FileText, CheckCircle2, AlertCircle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { requestPresignedUpload, uploadFileWithProgress, inspectUploadedPdf } from "@/lib/api";

export interface UploadedDocument {
  fileKey: string;
  filename: string;
  sizeBytes: number;
  pageCount: number;
  paperSize: string;
}

interface FileDropzoneProps {
  shopSlug: string;
  onDocumentReady: (doc: UploadedDocument) => void;
  onReset?: () => void;
}

export function FileDropzone({ shopSlug, onDocumentReady, onReset }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "inspecting" | "ready" | "error">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentDoc, setCurrentDoc] = useState<UploadedDocument | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setErrorMessage("Please select a PDF document. (Other formats can be converted to PDF first)");
      setUploadStatus("error");
      return;
    }

    setUploadStatus("uploading");
    setUploadProgress(0);
    setErrorMessage(null);

    try {
      // 1. Request presigned upload ticket
      const ticketRes = await requestPresignedUpload(shopSlug, file.name, file.type || "application/pdf");
      const uploadData = ticketRes.data;

      // 2. Direct upload to Cloudinary (or local fallback) with real-time progress
      const fileKey = await uploadFileWithProgress(uploadData, file, (percent) => {
        setUploadProgress(percent);
      });

      // 3. Inspect PDF for exact page count & dimensions
      setUploadStatus("inspecting");
      const inspectionRes = await inspectUploadedPdf(fileKey);

      if (inspectionRes.data.isEncrypted) {
        setErrorMessage("This PDF is password protected. Please remove the password and re-upload.");
        setUploadStatus("error");
        return;
      }

      const docData: UploadedDocument = {
        fileKey,
        filename: file.name,
        sizeBytes: file.size,
        pageCount: inspectionRes.data.pageCount,
        paperSize: inspectionRes.data.detectedPaperSize,
      };

      setCurrentDoc(docData);
      setUploadStatus("ready");
      onDocumentReady(docData);
    } catch (err: any) {
      console.error("Upload error:", err);
      setErrorMessage(err.message || "Failed to upload document. Please try again.");
      setUploadStatus("error");
    }
  };

  const handleRemove = () => {
    setCurrentDoc(null);
    setUploadStatus("idle");
    setUploadProgress(0);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (onReset) onReset();
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="application/pdf,.pdf"
        className="hidden"
      />

      {uploadStatus === "idle" && (
        <Card
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`cursor-pointer border-2 border-dashed transition-all duration-200 hover:border-primary/80 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40 ${
            isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-neutral-300 dark:border-neutral-800"
          }`}
        >
          <CardContent className="flex flex-col items-center justify-center p-8 text-center sm:p-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 shadow-sm mb-4">
              <FileUp className="h-8 w-8 text-primary" />
            </div>

            <h3 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1">
              Tap or drag PDF to print
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs mb-4">
              Select any document from your phone or computer. 100% private.
            </p>

            <Button type="button" variant="outline" className="rounded-full px-6 font-medium shadow-xs">
              Choose Document
            </Button>

            <div className="flex items-center gap-2 mt-6 text-xs text-neutral-400 dark:text-neutral-500">
              <span>PDF up to 50MB</span>
              <span>•</span>
              <span>Auto-deleted after printing</span>
            </div>
          </CardContent>
        </Card>
      )}

      {(uploadStatus === "uploading" || uploadStatus === "inspecting") && (
        <Card className="border border-neutral-200 dark:border-neutral-800 shadow-sm p-6">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-900 mb-3">
              <RefreshCw className="h-6 w-6 text-primary animate-spin" />
            </div>

            <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">
              {uploadStatus === "uploading" ? "Uploading document securely..." : "Inspecting pages..."}
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 mb-4">
              {uploadStatus === "uploading"
                ? `${uploadProgress}% uploaded directly to secure storage`
                : "Calculating page count & dimensions"}
            </p>

            <div className="w-full max-w-md">
              <Progress value={uploadStatus === "uploading" ? uploadProgress : 95} className="h-2" />
            </div>
          </div>
        </Card>
      )}

      {uploadStatus === "ready" && currentDoc && (
        <Card className="border border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-950/40 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <FileText className="h-6 w-6" />
              </div>
              <div className="overflow-hidden">
                <p className="font-medium text-sm text-neutral-900 dark:text-neutral-100 truncate">
                  {currentDoc.filename}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5">
                    {currentDoc.pageCount} {currentDoc.pageCount === 1 ? "page" : "pages"}
                  </Badge>
                  <Badge variant="outline" className="text-xs px-2 py-0.5 uppercase">
                    {currentDoc.paperSize}
                  </Badge>
                  <span className="text-xs text-neutral-500">
                    {(currentDoc.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleRemove}
              className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              title="Remove document"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {uploadStatus === "error" && (
        <Card className="border border-red-200 bg-red-50/50 dark:border-red-950 dark:bg-red-950/20 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900 dark:text-red-200">Upload Issue</h4>
              <p className="text-xs text-red-700 dark:text-red-300 mt-0.5 mb-3">{errorMessage}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemove}
                className="text-xs border-red-300 text-red-800 dark:border-red-800 dark:text-red-200 hover:bg-red-100/50"
              >
                Try Again
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

