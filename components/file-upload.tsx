"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { X, UploadCloud } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { getAiResult } from "@/server/ai";
import Image from "next/image";

type UploadFile = {
  id: string;
  file: File;
  preview?: string;
  progress: number; // 0 - 100
  status: "idle" | "uploading" | "done" | "error";
  error?: string;
};

const FileUpload = () => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [prompt, setPrompt] = useState<string>(""); // Fixed typo: promt -> prompt
  const [aiResult, setAiResult] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const mapped = acceptedFiles.map((f) => ({
      id: `${f.name}-${f.size}-${Date.now()}`,
      file: f,
      preview: URL.createObjectURL(f),
      progress: 0,
      status: "idle" as const,
    }));
    setFiles((s) => [...mapped, ...s]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 1024 * 1024 * 50,
    accept: { "image/*": [], "application/pdf": [] },
  });

  const removeFile = (id: string) => {
    setFiles((s) => s.filter((f) => f.id !== id));
  };

  const uploadFile = async (uf: UploadFile) => {
    try {
      setFiles((s) =>
        s.map((f) => (f.id === uf.id ? { ...f, status: "uploading" } : f))
      );
      const form = new FormData();
      form.append("file", uf.file);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload");

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setFiles((s) =>
            s.map((f) => (f.id === uf.id ? { ...f, progress: percent } : f))
          );
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setFiles((s) =>
            s.map((f) =>
              f.id === uf.id ? { ...f, status: "done", progress: 100 } : f
            )
          );
        } else {
          setFiles((s) =>
            s.map((f) =>
              f.id === uf.id
                ? { ...f, status: "error", error: xhr.statusText }
                : f
            )
          );
        }
      };

      xhr.onerror = () => {
        setFiles((s) =>
          s.map((f) =>
            f.id === uf.id
              ? { ...f, status: "error", error: "Upload failed" }
              : f
          )
        );
      };

      xhr.send(form);
    } catch (err: unknown) { // Fixed: Line 98 - Changed 'any' to 'unknown'
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setFiles((s) =>
        s.map((f) =>
          f.id === uf.id ? { ...f, status: "error", error: errorMessage } : f
        )
      );
    }
  };

  // Removed unused uploadAll function to fix warning

  // Convert file to base64 safely
  const fileToBase64 = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(arrayBuffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk)); // Fixed: Line 123 - Removed 'as any'
    }
    return btoa(binary);
  };

  const onSubmit = async () => {
    if (!files.length || !prompt.trim()) {
      alert("Please add a file and enter a prompt");
      return;
    }
    
    setIsProcessing(true);
    setAiResult("");
    
    try {
      const f = files[0].file;
      const base64string = await fileToBase64(f);
      const result = await getAiResult(prompt, base64string, f.type);
      setAiResult(result.text);
    } catch (error) {
      console.error("Error processing AI request:", error);
      setAiResult("Error: Failed to process your request. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="max-w-3xl w-full mx-auto">
        <CardHeader>
          <CardTitle>Upload files</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-md p-6 cursor-pointer text-center ${
              isDragActive
                ? "border-primary/80 bg-primary/5"
                : "border-border"
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex items-center justify-center gap-3">
              <UploadCloud className="h-6 w-6" />
              <div>
                <p className="font-medium">
                  Drag & drop files here, or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  Images and PDFs are accepted. Max 50MB each.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {files.length === 0 && (
              <p className="text-sm text-muted-foreground">No files added yet.</p>
            )}
            {files.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 p-2 rounded-md border"
              >
                <div className="w-16 h-12 flex-none rounded overflow-hidden bg-muted flex items-center justify-center">
                  {f.preview && f.file.type.startsWith("image/") ? (
                    <Image
                      src={f.preview}
                      alt={f.file.name}
                      width={64}
                      height={48}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="text-sm px-2">
                      {f.file.type.split("/")[1] || "file"}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="truncate">
                      <div className="font-medium truncate">{f.file.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {Math.round(f.file.size / 1024)} KB
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {f.status === "done" && (
                        <span className="text-green-600 text-sm">
                          ✓ uploaded
                        </span>
                      )}
                      {f.status === "error" && (
                        <span className="text-red-600 text-sm">Error</span>
                      )}
                      <button
                        onClick={() => removeFile(f.id)}
                        className="p-1 rounded hover:bg-muted"
                        aria-label="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Progress value={f.progress} className="h-2 w-full" />
                  </div>
                  {f.error && (
                    <p className="text-xs text-red-600 mt-1">{f.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-3xl w-full mx-auto">
        <CardHeader>
          <CardTitle>AI Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={prompt}
            placeholder="Enter your prompt here..."
            rows={4}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="mt-4 flex justify-end">
            <Button 
              onClick={onSubmit} 
              disabled={!files.length || !prompt.trim() || isProcessing}
            >
              {isProcessing ? "Processing..." : "Analyze with AI"}
            </Button>
          </div>
          
          {aiResult && (
            <div className="mt-4 p-4 border rounded-md bg-muted/50">
              <h3 className="font-medium mb-2">AI Result:</h3>
              <div className="whitespace-pre-wrap text-sm">{aiResult}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FileUpload;