'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { apiRequest } from '@/lib/api';
import {
  UploadCloud, FileText, CheckCircle2, AlertCircle, RefreshCw, X,
  ArrowRight, ShieldCheck, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function UploadModal() {
  const { isUploadModalOpen, setUploadModalOpen, jobs, selectedJobId } = useAppStore();
  const [selectedJob, setSelectedJob] = useState<number | ''>(selectedJobId || (jobs[0]?.id ?? ''));
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [batchData, setBatchData] = useState<any>(null);
  const [rejectedList, setRejectedList] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync selected job with store when opened
  useEffect(() => {
    if (selectedJobId) {
      setSelectedJob(selectedJobId);
    } else if (jobs.length > 0 && selectedJob === '') {
      setSelectedJob(jobs[0].id);
    }
  }, [selectedJobId, jobs, selectedJob]);

  // Polling batch status when an upload batch is active
  useEffect(() => {
    if (!activeBatchId) return;

    const interval = setInterval(async () => {
      try {
        const data = await apiRequest(`/uploads/status/${activeBatchId}`);
        setBatchData(data);
        if (data.is_complete) {
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Batch status polling error:', err);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [activeBatchId]);

  if (!isUploadModalOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateFiles = (newFiles: FileList | File[]) => {
    const valid: File[] = [];
    const rejected: any[] = [];
    const allowed = ['.pdf', '.docx', '.doc'];

    Array.from(newFiles).forEach((f) => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      if (!allowed.includes(ext)) {
        rejected.push({ file_name: f.name, reason: 'Unsupported format. Only PDF and DOCX files are allowed.' });
      } else if (f.size > 15 * 1024 * 1024) {
        rejected.push({ file_name: f.name, reason: 'File exceeds 15MB limit.' });
      } else {
        valid.push(f);
      }
    });

    if (rejected.length > 0) {
      setRejectedList((prev) => [...prev, ...rejected]);
    }
    setFiles((prev) => [...prev, ...valid].slice(0, 200));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateFiles(e.target.files);
    }
  };

  const handleStartUpload = async () => {
    if (files.length === 0) return;
    setIsUploading(true);
    setRejectedList([]);

    try {
      const formData = new FormData();
      files.forEach((f) => {
        formData.append('files', f);
      });
      if (selectedJob) {
        formData.append('job_id', selectedJob.toString());
      }

      const res = await apiRequest('/uploads/bulk', {
        method: 'POST',
        body: formData,
      });

      setActiveBatchId(res.batch_id);
      if (res.rejected_files?.length > 0) {
        setRejectedList(res.rejected_files);
      }
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRetryFile = async (fileId: number) => {
    try {
      await apiRequest(`/uploads/retry/${fileId}`, { method: 'POST' });
      // Refresh status immediately
      if (activeBatchId) {
        const data = await apiRequest(`/uploads/status/${activeBatchId}`);
        setBatchData(data);
      }
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setActiveBatchId(null);
    setBatchData(null);
    setRejectedList([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-2xl bg-[var(--surface-1)] border border-[var(--border-strong)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-[#C6FF3D]" />
              Bulk Resume Processing Engine
            </h2>
            <p className="text-xs text-foreground-muted">
              Upload up to 200 PDF and DOCX files. Non-blocking async queue extraction & AI scoring.
            </p>
          </div>
          <button
            onClick={() => setUploadModalOpen(false)}
            className="p-1.5 text-foreground-muted hover:text-foreground rounded-lg hover:bg-[var(--surface-2)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Job Selection */}
        <div className="px-6 py-3 bg-[var(--surface-2)]/60 border-b border-[var(--border)] flex items-center justify-between gap-4">
          <label className="text-xs font-medium text-foreground whitespace-nowrap">
            Target Job Description:
          </label>
          <select
            value={selectedJob}
            onChange={(e) => setSelectedJob(e.target.value ? Number(e.target.value) : '')}
            className="w-full text-xs bg-[var(--surface-1)] border border-[var(--border)] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#C6FF3D] text-foreground font-mono"
          >
            <option value="">Auto-score against all active jobs</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} ({j.department || 'Engineering'})
              </option>
            ))}
          </select>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {!activeBatchId ? (
            <>
              {/* Drag and drop zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                  dragActive
                    ? 'border-[#C6FF3D] bg-[#C6FF3D]/5'
                    : 'border-[var(--border)] hover:border-foreground-muted bg-[var(--surface-2)]/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
                <div className="w-12 h-12 rounded-2xl bg-[var(--surface-3)] flex items-center justify-center text-[#C6FF3D] mb-3 shadow-inner">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="text-sm font-semibold text-foreground">
                  Drag & drop resumes here, or <span className="text-[#C6FF3D] underline">browse</span>
                </div>
                <p className="text-xs text-foreground-muted mt-1 max-w-sm">
                  Accepts PDF and DOCX files up to 15MB each. Instant schema parsing, canonical skill extraction, and candidate deduplication.
                </p>
                <div className="mt-4 flex items-center gap-4 text-[11px] font-mono text-foreground-muted">
                  <span>PDF / DOCX</span>
                  <span>•</span>
                  <span>Up to 200 files</span>
                  <span>•</span>
                  <span>Zero-delay Queue</span>
                </div>
              </div>

              {/* Selected Files preview */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono uppercase text-foreground-muted">
                    <span>{files.length} Files Selected</span>
                    <button
                      onClick={() => setFiles([])}
                      className="text-red-400 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="max-h-44 overflow-y-auto space-y-1.5 p-1">
                    {files.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-xs"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <FileText className="w-4 h-4 text-foreground-muted shrink-0" />
                          <span className="truncate text-foreground font-medium">{file.name}</span>
                        </div>
                        <span className="text-[11px] font-mono text-foreground-muted whitespace-nowrap ml-2">
                          {(file.size / 1024).toFixed(0)} KB
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Live progress tracking view */
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl">
                <div className="flex items-center gap-4">
                  {/* Animated overall progress ring */}
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="26"
                        stroke="currentColor"
                        strokeWidth="5"
                        fill="transparent"
                        className="text-[var(--surface-3)]"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="26"
                        stroke="currentColor"
                        strokeWidth="5"
                        fill="transparent"
                        strokeDasharray={163.3}
                        strokeDashoffset={163.3 - (163.3 * (batchData?.overall_progress || 0)) / 100}
                        className="text-[#C6FF3D] transition-all duration-300"
                      />
                    </svg>
                    <span className="absolute font-mono text-xs font-bold text-foreground">
                      {batchData?.overall_progress || 0}%
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {batchData?.is_complete ? 'Batch Processing Complete' : 'Processing Resumes...'}
                    </h3>
                    <div className="text-xs text-foreground-muted flex items-center gap-2 mt-0.5 font-mono">
                      <span>Total: {batchData?.total || 0}</span>
                      <span>•</span>
                      <span className="text-[#C6FF3D]">Done: {batchData?.counts?.done || 0}</span>
                      <span>•</span>
                      <span className="text-amber-400">Parsing: {batchData?.counts?.parsing || 0}</span>
                      {batchData?.counts?.failed > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-red-400">Failed: {batchData.counts.failed}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {batchData?.is_complete && (
                  <button
                    onClick={handleReset}
                    className="px-3.5 py-1.5 rounded-xl bg-[var(--surface-3)] text-xs font-medium hover:bg-[var(--surface-2)] border border-[var(--border)]"
                  >
                    Upload Another Batch
                  </button>
                )}
              </div>

              {/* Per-file live status list */}
              <div className="space-y-2">
                <div className="text-xs font-mono uppercase text-foreground-muted">
                  Per-File Pipeline Progress
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {batchData?.files?.map((f: any) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between p-2.5 bg-[var(--surface-2)]/60 border border-[var(--border)] rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <FileText className="w-4 h-4 text-foreground-muted shrink-0" />
                        <span className="truncate text-foreground">{f.file_name}</span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        {f.status === 'done' && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#4ADE80] font-mono">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Done
                          </span>
                        )}
                        {f.status === 'failed' && (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-[11px] text-red-400 font-mono">
                              <AlertCircle className="w-3.5 h-3.5" /> Failed
                            </span>
                            <button
                              onClick={() => handleRetryFile(f.id)}
                              title="Retry parsing"
                              className="p-1 rounded bg-[var(--surface-3)] hover:text-foreground text-foreground-muted"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        {['queued', 'extracting', 'parsing', 'scoring'].includes(f.status) && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-mono">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span className="capitalize">{f.status}...</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Rejected files notification */}
          {rejectedList.length > 0 && (
            <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl space-y-1 text-xs text-red-400">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Rejected Files:
              </div>
              {rejectedList.map((rf, i) => (
                <div key={i} className="text-[11px] pl-5">
                  • <b>{rf.file_name}:</b> {rf.reason}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[var(--surface-2)]/60 border-t border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-foreground-muted">
            <ShieldCheck className="w-4 h-4 text-[#C6FF3D]" />
            <span>Automatic duplicate check enabled</span>
          </div>

          {!activeBatchId ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setUploadModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-foreground-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                disabled={files.length === 0 || isUploading}
                onClick={handleStartUpload}
                className="px-5 py-2 rounded-xl bg-[#C6FF3D] text-[#0B0B0A] text-xs font-semibold hover:bg-[#D4FF66] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    Upload & Extract ({files.length})
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setUploadModalOpen(false);
                window.location.reload();
              }}
              className="px-4 py-2 rounded-xl bg-[#C6FF3D] text-[#0B0B0A] text-xs font-semibold hover:bg-[#D4FF66]"
            >
              Done & View Candidates
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
