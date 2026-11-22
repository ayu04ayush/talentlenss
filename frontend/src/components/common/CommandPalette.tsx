'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { apiRequest } from '@/lib/api';
import {
  Search, Users, Briefcase, GitPullRequest, Mail, Copy,
  UploadCloud, Sparkles, Sun, Moon, ArrowRight, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CommandPalette() {
  const router = useRouter();
  const {
    isCommandPaletteOpen, setCommandPaletteOpen,
    setUploadModalOpen, toggleTheme, theme,
    setSelectedCandidateId, clearFilters
  } = useAppStore();

  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  // Search candidates debounced
  useEffect(() => {
    if (!query.trim()) {
      setCandidates([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiRequest(`/candidates?search=${encodeURIComponent(query)}&per_page=5`);
        setCandidates(res.items || []);
      } catch (err) {
        console.error('Command palette search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectNav = (path: string) => {
    setCommandPaletteOpen(false);
    setQuery('');
    router.push(path);
  };

  const handleSelectCandidate = (candId: number) => {
    setCommandPaletteOpen(false);
    setQuery('');
    setSelectedCandidateId(candId);
    router.push('/dashboard/candidates');
  };

  const handleSeedData = async () => {
    setCommandPaletteOpen(false);
    try {
      await apiRequest('/seed/sample-data', { method: 'POST' });
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  if (!isCommandPaletteOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-xl bg-[var(--surface-1)] border border-[var(--border-strong)] rounded-2xl shadow-2xl overflow-hidden text-foreground"
        >
          {/* Search bar */}
          <div className="flex items-center px-4 py-3.5 border-b border-[var(--border)] gap-3">
            <Search className="w-5 h-5 text-foreground-muted shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Search candidates, skills, or navigate anywhere..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm focus:outline-none placeholder:text-foreground-muted"
            />
            <span className="text-[10px] font-mono uppercase bg-[var(--surface-2)] text-foreground-muted px-2 py-0.5 rounded border border-[var(--border)]">
              ESC
            </span>
            <button
              onClick={() => setCommandPaletteOpen(false)}
              className="text-foreground-muted hover:text-foreground p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto p-2 space-y-4">
            {/* Candidate search results */}
            {query.trim() && (
              <div>
                <div className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-foreground-muted">
                  Candidates Matching &ldquo;{query}&rdquo;
                </div>
                {isSearching ? (
                  <div className="px-3 py-4 text-xs text-foreground-muted text-center animate-pulse">
                    Searching candidates database...
                  </div>
                ) : candidates.length > 0 ? (
                  <div className="space-y-1">
                    {candidates.map((cand) => (
                      <button
                        key={cand.id}
                        onClick={() => handleSelectCandidate(cand.id)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[var(--surface-2)] transition-colors text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-[var(--surface-3)] flex items-center justify-center text-xs font-mono font-bold text-[#C6FF3D]">
                            {cand.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-medium text-foreground group-hover:text-[#C6FF3D] transition-colors">
                              {cand.name}
                            </div>
                            <div className="text-[11px] text-foreground-muted flex items-center gap-2">
                              <span>{cand.location || 'Remote'}</span>
                              <span>•</span>
                              <span>{cand.total_experience_years} yrs exp</span>
                              {cand.cgpa && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono">{cand.cgpa} CGPA</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--border)] font-mono">
                            {cand.current_stage}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-foreground-muted" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-3 text-xs text-foreground-muted text-center">
                    No candidates found matching &ldquo;{query}&rdquo;
                  </div>
                )}
              </div>
            )}

            {/* Navigation links */}
            <div>
              <div className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-foreground-muted">
                Quick Navigation
              </div>
              <div className="space-y-0.5">
                {[
                  { name: 'Dashboard Overview', path: '/dashboard', icon: Briefcase },
                  { name: 'Candidates Directory', path: '/dashboard/candidates', icon: Users },
                  { name: 'Hiring Pipeline (Kanban)', path: '/dashboard/pipeline', icon: GitPullRequest },
                  { name: 'Job Descriptions & Extraction', path: '/dashboard/jobs', icon: Briefcase },
                  { name: 'Bulk Email Campaigns', path: '/dashboard/emails', icon: Mail },
                  { name: 'Duplicate Detection Matrix', path: '/dashboard/duplicates', icon: Copy },
                ].map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleSelectNav(item.path)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--surface-2)] transition-colors text-left text-xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon className="w-4 h-4 text-foreground-muted group-hover:text-[#C6FF3D] transition-colors" />
                      <span>{item.name}</span>
                    </div>
                    <span className="text-[11px] font-mono text-foreground-muted opacity-0 group-hover:opacity-100 transition-opacity">
                      Go
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <div className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-foreground-muted">
                System Actions
              </div>
              <div className="space-y-0.5">
                <button
                  onClick={() => {
                    setCommandPaletteOpen(false);
                    setUploadModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--surface-2)] transition-colors text-left text-xs group"
                >
                  <div className="flex items-center gap-2.5">
                    <UploadCloud className="w-4 h-4 text-[#C6FF3D]" />
                    <span className="font-medium text-[#C6FF3D]">Bulk Upload Resumes (PDF / DOCX)</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-[var(--surface-3)] px-1.5 py-0.5 rounded text-foreground-muted">
                    Upload
                  </span>
                </button>

                <button
                  onClick={handleSeedData}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--surface-2)] transition-colors text-left text-xs group"
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-[#FF5B2E]" />
                    <span>Re-seed Demo Data (40 Candidates + 2 JDs)</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-[var(--surface-3)] px-1.5 py-0.5 rounded text-foreground-muted">
                    Seed
                  </span>
                </button>

                <button
                  onClick={() => {
                    toggleTheme();
                    setCommandPaletteOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--surface-2)] transition-colors text-left text-xs group"
                >
                  <div className="flex items-center gap-2.5">
                    {theme === 'dark' ? <Sun className="w-4 h-4 text-[#C6FF3D]" /> : <Moon className="w-4 h-4 text-[#FF5B2E]" />}
                    <span>Toggle {theme === 'dark' ? 'Light' : 'Dark'} Theme</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-[var(--surface-3)] px-1.5 py-0.5 rounded text-foreground-muted">
                    Theme
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="px-4 py-2 bg-[var(--surface-2)] border-t border-[var(--border)] text-[11px] text-foreground-muted flex items-center justify-between font-mono">
            <span>Tip: Press &ldquo;Ctrl+K&rdquo; or &ldquo;⌘K&rdquo; anywhere</span>
            <span>TalentLens v1.0</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
