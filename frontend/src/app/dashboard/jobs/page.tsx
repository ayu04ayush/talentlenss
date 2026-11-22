'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { apiRequest } from '@/lib/api';
import { Job } from '@/lib/types';
import {
  Briefcase, Plus, Sparkles, Sliders, Check, Trash2, Edit3,
  RefreshCw, X, ChevronRight, Layers, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function JobsPage() {
  const { jobs, setJobs, selectedJobId, setSelectedJobId } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [editingJobId, setEditingJobId] = useState<number | null>(null);

  // Form State
  const [form, setForm] = useState({
    title: '',
    department: 'Engineering',
    description: '',
    required_skills: '' as string,
    nice_skills: '' as string,
    min_experience: 2,
    max_experience: 6,
    min_cgpa: 7.0,
    location: 'Remote / Hybrid',
    education_req: "Bachelor's in Computer Science or equivalent",
    weights: {
      semantic: 25,
      skills: 35,
      experience: 20,
      education: 10,
      location: 10,
    },
  });

  const fetchJobs = async () => {
    try {
      const data = await apiRequest('/jobs');
      setJobs(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleOpenCreate = () => {
    setEditingJobId(null);
    setPasteText('');
    setForm({
      title: '',
      department: 'Engineering',
      description: '',
      required_skills: '',
      nice_skills: '',
      min_experience: 2,
      max_experience: 6,
      min_cgpa: 7.0,
      location: 'Remote / Hybrid',
      education_req: "Bachelor's in Computer Science or equivalent",
      weights: {
        semantic: 25,
        skills: 35,
        experience: 20,
        education: 10,
        location: 10,
      },
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (job: Job) => {
    setEditingJobId(job.id);
    setForm({
      title: job.title,
      department: job.department || 'Engineering',
      description: job.description,
      required_skills: job.required_skills?.join(', ') || '',
      nice_skills: job.nice_skills?.join(', ') || '',
      min_experience: job.min_experience,
      max_experience: job.max_experience,
      min_cgpa: job.min_cgpa,
      location: job.location || 'Remote',
      education_req: job.education_req || '',
      weights: job.weights || {
        semantic: 25,
        skills: 35,
        experience: 20,
        education: 10,
        location: 10,
      },
    });
    setIsModalOpen(true);
  };

  const handleAutoExtract = async () => {
    if (!pasteText.trim()) return;
    setIsExtracting(true);
    try {
      const extracted = await apiRequest('/jobs/parse-from-text', {
        method: 'POST',
        body: JSON.stringify({ raw_text: pasteText }),
      });

      setForm((prev) => ({
        ...prev,
        title: extracted.title || prev.title,
        department: extracted.department || prev.department,
        description: extracted.description || pasteText,
        required_skills: extracted.required_skills?.join(', ') || prev.required_skills,
        nice_skills: extracted.nice_skills?.join(', ') || prev.nice_skills,
        min_experience: extracted.min_experience ?? prev.min_experience,
        max_experience: extracted.max_experience ?? prev.max_experience,
        min_cgpa: extracted.min_cgpa ?? prev.min_cgpa,
        location: extracted.location || prev.location,
        education_req: extracted.education_req || prev.education_req,
        weights: extracted.weights || prev.weights,
      }));
    } catch (err: any) {
      alert(`Auto-extraction failed: ${err.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: form.title,
        department: form.department,
        description: form.description,
        required_skills: form.required_skills.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
        nice_skills: form.nice_skills.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
        min_experience: Number(form.min_experience),
        max_experience: Number(form.max_experience),
        min_cgpa: Number(form.min_cgpa),
        location: form.location,
        education_req: form.education_req,
        weights: form.weights,
      };

      if (editingJobId) {
        await apiRequest(`/jobs/${editingJobId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/jobs', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      fetchJobs();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    }
  };

  const handleDeleteJob = async (id: number) => {
    if (!confirm('Are you sure you want to delete this job description?')) return;
    try {
      await apiRequest(`/jobs/${id}`, { method: 'DELETE' });
      if (selectedJobId === id) setSelectedJobId(null);
      fetchJobs();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-display">
            Job Descriptions & Criteria
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Configure target job roles, customize hybrid matching weights, and extract fields from raw text.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C6FF3D] text-[#0B0B0A] text-xs font-semibold hover:bg-[#D4FF66] transition-all shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Job Opening</span>
        </button>
      </div>

      {/* Jobs List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {jobs.map((job) => {
          const isSelected = selectedJobId === job.id;

          return (
            <div
              key={job.id}
              className={`p-6 rounded-2xl bg-[var(--surface-1)] border transition-all flex flex-col justify-between space-y-4 ${
                isSelected
                  ? 'border-[#C6FF3D] shadow-lg shadow-[#C6FF3D]/5'
                  : 'border-[var(--border)] hover:border-[var(--border-strong)]'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[var(--surface-3)] text-foreground-muted">
                      {job.department || 'Engineering'}
                    </span>
                    <h3 className="text-lg font-bold text-foreground mt-1.5">{job.title}</h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(job)}
                      className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-[var(--surface-2)]"
                      title="Edit Job & Weights"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteJob(job.id)}
                      className="p-1.5 rounded-lg text-foreground-muted hover:text-red-400 hover:bg-[var(--surface-2)]"
                      title="Delete Job"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-foreground-muted line-clamp-3 leading-relaxed">
                  {job.description}
                </p>

                {/* Key criteria */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border)] text-[11px] font-mono">
                  <div className="p-2 rounded-lg bg-[var(--surface-2)]">
                    <span className="text-foreground-muted block text-[9px] uppercase">Exp Range</span>
                    <span className="font-semibold text-foreground">
                      {job.min_experience} - {job.max_experience} yrs
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--surface-2)]">
                    <span className="text-foreground-muted block text-[9px] uppercase">Min CGPA</span>
                    <span className="font-semibold text-[#C6FF3D]">{job.min_cgpa} / 10</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--surface-2)]">
                    <span className="text-foreground-muted block text-[9px] uppercase">Location</span>
                    <span className="font-semibold text-foreground truncate block">{job.location || 'Remote'}</span>
                  </div>
                </div>

                {/* Skills tags */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-mono uppercase text-foreground-muted">
                    Required Skills:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {job.required_skills?.map((s) => (
                      <span
                        key={s}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--surface-2)] text-[#C6FF3D] border border-[var(--border)]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Weights Sliders Preview */}
                <div className="space-y-1 pt-1 text-[10px] font-mono text-foreground-muted">
                  <div className="flex justify-between">
                    <span>Weights: Skills ({job.weights?.skills ?? 35}%)</span>
                    <span>Semantic ({job.weights?.semantic ?? 25}%)</span>
                    <span>Exp ({job.weights?.experience ?? 20}%)</span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
                <button
                  onClick={() => setSelectedJobId(job.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#C6FF3D] text-[#0B0B0A]'
                      : 'bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-foreground hairline-border'
                  }`}
                >
                  {isSelected ? '✓ Active Position' : 'Set as Active Opening'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Modal with AI Auto-Extraction */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[var(--surface-1)] border border-[var(--border-strong)] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-foreground"
            >
              {/* Header */}
              <div className="p-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-2)]/60">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#C6FF3D]" />
                  {editingJobId ? 'Edit Job Opening & Model Weights' : 'Create New Job Opening'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-foreground-muted hover:text-foreground rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5">
                {/* AI Paste Extraction Section */}
                {!editingJobId && (
                  <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#C6FF3D]" />
                        Auto-Extract Fields from Raw Job Description
                      </span>
                      <span className="text-[10px] font-mono text-foreground-muted">LLM or Regex Engine</span>
                    </div>
                    <textarea
                      rows={3}
                      placeholder="Paste unstructured job description text here to automatically populate structured parameters below..."
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      className="w-full p-2.5 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-xs text-foreground focus:outline-none focus:border-[#C6FF3D]"
                    />
                    <button
                      type="button"
                      disabled={!pasteText.trim() || isExtracting}
                      onClick={handleAutoExtract}
                      className="px-3.5 py-1.5 rounded-lg bg-[#C6FF3D] text-[#0B0B0A] text-xs font-semibold hover:bg-[#D4FF66] disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                    >
                      {isExtracting ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Extracting Structured Parameters...
                        </>
                      ) : (
                        <>
                          Auto-Extract Fields
                          <ArrowRight className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </div>
                )}

                <form onSubmit={handleSaveJob} className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-foreground-muted font-mono uppercase text-[10px]">
                        Job Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        className="w-full p-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-foreground font-semibold"
                        placeholder="e.g. Senior Full-Stack Engineer"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-foreground-muted font-mono uppercase text-[10px]">
                        Department
                      </label>
                      <input
                        type="text"
                        value={form.department}
                        onChange={(e) => setForm({ ...form, department: e.target.value })}
                        className="w-full p-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-foreground"
                        placeholder="Engineering / Product"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-foreground-muted font-mono uppercase text-[10px]">
                      Job Description Text *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="w-full p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-foreground leading-relaxed"
                    />
                  </div>

                  {/* Skills inputs */}
                  <div className="space-y-1">
                    <label className="text-foreground-muted font-mono uppercase text-[10px]">
                      Required Skills (Comma separated)
                    </label>
                    <input
                      type="text"
                      value={form.required_skills}
                      onChange={(e) => setForm({ ...form, required_skills: e.target.value })}
                      className="w-full p-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-foreground font-mono"
                      placeholder="python, fastapi, react, typescript, postgresql"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-foreground-muted font-mono uppercase text-[10px]">
                      Nice-to-Have Skills (Comma separated)
                    </label>
                    <input
                      type="text"
                      value={form.nice_skills}
                      onChange={(e) => setForm({ ...form, nice_skills: e.target.value })}
                      className="w-full p-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-foreground font-mono"
                      placeholder="docker, kubernetes, aws, redis"
                    />
                  </div>

                  {/* Experience & Academics */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-foreground-muted font-mono uppercase text-[10px]">
                        Min Experience (Yrs)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={form.min_experience}
                        onChange={(e) => setForm({ ...form, min_experience: parseFloat(e.target.value) })}
                        className="w-full p-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-foreground font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-foreground-muted font-mono uppercase text-[10px]">
                        Max Experience (Yrs)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={form.max_experience}
                        onChange={(e) => setForm({ ...form, max_experience: parseFloat(e.target.value) })}
                        className="w-full p-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-foreground font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-foreground-muted font-mono uppercase text-[10px]">
                        Min CGPA (10 Scale)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={form.min_cgpa}
                        onChange={(e) => setForm({ ...form, min_cgpa: parseFloat(e.target.value) })}
                        className="w-full p-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-foreground font-mono"
                      />
                    </div>
                  </div>

                  {/* Weights Sliders */}
                  <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-[#C6FF3D]" /> Configurable Scoring Weights
                      </span>
                      <span className="font-mono text-[10px] text-foreground-muted">
                        Total:{' '}
                        {Object.values(form.weights).reduce((a, b) => a + Number(b), 0)}%
                      </span>
                    </div>

                    <div className="space-y-2 text-[11px] font-mono">
                      {[
                        { key: 'skills', label: 'Required/Nice Skills Overlap' },
                        { key: 'semantic', label: 'Semantic Text Similarity' },
                        { key: 'experience', label: 'Experience Range Fit' },
                        { key: 'education', label: 'Academic & CGPA Fit' },
                        { key: 'location', label: 'Location & Remote Fit' },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-3">
                          <span className="w-48 text-foreground-muted truncate">{label}</span>
                          <input
                            type="range"
                            min="0"
                            max="60"
                            value={(form.weights as any)[key]}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                weights: { ...form.weights, [key]: Number(e.target.value) },
                              })
                            }
                            className="flex-1 accent-[#C6FF3D]"
                          />
                          <span className="w-10 text-right font-bold text-foreground">
                            {(form.weights as any)[key]}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-medium text-foreground-muted hover:text-foreground"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-[#C6FF3D] text-[#0B0B0A] text-xs font-semibold hover:bg-[#D4FF66]"
                    >
                      Save & Rescore Candidates
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
