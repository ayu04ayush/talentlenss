'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { apiRequest } from '@/lib/api';
import { Candidate } from '@/lib/types';
import CandidateDrawer from '@/components/candidates/CandidateDrawer';
import CandidateComparisonModal from '@/components/candidates/CandidateComparisonModal';
import {
  Search, Filter, ArrowUpDown, Download, CheckSquare, Square,
  Layers, ChevronLeft, ChevronRight, SlidersHorizontal, X,
  Zap, Star, Trophy, Sparkles, MoreHorizontal, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CandidatesPage() {
  const {
    filters, setFilter, setFilters, clearFilters,
    selectedJobId, jobs,
    selectedCandidateId, setSelectedCandidateId,
    compareCandidateIds, toggleCompareCandidate, clearCompareCandidates
  } = useAppStore();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [skillInput, setSkillInput] = useState('');

  // Bulk move stage state
  const [bulkStage, setBulkStage] = useState('');

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedJobId) params.append('job_id', selectedJobId.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.stage && filters.stage !== 'all') params.append('stage', filters.stage);
      if (filters.minScore !== undefined) params.append('min_score', filters.minScore.toString());
      if (filters.cgpaMin !== undefined) params.append('cgpa_min', filters.cgpaMin.toString());
      if (filters.cgpaMax !== undefined) params.append('cgpa_max', filters.cgpaMax.toString());
      if (filters.tenthMin !== undefined) params.append('tenth_min', filters.tenthMin.toString());
      if (filters.tenthMax !== undefined) params.append('tenth_max', filters.tenthMax.toString());
      if (filters.twelfthMin !== undefined) params.append('twelfth_min', filters.twelfthMin.toString());
      if (filters.twelfthMax !== undefined) params.append('twelfth_max', filters.twelfthMax.toString());
      if (filters.expMin !== undefined) params.append('exp_min', filters.expMin.toString());
      if (filters.expMax !== undefined) params.append('exp_max', filters.expMax.toString());
      if (filters.skills?.length > 0) {
        params.append('skills', filters.skills.join(','));
        params.append('skill_mode', filters.skillMode);
      }
      if (filters.location) params.append('location', filters.location);
      if (filters.gradYearMin) params.append('grad_year_min', filters.gradYearMin.toString());
      if (filters.gradYearMax) params.append('grad_year_max', filters.gradYearMax.toString());

      params.append('sort_by', filters.sortBy);
      params.append('sort_order', filters.sortOrder);
      params.append('page', filters.page.toString());
      params.append('per_page', filters.perPage.toString());

      const res = await apiRequest(`/candidates?${params.toString()}`);
      setCandidates(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.total_pages || 1);
    } catch (err) {
      console.error('Failed to fetch candidates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCandidates();
    }, 250);
    return () => clearTimeout(timer);
  }, [filters, selectedJobId]);

  const handleSort = (column: string) => {
    if (filters.sortBy === column) {
      setFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setFilters({ sortBy: column, sortOrder: 'desc' });
    }
  };

  const handleSelectAll = () => {
    if (selectedCandidates.length === candidates.length) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(candidates.map((c) => c.id));
    }
  };

  const handleToggleSelect = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedCandidates.includes(id)) {
      setSelectedCandidates(selectedCandidates.filter((cid) => cid !== id));
    } else {
      setSelectedCandidates([...selectedCandidates, id]);
    }
  };

  const handleBulkMove = async () => {
    if (!bulkStage || selectedCandidates.length === 0) return;
    try {
      await apiRequest('/pipeline/bulk-move', {
        method: 'POST',
        body: JSON.stringify({
          candidate_ids: selectedCandidates,
          to_stage: bulkStage,
        }),
      });
      setSelectedCandidates([]);
      setBulkStage('');
      fetchCandidates();
    } catch (err: any) {
      alert(`Bulk move failed: ${err.message}`);
    }
  };

  const handleExportCSV = () => {
    const url = `http://localhost:8000/api/candidates/export${selectedJobId ? `?job_id=${selectedJobId}` : ''}`;
    window.open(url, '_blank');
  };

  const handleAddSkill = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      const norm = skillInput.trim().toLowerCase();
      if (!filters.skills.includes(norm)) {
        setFilter('skills', [...filters.skills, norm]);
      }
      setSkillInput('');
    }
  };

  const activeFilterCount =
    (filters.search ? 1 : 0) +
    (filters.stage !== 'all' ? 1 : 0) +
    (filters.minScore !== undefined ? 1 : 0) +
    (filters.cgpaMin !== undefined || filters.cgpaMax !== undefined ? 1 : 0) +
    (filters.expMin !== undefined || filters.expMax !== undefined ? 1 : 0) +
    (filters.skills?.length > 0 ? 1 : 0) +
    (filters.location ? 1 : 0) +
    (filters.tenthMin !== undefined || filters.tenthMax !== undefined ? 1 : 0) +
    (filters.twelfthMin !== undefined || filters.twelfthMax !== undefined ? 1 : 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-display">
            Candidate Directory
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Displaying <span className="font-mono text-foreground font-semibold">{total}</span> qualified applicants
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowFiltersDrawer(!showFiltersDrawer)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold hairline-border transition-colors cursor-pointer ${
              activeFilterCount > 0
                ? 'bg-[#C6FF3D]/10 text-[#C6FF3D] border-[#C6FF3D]/30'
                : 'bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-foreground'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Smart Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#C6FF3D] text-[#0B0B0A] text-[10px] font-mono font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] hairline-border text-foreground text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-foreground-muted" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Search Bar & Active Filters */}
      <div className="p-4 rounded-2xl bg-[var(--surface-1)] hairline-border space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
            <input
              type="text"
              placeholder="Search by candidate name, email, skills, summary or location..."
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-[#C6FF3D] text-foreground placeholder:text-foreground-muted"
            />
          </div>

          {/* Quick Stage Dropdown */}
          <select
            value={filters.stage}
            onChange={(e) => setFilter('stage', e.target.value)}
            className="text-xs bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-foreground focus:outline-none font-mono"
          >
            <option value="all">All Stages</option>
            <option value="Applied">Applied</option>
            <option value="Shortlisted">Shortlisted</option>
            <option value="Interview">Interview</option>
            <option value="Offer">Offer</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        {/* Active Filter Chips Bar */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
            <span className="text-[11px] font-mono uppercase text-foreground-muted">Active:</span>

            {filters.search && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-xs font-mono">
                Search: {filters.search}
                <X className="w-3 h-3 cursor-pointer hover:text-red-400" onClick={() => setFilter('search', '')} />
              </span>
            )}

            {filters.stage !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-xs font-mono">
                Stage: {filters.stage}
                <X className="w-3 h-3 cursor-pointer hover:text-red-400" onClick={() => setFilter('stage', 'all')} />
              </span>
            )}

            {filters.minScore !== undefined && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-xs font-mono">
                Score ≥ {filters.minScore}%
                <X className="w-3 h-3 cursor-pointer hover:text-red-400" onClick={() => setFilter('minScore', undefined)} />
              </span>
            )}

            {filters.cgpaMin !== undefined && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-xs font-mono">
                CGPA ≥ {filters.cgpaMin}
                <X className="w-3 h-3 cursor-pointer hover:text-red-400" onClick={() => setFilter('cgpaMin', undefined)} />
              </span>
            )}

            {filters.expMin !== undefined && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-xs font-mono">
                Exp ≥ {filters.expMin} yrs
                <X className="w-3 h-3 cursor-pointer hover:text-red-400" onClick={() => setFilter('expMin', undefined)} />
              </span>
            )}

            {filters.skills.map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-xs font-mono text-[#C6FF3D]">
                Skill: {s}
                <X className="w-3 h-3 cursor-pointer hover:text-red-400" onClick={() => setFilter('skills', filters.skills.filter((sk) => sk !== s))} />
              </span>
            ))}

            <button
              onClick={clearFilters}
              className="text-xs text-[#FF5B2E] hover:underline font-mono ml-2 cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Expanded Smart Filters Panel */}
      <AnimatePresence>
        {showFiltersDrawer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden p-6 rounded-2xl bg-[var(--surface-1)] hairline-border space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-foreground font-semibold flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#C6FF3D]" />
                Fine-Grained Server-Side Smart Filters
              </h3>
              <button
                onClick={clearFilters}
                className="text-xs text-foreground-muted hover:text-foreground font-mono"
              >
                Reset All
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* CGPA Range */}
              <div className="space-y-1.5">
                <label className="text-foreground-muted font-mono uppercase text-[10px]">
                  CGPA Range (0 - 10)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Min"
                    value={filters.cgpaMin ?? ''}
                    onChange={(e) => setFilter('cgpaMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-2 text-xs font-mono"
                  />
                  <span>-</span>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Max"
                    value={filters.cgpaMax ?? ''}
                    onChange={(e) => setFilter('cgpaMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-2 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Experience Range */}
              <div className="space-y-1.5">
                <label className="text-foreground-muted font-mono uppercase text-[10px]">
                  Work Experience (Years)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Min"
                    value={filters.expMin ?? ''}
                    onChange={(e) => setFilter('expMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-2 text-xs font-mono"
                  />
                  <span>-</span>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Max"
                    value={filters.expMax ?? ''}
                    onChange={(e) => setFilter('expMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-2 text-xs font-mono"
                  />
                </div>
              </div>

              {/* 10th & 12th Percentage */}
              <div className="space-y-1.5">
                <label className="text-foreground-muted font-mono uppercase text-[10px]">
                  Class 10th / 12th Min %
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="10th %"
                    value={filters.tenthMin ?? ''}
                    onChange={(e) => setFilter('tenthMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-2 text-xs font-mono"
                  />
                  <input
                    type="number"
                    placeholder="12th %"
                    value={filters.twelfthMin ?? ''}
                    onChange={(e) => setFilter('twelfthMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-2 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Min Match Score */}
              <div className="space-y-1.5">
                <label className="text-foreground-muted font-mono uppercase text-[10px]">
                  Min AI Match Score: {filters.minScore ?? 0}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="95"
                  value={filters.minScore ?? 0}
                  onChange={(e) => setFilter('minScore', e.target.value === '0' ? undefined : Number(e.target.value))}
                  className="w-full accent-[#C6FF3D] cursor-pointer"
                />
              </div>

              {/* Multi-select Skills with AND/OR toggle */}
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-foreground-muted font-mono uppercase text-[10px]">
                    Technologies (Press Enter to Add)
                  </label>
                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    <button
                      onClick={() => setFilter('skillMode', 'OR')}
                      className={`px-1.5 py-0.5 rounded ${
                        filters.skillMode === 'OR' ? 'bg-[#C6FF3D] text-[#0B0B0A] font-bold' : 'text-foreground-muted'
                      }`}
                    >
                      OR
                    </button>
                    <button
                      onClick={() => setFilter('skillMode', 'AND')}
                      className={`px-1.5 py-0.5 rounded ${
                        filters.skillMode === 'AND' ? 'bg-[#C6FF3D] text-[#0B0B0A] font-bold' : 'text-foreground-muted'
                      }`}
                    >
                      AND
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="e.g. react, python, docker..."
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleAddSkill}
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-2 text-xs font-mono"
                />
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-foreground-muted font-mono uppercase text-[10px]">
                  Candidate Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bangalore, Remote, SF..."
                  value={filters.location}
                  onChange={(e) => setFilter('location', e.target.value)}
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-2 text-xs"
                />
              </div>

              {/* Graduation Year */}
              <div className="space-y-1.5">
                <label className="text-foreground-muted font-mono uppercase text-[10px]">
                  Graduation Year Range
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="From"
                    value={filters.gradYearMin ?? ''}
                    onChange={(e) => setFilter('gradYearMin', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-2 text-xs font-mono"
                  />
                  <span>-</span>
                  <input
                    type="number"
                    placeholder="To"
                    value={filters.gradYearMax ?? ''}
                    onChange={(e) => setFilter('gradYearMax', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-2 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Action Bar (when rows are selected) */}
      {selectedCandidates.length > 0 && (
        <div className="p-3.5 rounded-xl bg-[var(--surface-2)] border border-[#C6FF3D]/30 flex items-center justify-between gap-4 text-xs animate-in fade-in">
          <div className="flex items-center gap-2 font-mono">
            <span className="font-bold text-[#C6FF3D]">{selectedCandidates.length}</span>
            <span>candidates selected</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-foreground-muted">Move to stage:</span>
              <select
                value={bulkStage}
                onChange={(e) => setBulkStage(e.target.value)}
                className="bg-[var(--surface-1)] border border-[var(--border)] rounded-lg px-2.5 py-1 text-xs text-foreground font-mono"
              >
                <option value="">Select Stage...</option>
                <option value="Shortlisted">Shortlisted</option>
                <option value="Interview">Interview</option>
                <option value="Offer">Offer</option>
                <option value="Rejected">Rejected</option>
              </select>
              <button
                disabled={!bulkStage}
                onClick={handleBulkMove}
                className="px-3 py-1 rounded-lg bg-[#C6FF3D] text-[#0B0B0A] font-semibold hover:bg-[#D4FF66] disabled:opacity-40"
              >
                Apply Stage
              </button>
            </div>

            {selectedCandidates.length >= 2 && selectedCandidates.length <= 4 && (
              <button
                onClick={() => {
                  useAppStore.setState({ compareCandidateIds: selectedCandidates });
                  setShowComparison(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--surface-3)] hover:bg-[var(--surface-1)] text-[#C6FF3D] border border-[#C6FF3D]/30 font-semibold"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Compare Side-by-Side</span>
              </button>
            )}

            <button
              onClick={() => setSelectedCandidates([])}
              className="text-foreground-muted hover:text-foreground underline ml-2"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Candidate Table */}
      <div className="rounded-2xl bg-[var(--surface-1)] hairline-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/60 text-foreground-muted font-mono uppercase text-[11px]">
                <th className="py-3 px-4 w-10 text-center">
                  <button onClick={handleSelectAll} className="cursor-pointer">
                    {selectedCandidates.length > 0 && selectedCandidates.length === candidates.length ? (
                      <CheckSquare className="w-4 h-4 text-[#C6FF3D]" />
                    ) : (
                      <Square className="w-4 h-4 text-foreground-muted" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3 w-12 text-center">Rank</th>
                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:text-foreground"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Candidate</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('match_score')}
                  className="py-3 px-4 cursor-pointer hover:text-foreground"
                >
                  <div className="flex items-center gap-1.5 text-[#C6FF3D]">
                    <Zap className="w-3 h-3" />
                    <span>Match Score</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('experience')}
                  className="py-3 px-4 cursor-pointer hover:text-foreground"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Experience</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('cgpa')}
                  className="py-3 px-4 cursor-pointer hover:text-foreground"
                >
                  <div className="flex items-center gap-1.5">
                    <span>CGPA</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Canonical Skills</th>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4 text-center">Compare</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-xs text-foreground-muted animate-pulse font-mono">
                    Loading candidates telemetry...
                  </td>
                </tr>
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-xs text-foreground-muted">
                    No candidates found matching your criteria. Try adjusting filters or upload resumes.
                  </td>
                </tr>
              ) : (
                candidates.map((cand, idx) => {
                  const isSelected = selectedCandidates.includes(cand.id);
                  const isCompared = compareCandidateIds.includes(cand.id);
                  const score = cand.match_score?.total_score ?? 0;
                  const rankNum = (filters.page - 1) * filters.perPage + idx + 1;

                  return (
                    <tr
                      key={cand.id}
                      onClick={() => setSelectedCandidateId(cand.id)}
                      className={`hover:bg-[var(--surface-2)]/60 cursor-pointer transition-colors group ${
                        isSelected ? 'bg-[var(--surface-2)]/80' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button onClick={(e) => handleToggleSelect(cand.id, e)} className="cursor-pointer">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#C6FF3D]" />
                          ) : (
                            <Square className="w-4 h-4 text-foreground-muted group-hover:text-foreground" />
                          )}
                        </button>
                      </td>

                      {/* Rank Number */}
                      <td className="py-3 px-3 text-center font-mono text-[11px] text-foreground-muted">
                        #{rankNum}
                      </td>

                      {/* Name & Contact */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground group-hover:text-[#C6FF3D] transition-colors">
                          {cand.name}
                        </div>
                        <div className="text-[11px] text-foreground-muted flex items-center gap-1.5 mt-0.5">
                          <span>{cand.location || 'Remote'}</span>
                          {cand.is_manually_corrected && (
                            <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1 rounded">
                              Edited
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Score Badge */}
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] font-mono text-xs font-bold text-[#C6FF3D]">
                          <Zap className="w-3 h-3 text-[#C6FF3D]" />
                          <span>{score.toFixed(0)}%</span>
                        </div>
                      </td>

                      {/* Experience */}
                      <td className="py-3 px-4 font-mono text-foreground">
                        {cand.total_experience_years} yrs
                      </td>

                      {/* CGPA */}
                      <td className="py-3 px-4 font-mono font-medium text-foreground">
                        {cand.cgpa ? `${cand.cgpa}` : '--'}
                      </td>

                      {/* Skills Tags */}
                      <td className="py-3 px-4 max-w-xs truncate">
                        <div className="flex items-center gap-1 truncate font-mono text-[11px]">
                          {cand.skills?.slice(0, 3).map((s) => (
                            <span key={s} className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-foreground-muted border border-[var(--border)]">
                              {s}
                            </span>
                          ))}
                          {cand.skills?.length > 3 && (
                            <span className="text-foreground-muted font-mono text-[10px]">
                              +{cand.skills.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stage */}
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)]">
                          {cand.current_stage}
                        </span>
                      </td>

                      {/* Compare Toggle */}
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            toggleCompareCandidate(cand.id);
                            if (compareCandidateIds.length >= 1) {
                              setShowComparison(true);
                            }
                          }}
                          title="Add to side-by-side comparison"
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isCompared
                              ? 'bg-[#C6FF3D] text-[#0B0B0A] border-[#C6FF3D]'
                              : 'bg-[var(--surface-2)] text-foreground-muted hover:text-foreground border-[var(--border)]'
                          }`}
                        >
                          <Trophy className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-[var(--border)] flex items-center justify-between text-xs text-foreground-muted font-mono">
          <div>
            Page {filters.page} of {totalPages} ({total} applicants)
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={filters.page <= 1}
              onClick={() => setFilter('page', filters.page - 1)}
              className="p-1.5 rounded-lg bg-[var(--surface-2)] disabled:opacity-40 hover:bg-[var(--surface-3)]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={filters.page >= totalPages}
              onClick={() => setFilter('page', filters.page + 1)}
              className="p-1.5 rounded-lg bg-[var(--surface-2)] disabled:opacity-40 hover:bg-[var(--surface-3)]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Candidate Profile Drawer */}
      <CandidateDrawer
        candidateId={selectedCandidateId}
        jobId={selectedJobId}
        onClose={() => setSelectedCandidateId(null)}
        onUpdated={fetchCandidates}
      />

      {/* Side-by-Side Comparison Modal */}
      {showComparison && (
        <CandidateComparisonModal
          candidateIds={compareCandidateIds}
          jobId={selectedJobId}
          onClose={() => setShowComparison(false)}
        />
      )}
    </div>
  );
}
