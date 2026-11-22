'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { DuplicateFlagItem } from '@/lib/types';
import {
  Copy, Check, X, ShieldAlert, ArrowRight, UserCheck, Trash2,
  Calendar, Zap, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DuplicatesPage() {
  const [duplicates, setDuplicates] = useState<DuplicateFlagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMergeItem, setActiveMergeItem] = useState<DuplicateFlagItem | null>(null);

  const fetchDuplicates = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/duplicates');
      setDuplicates(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDuplicates();
  }, []);

  const handleMerge = async (flagId: number, primaryId: number) => {
    try {
      await apiRequest('/duplicates/merge', {
        method: 'POST',
        body: JSON.stringify({
          duplicate_flag_id: flagId,
          primary_candidate_id: primaryId,
        }),
      });
      setActiveMergeItem(null);
      fetchDuplicates();
    } catch (err: any) {
      alert(`Merge error: ${err.message}`);
    }
  };

  const handleDismiss = async (flagId: number) => {
    try {
      await apiRequest('/duplicates/dismiss', {
        method: 'POST',
        body: JSON.stringify({ duplicate_flag_id: flagId }),
      });
      fetchDuplicates();
    } catch (err: any) {
      alert(`Dismiss error: ${err.message}`);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-[#FF5B2E] uppercase tracking-wider mb-1">
          <ShieldAlert className="w-3.5 h-3.5" /> 3-Tier Collision Detection Engine
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-display">
          Duplicate Candidate Matrix
        </h1>
        <p className="text-xs text-foreground-muted mt-1">
          Detects candidate duplicates via SHA-256 file hashes, exact email/phone matches, and fuzzy name similarity.
        </p>
      </div>

      {/* Duplicates List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-16 text-center text-xs text-foreground-muted animate-pulse font-mono">
            Scanning candidate collision records...
          </div>
        ) : duplicates.length === 0 ? (
          <div className="p-16 text-center rounded-2xl bg-[var(--surface-1)] hairline-border space-y-2">
            <CheckCircle2 className="w-8 h-8 text-[#4ADE80] mx-auto" />
            <h3 className="text-sm font-semibold text-foreground">Clean Candidate Database</h3>
            <p className="text-xs text-foreground-muted max-w-sm mx-auto">
              No pending duplicate candidate collisions detected. All incoming resumes are uniquely indexed.
            </p>
          </div>
        ) : (
          duplicates.map((dup) => (
            <div
              key={dup.id}
              className="p-6 rounded-2xl bg-[var(--surface-1)] border border-amber-500/20 shadow-md space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                  </span>
                  <div>
                    <span className="text-xs font-mono uppercase text-amber-400 font-bold">
                      Possible Duplicate Flagged
                    </span>
                    <div className="text-[11px] text-foreground-muted font-mono">
                      Match Rule:{' '}
                      <span className="text-foreground font-semibold uppercase">
                        {dup.match_type.replace('_', ' ')}
                      </span>{' '}
                      • Confidence: {(dup.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveMergeItem(dup)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#C6FF3D] text-[#0B0B0A] text-xs font-semibold hover:bg-[#D4FF66] transition-colors"
                  >
                    Side-by-Side Merge
                  </button>
                  <button
                    onClick={() => handleDismiss(dup.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-xs text-foreground-muted hover:text-foreground hairline-border"
                  >
                    Dismiss Flag
                  </button>
                </div>
              </div>

              {/* Side-by-Side Candidates Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Duplicate / New Record */}
                <div className="p-4 rounded-xl bg-[var(--surface-2)]/60 hairline-border space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[var(--surface-3)] text-amber-400">
                      Flagged Record (#{dup.candidate?.id})
                    </span>
                    <span className="font-mono text-foreground-muted text-[11px]">
                      {dup.candidate?.current_stage}
                    </span>
                  </div>
                  <div className="font-bold text-sm text-foreground">{dup.candidate?.name}</div>
                  <div className="text-foreground-muted space-y-0.5 font-mono text-[11px]">
                    <div>Email: {dup.candidate?.email || 'N/A'}</div>
                    <div>Phone: {dup.candidate?.phone || 'N/A'}</div>
                    <div>Location: {dup.candidate?.location || 'Remote'}</div>
                    <div>Experience: {dup.candidate?.total_experience_years} yrs</div>
                    <div>CGPA: {dup.candidate?.cgpa || 'N/A'}</div>
                  </div>
                </div>

                {/* Original Record */}
                <div className="p-4 rounded-xl bg-[var(--surface-2)]/60 hairline-border space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[var(--surface-3)] text-[#C6FF3D]">
                      Existing Record (#{dup.original_candidate?.id})
                    </span>
                    <span className="font-mono text-foreground-muted text-[11px]">
                      {dup.original_candidate?.current_stage}
                    </span>
                  </div>
                  <div className="font-bold text-sm text-foreground">{dup.original_candidate?.name}</div>
                  <div className="text-foreground-muted space-y-0.5 font-mono text-[11px]">
                    <div>Email: {dup.original_candidate?.email || 'N/A'}</div>
                    <div>Phone: {dup.original_candidate?.phone || 'N/A'}</div>
                    <div>Location: {dup.original_candidate?.location || 'Remote'}</div>
                    <div>Experience: {dup.original_candidate?.total_experience_years} yrs</div>
                    <div>CGPA: {dup.original_candidate?.cgpa || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Merge Confirmation Dialog */}
      <AnimatePresence>
        {activeMergeItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[var(--surface-1)] border border-[var(--border-strong)] rounded-2xl shadow-2xl p-6 space-y-5 text-foreground"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Copy className="w-4 h-4 text-[#C6FF3D]" />
                  Merge Duplicate Profiles
                </h3>
                <button
                  onClick={() => setActiveMergeItem(null)}
                  className="p-1 text-foreground-muted hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-foreground-muted leading-relaxed">
                Merging will consolidate uploaded resume documents, recruiter screening notes, and stage histories into the selected primary profile. The other record will be safely removed.
              </p>

              <div className="space-y-3">
                <div className="text-xs font-mono uppercase text-foreground-muted">
                  Select Profile to Retain as Primary:
                </div>

                <button
                  onClick={() => handleMerge(activeMergeItem.id, activeMergeItem.original_candidate.id)}
                  className="w-full p-3.5 rounded-xl bg-[var(--surface-2)] hover:border-[#C6FF3D] border border-[var(--border)] text-left space-y-1 transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground group-hover:text-[#C6FF3D]">
                      Retain Existing: {activeMergeItem.original_candidate.name} (#{activeMergeItem.original_candidate.id})
                    </span>
                    <span className="text-[10px] font-mono text-foreground-muted">
                      {activeMergeItem.original_candidate.current_stage}
                    </span>
                  </div>
                  <div className="text-[11px] text-foreground-muted font-mono">
                    {activeMergeItem.original_candidate.email} • {activeMergeItem.original_candidate.total_experience_years} yrs exp
                  </div>
                </button>

                <button
                  onClick={() => handleMerge(activeMergeItem.id, activeMergeItem.candidate.id)}
                  className="w-full p-3.5 rounded-xl bg-[var(--surface-2)] hover:border-[#C6FF3D] border border-[var(--border)] text-left space-y-1 transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground group-hover:text-[#C6FF3D]">
                      Retain Flagged: {activeMergeItem.candidate.name} (#{activeMergeItem.candidate.id})
                    </span>
                    <span className="text-[10px] font-mono text-foreground-muted">
                      {activeMergeItem.candidate.current_stage}
                    </span>
                  </div>
                  <div className="text-[11px] text-foreground-muted font-mono">
                    {activeMergeItem.candidate.email} • {activeMergeItem.candidate.total_experience_years} yrs exp
                  </div>
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  onClick={() => setActiveMergeItem(null)}
                  className="px-4 py-2 rounded-xl text-xs text-foreground-muted hover:text-foreground font-medium"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
