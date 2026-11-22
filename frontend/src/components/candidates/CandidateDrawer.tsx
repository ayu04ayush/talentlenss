'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { Candidate, SkillGapAnalysis, StageHistoryItem, CandidateNote } from '@/lib/types';
import {
  X, Check, Edit3, FileText, Zap, Award, BookOpen, Clock,
  MessageSquare, Star, Calendar, ArrowRight, ExternalLink, ShieldAlert
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

interface CandidateDrawerProps {
  candidateId: number | null;
  jobId: number | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export default function CandidateDrawer({
  candidateId,
  jobId,
  onClose,
  onUpdated
}: CandidateDrawerProps) {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [skillGap, setSkillGap] = useState<SkillGapAnalysis | null>(null);
  const [history, setHistory] = useState<StageHistoryItem[]>([]);
  const [notes, setNotes] = useState<CandidateNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'score' | 'skillgap' | 'timeline' | 'resume'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!candidateId) return;

    setLoading(true);
    const query = jobId ? `?job_id=${jobId}` : '';

    Promise.all([
      apiRequest(`/candidates/${candidateId}${query}`),
      apiRequest(`/pipeline/history/${candidateId}`),
      apiRequest(`/candidates/${candidateId}/notes`),
      jobId ? apiRequest(`/skill-gap/${candidateId}/${jobId}`).catch(() => null) : Promise.resolve(null),
    ])
      .then(([candRes, histRes, notesRes, gapRes]) => {
        setCandidate(candRes);
        setEditForm(candRes);
        setHistory(histRes || []);
        setNotes(notesRes || []);
        setSkillGap(gapRes);
      })
      .catch((err) => console.error('Error loading candidate drawer:', err))
      .finally(() => setLoading(false));
  }, [candidateId, jobId]);

  if (!candidateId || !candidate) return null;

  const handleSaveEdit = async () => {
    try {
      const updated = await apiRequest(`/candidates/${candidate.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });
      setCandidate(updated);
      setIsEditing(false);
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      const note = await apiRequest(`/candidates/${candidate.id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ content: newNote }),
      });
      setNotes([note, ...notes]);
      setNewNote('');
    } catch (err: any) {
      alert(`Failed to add note: ${err.message}`);
    }
  };

  const handleStarRating = async (rating: number) => {
    try {
      const updated = await apiRequest(`/candidates/${candidate.id}`, {
        method: 'PUT',
        body: JSON.stringify({ star_rating: rating }),
      });
      setCandidate(updated);
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const score = candidate.match_score;
  const radarData = score
    ? [
        { subject: 'Skills Overlap', value: score.skill_score },
        { subject: 'Semantic Fit', value: score.semantic_score },
        { subject: 'Experience', value: score.experience_score },
        { subject: 'Academics/CGPA', value: score.education_score },
        { subject: 'Location', value: score.location_score },
      ]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full max-w-2xl bg-[var(--surface-1)] border-l border-[var(--border-strong)] h-full flex flex-col shadow-2xl overflow-hidden text-foreground"
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-[var(--border)] flex items-start justify-between bg-[var(--surface-2)]/40">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold font-display text-foreground">{candidate.name}</h2>
              {candidate.is_manually_corrected && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Manually Corrected
                </span>
              )}
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[var(--surface-3)] text-foreground border border-[var(--border)]">
                {candidate.current_stage}
              </span>
            </div>

            <div className="text-xs text-foreground-muted flex items-center gap-3">
              <span>{candidate.email || 'No email recorded'}</span>
              <span>•</span>
              <span>{candidate.phone || 'No phone'}</span>
              <span>•</span>
              <span>{candidate.location || 'Remote'}</span>
            </div>

            {/* Star Rating & Confidence */}
            <div className="flex items-center gap-4 pt-1">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleStarRating(star)}
                    className="cursor-pointer text-foreground-muted hover:text-amber-400 transition-colors"
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        star <= candidate.star_rating ? 'text-amber-400 fill-amber-400' : 'text-foreground-muted'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <div className="text-[11px] font-mono text-foreground-muted flex items-center gap-1">
                <span>Confidence:</span>
                <span className="text-[#C6FF3D] font-bold">
                  {(candidate.parsing_confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface-3)] text-xs text-foreground hover:bg-[var(--surface-2)] hairline-border"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            ) : (
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#C6FF3D] text-[#0B0B0A] text-xs font-semibold hover:bg-[#D4FF66]"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-foreground-muted hover:text-foreground rounded-lg hover:bg-[var(--surface-2)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-[var(--border)] bg-[var(--surface-1)] gap-6 text-xs font-medium">
          {[
            { id: 'profile', label: 'Candidate Profile', icon: FileText },
            { id: 'score', label: 'Match Score Breakdown', icon: Zap },
            { id: 'skillgap', label: 'AI Skill-Gap & Path', icon: BookOpen },
            { id: 'timeline', label: 'Stage Timeline & Notes', icon: Clock },
            { id: 'resume', label: 'Resume Preview', icon: ExternalLink },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === t.id
                  ? 'border-[#C6FF3D] text-[#C6FF3D]'
                  : 'border-transparent text-foreground-muted hover:text-foreground'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Drawer Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-foreground-muted">
                  Professional Summary
                </label>
                {isEditing ? (
                  <textarea
                    rows={3}
                    value={editForm.summary || ''}
                    onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                    className="w-full text-xs p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] focus:outline-none focus:border-[#C6FF3D] text-foreground"
                  />
                ) : (
                  <p className="text-xs text-foreground/90 leading-relaxed bg-[var(--surface-2)]/40 p-3.5 rounded-xl hairline-border">
                    {candidate.summary || 'No summary provided.'}
                  </p>
                )}
              </div>

              {/* Skills */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-foreground-muted">
                  Canonical Skills ({candidate.skills?.length || 0})
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.skills?.join(', ') || ''}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        skills: e.target.value.split(',').map((s) => s.trim().toLowerCase()),
                      })
                    }
                    className="w-full text-xs p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] focus:outline-none focus:border-[#C6FF3D] text-foreground font-mono"
                  />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.skills?.map((s) => (
                      <span
                        key={s}
                        className="text-xs font-mono px-2.5 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-[var(--surface-2)] hairline-border">
                  <span className="text-[10px] font-mono uppercase text-foreground-muted">Total Exp</span>
                  <div className="text-base font-bold font-mono text-foreground mt-0.5">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.1"
                        value={editForm.total_experience_years || 0}
                        onChange={(e) => setEditForm({ ...editForm, total_experience_years: parseFloat(e.target.value) })}
                        className="w-full bg-[var(--surface-1)] border border-[var(--border)] px-1.5 py-0.5 rounded text-xs"
                      />
                    ) : (
                      `${candidate.total_experience_years} yrs`
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--surface-2)] hairline-border">
                  <span className="text-[10px] font-mono uppercase text-foreground-muted">CGPA (10 Scale)</span>
                  <div className="text-base font-bold font-mono text-[#C6FF3D] mt-0.5">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.cgpa || 0}
                        onChange={(e) => setEditForm({ ...editForm, cgpa: parseFloat(e.target.value) })}
                        className="w-full bg-[var(--surface-1)] border border-[var(--border)] px-1.5 py-0.5 rounded text-xs"
                      />
                    ) : (
                      candidate.cgpa || '--'
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--surface-2)] hairline-border">
                  <span className="text-[10px] font-mono uppercase text-foreground-muted">10th Percentage</span>
                  <div className="text-base font-bold font-mono text-foreground mt-0.5">
                    {candidate.tenth_percentage ? `${candidate.tenth_percentage}%` : '--'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--surface-2)] hairline-border">
                  <span className="text-[10px] font-mono uppercase text-foreground-muted">12th Percentage</span>
                  <div className="text-base font-bold font-mono text-foreground mt-0.5">
                    {candidate.twelfth_percentage ? `${candidate.twelfth_percentage}%` : '--'}
                  </div>
                </div>
              </div>

              {/* Education */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-foreground-muted">
                  Education Background
                </label>
                <div className="space-y-2">
                  {candidate.education?.map((edu, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-[var(--surface-2)]/40 hairline-border text-xs space-y-1">
                      <div className="font-semibold text-foreground flex items-center justify-between">
                        <span>{edu.degree || 'Degree'}</span>
                        <span className="font-mono text-foreground-muted">{edu.graduation_year || ''}</span>
                      </div>
                      <div className="text-foreground-muted">{edu.institution}</div>
                      {edu.branch && <div className="text-foreground-muted font-mono">{edu.branch}</div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Work Experience */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-foreground-muted">
                  Professional Experience
                </label>
                <div className="space-y-2.5">
                  {candidate.experience?.map((exp, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-[var(--surface-2)]/40 hairline-border text-xs space-y-1.5">
                      <div className="font-semibold text-foreground flex items-center justify-between">
                        <span>{exp.role}</span>
                        <span className="font-mono text-foreground-muted text-[11px]">
                          {exp.start} - {exp.end}
                        </span>
                      </div>
                      <div className="text-[#C6FF3D] font-medium">{exp.company}</div>
                      {exp.description && <p className="text-foreground-muted leading-relaxed">{exp.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'score' && (
            <div className="space-y-6">
              {score ? (
                <>
                  {/* Total score ring + AI explanation banner */}
                  <div className="p-5 rounded-2xl bg-[var(--surface-2)] hairline-border flex items-start gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--surface-3)] flex flex-col items-center justify-center shrink-0 border border-[#C6FF3D]/30">
                      <span className="text-2xl font-bold font-mono text-[#C6FF3D]">
                        {score.total_score.toFixed(0)}
                      </span>
                      <span className="text-[9px] font-mono text-foreground-muted">/100</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-[#C6FF3D]" />
                        Hybrid AI Match Rationale
                      </h4>
                      <p className="text-xs text-foreground/90 mt-1.5 leading-relaxed bg-[var(--surface-1)] p-3 rounded-xl hairline-border">
                        {score.ai_explanation || 'Comprehensive evaluation calculated against target job specification.'}
                      </p>
                    </div>
                  </div>

                  {/* Radar Chart */}
                  <div className="p-4 rounded-2xl bg-[var(--surface-2)]/40 hairline-border">
                    <h4 className="text-xs font-mono uppercase text-foreground-muted mb-2 text-center">
                      Multi-Dimensional Candidate Radar
                    </h4>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="var(--border)" />
                          <PolarAngleAxis dataKey="subject" stroke="var(--foreground-muted)" fontSize={11} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="var(--border)" fontSize={10} />
                          <Radar
                            name="Candidate Fit"
                            dataKey="value"
                            stroke="#C6FF3D"
                            fill="#C6FF3D"
                            fillOpacity={0.35}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Skills Match List */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-[var(--surface-2)]/60 hairline-border space-y-2">
                      <span className="text-xs font-mono uppercase text-[#4ADE80] font-semibold">
                        Matched Skills ({score.matched_skills?.length || 0})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {score.matched_skills?.map((s) => (
                          <span
                            key={s}
                            className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/20"
                          >
                            ✓ {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[var(--surface-2)]/60 hairline-border space-y-2">
                      <span className="text-xs font-mono uppercase text-[#F87171] font-semibold">
                        Missing Skills ({score.missing_skills?.length || 0})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {score.missing_skills?.map((s) => (
                          <span
                            key={s}
                            className="text-[11px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20"
                          >
                            ✗ {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-foreground-muted text-xs">
                  Select a target Job Description to view score breakdown.
                </div>
              )}
            </div>
          )}

          {activeTab === 'skillgap' && (
            <div className="space-y-6">
              {skillGap ? (
                <>
                  {/* Readiness Bar */}
                  <div className="p-5 rounded-2xl bg-[var(--surface-2)] hairline-border space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-foreground-muted">Role Readiness Quotient:</span>
                      <span className="text-[#C6FF3D] font-bold text-sm">
                        {skillGap.readiness_percentage}%
                      </span>
                    </div>
                    <div className="w-full h-3 bg-[var(--surface-3)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#FF5B2E] via-[#FBBF24] to-[#C6FF3D] rounded-full transition-all duration-500"
                        style={{ width: `${skillGap.readiness_percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Suggested Learning Path */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono uppercase text-foreground-muted">
                      <span>Structured Upskilling Curriculum</span>
                      <span>Priority Ordered</span>
                    </div>

                    <div className="space-y-3">
                      {skillGap.suggested_learning_path?.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl bg-[var(--surface-2)]/50 hairline-border space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-[var(--surface-3)] text-[10px] font-mono font-bold flex items-center justify-center text-[#C6FF3D]">
                                {idx + 1}
                              </span>
                              <span className="font-bold text-foreground font-mono text-sm capitalize">
                                {item.skill}
                              </span>
                              <span
                                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full ${
                                  item.importance === 'required'
                                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                    : 'bg-[var(--surface-3)] text-foreground-muted'
                                }`}
                              >
                                {item.importance}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono capitalize text-amber-400">
                              {item.status} gap
                            </span>
                          </div>

                          <p className="text-foreground-muted text-[11px] leading-relaxed">
                            {item.reason}
                          </p>

                          {/* Recommended Learning Resources */}
                          {item.learning_resources?.length > 0 && (
                            <div className="pt-1 space-y-1">
                              <div className="text-[10px] font-mono uppercase text-foreground-muted">
                                Recommended Resources:
                              </div>
                              <div className="space-y-1">
                                {item.learning_resources.map((res, rIdx) => (
                                  <div
                                    key={rIdx}
                                    className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-[11px]"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[var(--surface-3)] text-[#C6FF3D]">
                                        {res.type}
                                      </span>
                                      <span className="font-medium text-foreground">{res.title}</span>
                                    </div>
                                    {res.url && (
                                      <a
                                        href={res.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[#C6FF3D] hover:underline flex items-center gap-1 font-mono text-[10px]"
                                      >
                                        Study <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-foreground-muted text-xs">
                  Select a job description to generate AI skill-gap insights.
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-6">
              {/* Interview Scheduler */}
              <div className="p-4 rounded-xl bg-[var(--surface-2)]/60 hairline-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#C6FF3D]" /> Interview Scheduling
                  </span>
                  <span className="text-[11px] font-mono text-foreground-muted">
                    {candidate.interview_date
                      ? new Date(candidate.interview_date).toLocaleString()
                      : 'No date scheduled'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    onChange={async (e) => {
                      if (!e.target.value) return;
                      await apiRequest(`/candidates/${candidate.id}`, {
                        method: 'PUT',
                        body: JSON.stringify({ interview_date: e.target.value }),
                      });
                      setCandidate({ ...candidate, interview_date: e.target.value });
                    }}
                    className="w-full text-xs p-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-foreground font-mono"
                  />
                </div>
              </div>

              {/* Add Note Box */}
              <form onSubmit={handleAddNote} className="space-y-2">
                <label className="text-xs font-mono uppercase text-foreground-muted">
                  Recruiter Screening Notes
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add interview feedback or notes..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="flex-1 text-xs p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-foreground focus:outline-none focus:border-[#C6FF3D]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#C6FF3D] text-[#0B0B0A] text-xs font-semibold hover:bg-[#D4FF66] shrink-0"
                  >
                    Post Note
                  </button>
                </div>
              </form>

              {/* Notes List */}
              <div className="space-y-2">
                {notes.map((n) => (
                  <div key={n.id} className="p-3 rounded-xl bg-[var(--surface-2)]/40 hairline-border text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-foreground-muted">
                      <span className="font-semibold text-[#C6FF3D]">{n.author_name}</span>
                      <span className="font-mono">{new Date(n.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-foreground leading-relaxed">{n.content}</p>
                  </div>
                ))}
              </div>

              {/* Stage Transition History Timeline */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase text-foreground-muted">
                  Stage Audit History
                </label>
                <div className="space-y-2 border-l border-[var(--border)] ml-3 pl-4">
                  {history.map((h) => (
                    <div key={h.id} className="relative space-y-0.5 text-xs">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#C6FF3D]" />
                      <div className="font-semibold text-foreground">
                        {h.from_stage ? `${h.from_stage} → ${h.to_stage}` : `Initial Stage: ${h.to_stage}`}
                      </div>
                      <div className="text-[11px] text-foreground-muted flex items-center gap-2 font-mono">
                        <span>By {h.moved_by}</span>
                        <span>•</span>
                        <span>{new Date(h.created_at).toLocaleString()}</span>
                      </div>
                      {h.notes && <p className="text-foreground-muted text-[11px] italic">{h.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'resume' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-foreground-muted">
                <span>Original Document File Preview</span>
                <a
                  href={`http://localhost:8000/api/candidates/${candidate.id}/resume`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#C6FF3D] hover:underline flex items-center gap-1 font-mono"
                >
                  Open in New Window <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="w-full h-96 border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface-2)] flex items-center justify-center">
                <iframe
                  src={`http://localhost:8000/api/candidates/${candidate.id}/resume`}
                  className="w-full h-full"
                  title="Candidate Resume"
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
