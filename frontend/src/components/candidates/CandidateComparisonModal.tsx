'use client';

import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { X, Trophy, Zap, Check, ArrowRight, Star, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

interface CandidateComparisonModalProps {
  candidateIds: number[];
  jobId: number | null;
  onClose: () => void;
}

export default function CandidateComparisonModal({
  candidateIds,
  jobId,
  onClose,
}: CandidateComparisonModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (candidateIds.length < 2) return;
    setLoading(true);
    apiRequest('/candidates/compare', {
      method: 'POST',
      body: JSON.stringify({ candidate_ids: candidateIds, job_id: jobId }),
    })
      .then((res) => setData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [candidateIds, jobId]);

  if (candidateIds.length < 2) return null;

  const candidates = data?.candidates || [];
  const highlights = data?.best_highlights || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-5xl bg-[var(--surface-1)] border border-[var(--border-strong)] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-foreground"
      >
        {/* Header */}
        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-2)]/60">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#C6FF3D] uppercase tracking-wider mb-1">
              <Trophy className="w-3.5 h-3.5" /> Side-by-Side Evaluation Matrix
            </div>
            <h2 className="text-xl font-bold font-display text-foreground">
              Candidate Comparison ({candidates.length})
            </h2>
            <p className="text-xs text-foreground-muted">
              Green highlight indicates top performer for that evaluation dimension.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-foreground-muted hover:text-foreground rounded-lg hover:bg-[var(--surface-3)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Grid */}
        <div className="p-6 overflow-x-auto overflow-y-auto flex-1">
          {loading ? (
            <div className="py-24 text-center text-xs text-foreground-muted animate-pulse font-mono">
              Analyzing side-by-side dimensional metrics...
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="py-3 px-4 font-mono uppercase text-foreground-muted w-44">
                    Dimension
                  </th>
                  {candidates.map((c: any) => (
                    <th key={c.id} className="py-3 px-4 font-semibold text-foreground">
                      <div className="text-sm font-bold text-foreground">{c.name}</div>
                      <div className="text-[11px] font-mono text-foreground-muted">{c.current_stage}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] font-mono">
                {/* Total Score */}
                <tr className="hover:bg-[var(--surface-2)]/30">
                  <td className="py-3 px-4 font-medium text-foreground-muted flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#C6FF3D]" /> Overall AI Score
                  </td>
                  {candidates.map((c: any) => {
                    const isBest = highlights.best_score === c.id;
                    return (
                      <td key={c.id} className="py-3 px-4">
                        <div
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-bold ${
                            isBest
                              ? 'bg-[#C6FF3D] text-[#0B0B0A] shadow-sm'
                              : 'bg-[var(--surface-2)] text-foreground'
                          }`}
                        >
                          {isBest && <Trophy className="w-3.5 h-3.5" />}
                          <span>{c.total_score.toFixed(0)}%</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Experience */}
                <tr className="hover:bg-[var(--surface-2)]/30">
                  <td className="py-3 px-4 font-medium text-foreground-muted">Total Experience</td>
                  {candidates.map((c: any) => {
                    const isBest = highlights.best_experience === c.id;
                    return (
                      <td key={c.id} className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            isBest ? 'text-[#C6FF3D] bg-[#C6FF3D]/10' : 'text-foreground'
                          }`}
                        >
                          {c.experience_years} years
                        </span>
                      </td>
                    );
                  })}
                </tr>

                {/* CGPA */}
                <tr className="hover:bg-[var(--surface-2)]/30">
                  <td className="py-3 px-4 font-medium text-foreground-muted">Academic CGPA</td>
                  {candidates.map((c: any) => {
                    const isBest = highlights.best_cgpa === c.id;
                    return (
                      <td key={c.id} className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            isBest ? 'text-[#C6FF3D] bg-[#C6FF3D]/10' : 'text-foreground'
                          }`}
                        >
                          {c.cgpa ? `${c.cgpa} / 10.0` : '--'}
                        </span>
                      </td>
                    );
                  })}
                </tr>

                {/* Skills Overlap Count */}
                <tr className="hover:bg-[var(--surface-2)]/30">
                  <td className="py-3 px-4 font-medium text-foreground-muted">Matched Skills</td>
                  {candidates.map((c: any) => (
                    <td key={c.id} className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {c.matched_skills?.map((s: string) => (
                          <span
                            key={s}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/20"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Missing Skills */}
                <tr className="hover:bg-[var(--surface-2)]/30">
                  <td className="py-3 px-4 font-medium text-foreground-muted">Missing Skill Gaps</td>
                  {candidates.map((c: any) => (
                    <td key={c.id} className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {c.missing_skills?.map((s: string) => (
                          <span
                            key={s}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* AI Rationale Summary */}
                <tr className="hover:bg-[var(--surface-2)]/30 font-sans">
                  <td className="py-3 px-4 font-medium text-foreground-muted font-mono">
                    Evaluation Rationale
                  </td>
                  {candidates.map((c: any) => (
                    <td key={c.id} className="py-3 px-4 text-xs text-foreground/80 leading-relaxed max-w-xs">
                      {c.ai_explanation || '--'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[var(--surface-2)]/60 border-t border-[var(--border)] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[var(--surface-3)] text-xs font-semibold hover:bg-[var(--surface-2)] text-foreground hairline-border"
          >
            Close Matrix
          </button>
        </div>
      </motion.div>
    </div>
  );
}
