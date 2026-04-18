"use client";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function VcfDropzone({ onFileReady, initialFileInfo }) {
  const [status, setStatus] = useState(initialFileInfo ? "ready" : "idle"); // idle | uploading | ready | error
  const [fileInfo, setFileInfo] = useState(initialFileInfo || null);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const uploadFile = async (file) => {
    setStatus("uploading");
    setProgress(0);
    setErrorMsg("");

    // Simulate chunked progress using XHR so we get progress events
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("vcf_file", file);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE}/api/upload-genomics`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.detail || `Upload failed (${xhr.status})`));
          } catch {
            reject(new Error(`Upload failed (${xhr.status})`));
          }
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(formData);
    });
  };

  const onDrop = useCallback(async (accepted, rejected) => {
    if (rejected?.length > 0) {
      setErrorMsg("Only .vcf files are accepted. Please check the file type.");
      setStatus("error");
      return;
    }
    const file = accepted[0];
    if (!file) return;

    // Client-side size guard (500 MB)
    if (file.size > 500 * 1024 * 1024) {
      setErrorMsg("File exceeds 500 MB upload limit.");
      setStatus("error");
      return;
    }

    try {
      const result = await uploadFile(file);
      setFileInfo({
        name: file.name,
        size_mb: result.size_mb,
        genotype_count: result.genotype_count,
        session_id: result.session_id,
      });
      setStatus("ready");
      onFileReady?.({ file, session_id: result.session_id, ...result });
    } catch (err) {
      // If backend is unreachable, still let user proceed with the raw file
      console.warn("Upload endpoint unreachable, using file directly:", err.message);
      setFileInfo({
        name: file.name,
        size_mb: parseFloat((file.size / (1024 * 1024)).toFixed(2)),
        genotype_count: "—",
        session_id: null,
      });
      setStatus("ready");
      onFileReady?.({ file, session_id: null });
    }
  }, [onFileReady]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/plain": [".vcf"], "application/octet-stream": [".vcf"] },
    maxFiles: 1,
    multiple: false,
  });

  const reset = () => { setStatus("idle"); setFileInfo(null); setProgress(0); onFileReady?.(null); };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-on-surface-variant font-label text-xs uppercase tracking-wider">
        Genomic Data (.vcf)
      </label>

      <AnimatePresence mode="wait">
        {status === "idle" || status === "error" ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            {...getRootProps()}
            className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-all duration-300 ${
              isDragActive
                ? "border-primary bg-primary/10 scale-[1.01]"
                : status === "error"
                ? "border-error bg-error/5"
                : "border-outline-variant hover:border-primary/50 hover:bg-surface-container-low"
            }`}
          >
            <input {...getInputProps()} />
            <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isDragActive ? "bg-primary/20" : "bg-secondary-container/40"}`}>
              <span className={`material-symbols-outlined text-2xl ${isDragActive ? "text-primary" : "text-outline"}`}>
                {status === "error" ? "error" : isDragActive ? "download" : "science"}
              </span>
            </div>
            <div className="text-center">
              <p className="font-headline font-bold text-on-surface text-sm">
                {isDragActive ? "Drop your VCF file here" : status === "error" ? errorMsg : "Upload DNA Variant File"}
              </p>
              <p className="text-xs text-on-surface-variant mt-1">
                {status === "error" ? "Try again" : "Drag & drop or click · .vcf · Max 500 MB"}
              </p>
            </div>
          </motion.div>
        ) : status === "uploading" ? (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border border-outline-variant/20 rounded-xl p-5 bg-surface-container-low flex flex-col gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-xl animate-spin">sync</span>
              </div>
              <div>
                <p className="font-headline font-bold text-sm text-on-surface">Uploading VCF…</p>
                <p className="text-xs text-on-surface-variant">{progress}% transferred</p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ type: "tween" }}
              />
            </div>
          </motion.div>
        ) : (
          /* status === "ready" */
          <motion.div
            key="ready"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border border-secondary/30 rounded-xl p-4 bg-secondary-container/20 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-secondary text-xl">check_circle</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-headline font-bold text-sm text-on-surface truncate">{fileInfo?.name}</p>
              <p className="text-xs text-on-surface-variant">
                {fileInfo?.size_mb} MB
                {fileInfo?.genotype_count !== "—" && ` · ${fileInfo.genotype_count} genotype lines`}
                {fileInfo?.session_id && (
                  <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] rounded font-mono">
                    ID: {fileInfo.session_id.slice(0, 8)}
                  </span>
                )}
              </p>
            </div>
            <button onClick={reset} className="text-outline hover:text-error transition-colors ml-auto shrink-0">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
