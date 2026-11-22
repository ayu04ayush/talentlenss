'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { apiRequest } from '@/lib/api';
import ThemeToggle from './ThemeToggle';
import {
  Briefcase, Search, UploadCloud, Bell, Filter, ChevronDown, Sparkles
} from 'lucide-react';

export default function Header() {
  const {
    jobs, setJobs,
    selectedJobId, setSelectedJobId,
    setCommandPaletteOpen, setUploadModalOpen
  } = useAppStore();

  // Load jobs on mount
  useEffect(() => {
    apiRequest('/jobs')
      .then((data) => {
        setJobs(data || []);
        if (data?.length > 0 && selectedJobId === null) {
          setSelectedJobId(data[0].id);
        }
      })
      .catch((err) => console.error('Failed to load jobs in header:', err));
  }, [setJobs, setSelectedJobId, selectedJobId]);

  return (
    <header className="h-16 px-8 flex items-center justify-between bg-[var(--surface-1)] hairline-border-b sticky top-0 z-20 shrink-0">
      {/* Active Job Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--surface-2)] hairline-border">
          <Briefcase className="w-3.5 h-3.5 text-[#C6FF3D]" />
          <span className="text-xs text-foreground-muted font-medium">Job Opening:</span>
          <select
            value={selectedJobId || ''}
            onChange={(e) => setSelectedJobId(e.target.value ? Number(e.target.value) : null)}
            className="text-xs font-semibold bg-transparent text-foreground focus:outline-none cursor-pointer max-w-[280px] truncate"
          >
            <option value="" className="bg-[var(--surface-1)] text-foreground">
              All Active Positions
            </option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id} className="bg-[var(--surface-1)] text-foreground">
                {j.title} ({j.department || 'Engineering'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Center Command Palette Trigger */}
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="hidden md:flex items-center gap-3 px-4 py-1.5 rounded-xl bg-[var(--surface-2)]/70 hover:bg-[var(--surface-2)] hairline-border text-foreground-muted hover:text-foreground text-xs transition-colors cursor-pointer group"
      >
        <Search className="w-3.5 h-3.5 text-foreground-muted group-hover:text-[#C6FF3D] transition-colors" />
        <span>Type a command or search candidates...</span>
        <div className="flex items-center gap-1 font-mono text-[10px] bg-[var(--surface-3)] px-1.5 py-0.5 rounded text-foreground-muted border border-[var(--border)]">
          <span>⌘K</span>
        </div>
      </button>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setUploadModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] hairline-border text-xs text-foreground font-medium transition-colors"
        >
          <UploadCloud className="w-3.5 h-3.5 text-[#C6FF3D]" />
          <span>Upload</span>
        </button>

        <ThemeToggle />
      </div>
    </header>
  );
}
