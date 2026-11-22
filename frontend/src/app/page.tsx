'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '@/components/layout/ThemeToggle';
import {
  UploadCloud, Zap, Target, GitPullRequest, ArrowRight,
  ShieldCheck, Check, Sparkles, Filter, ChevronRight, Layers,
  Terminal, Search
} from 'lucide-react';

const SKILLS_MARQUEE = [
  'Python', 'FastAPI', 'React', 'TypeScript', 'Next.js', 'PostgreSQL',
  'PyTorch', 'Docker', 'Kubernetes', 'Machine Learning', 'GraphQL',
  'Redis', 'AWS', 'Tailwind CSS', 'Go', 'Distributed Systems'
];

export default function LandingPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [demoScore, setDemoScore] = useState(88);
  const [scanActive, setScanActive] = useState(true);

  // Interactive Mini Filter Demo State
  const [minExpFilter, setMinExpFilter] = useState(3);
  const [selectedSkillFilter, setSelectedSkillFilter] = useState('react');

  // Animated loop for scanning line
  useEffect(() => {
    const timer = setInterval(() => {
      setDemoScore((prev) => (prev >= 96 ? 78 : prev + 3));
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  const MINI_DEMO_CANDIDATES = [
    { name: 'Arjun Singhania', role: 'Full-Stack Engineer', exp: 4.5, skills: ['react', 'python', 'fastapi'], score: 94 },
    { name: 'Priya Patel', role: 'AI / ML Engineer', exp: 3.5, skills: ['python', 'pytorch', 'ml'], score: 91 },
    { name: 'Marcus Vance', role: 'Platform Engineer', exp: 6.0, skills: ['kubernetes', 'docker', 'go'], score: 86 },
    { name: 'Sneha Reddy', role: 'Frontend Architect', exp: 5.0, skills: ['react', 'typescript', 'next.js'], score: 96 },
  ];

  const filteredDemoCandidates = MINI_DEMO_CANDIDATES.filter(
    (c) => c.exp >= minExpFilter && (selectedSkillFilter === 'all' || c.skills.includes(selectedSkillFilter))
  );

  return (
    <div className="min-h-screen bg-[var(--background)] text-foreground bg-noise relative selection:bg-[#C6FF3D] selection:text-[#0B0B0A] overflow-x-hidden">
      {/* Top Editorial Navigation */}
      <header className="h-20 px-8 max-w-7xl mx-auto flex items-center justify-between relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C6FF3D] to-[#8BC34A] flex items-center justify-center text-[#0B0B0A] font-bold text-sm shadow-md">
            TL
          </div>
          <span className="font-bold font-display text-lg tracking-tight text-foreground">
            TalentLens
          </span>
          <span className="hidden sm:inline-block font-mono text-[9px] uppercase tracking-widest text-[#C6FF3D] bg-[var(--surface-2)] px-2 py-0.5 rounded hairline-border">
            Recruitment AI
          </span>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-xs font-semibold px-4 py-2 rounded-xl text-foreground-muted hover:text-foreground transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/login"
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-[#C6FF3D] text-[#0B0B0A] hover:bg-[#D4FF66] transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <span>Launch Console</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-24 px-8 max-w-7xl mx-auto relative z-10 space-y-16">
        <div className="max-w-4xl space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--surface-2)] hairline-border text-xs font-mono text-foreground-muted"
          >
            <span className="w-2 h-2 rounded-full bg-[#C6FF3D] animate-pulse" />
            <span>Autonomous Ingestion • Zero-API-Key Deterministic Fallback</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl sm:text-7xl lg:text-8xl font-bold font-display tracking-tight text-foreground leading-[0.98]"
          >
            Editorial Precision.
            <br />
            <span className="italic font-serif font-normal text-foreground-muted">
              Mission Control
            </span>{' '}
            for Hiring.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base sm:text-lg text-foreground-muted max-w-2xl leading-relaxed"
          >
            Process hundreds of resumes in seconds without losing elite engineering talent.
            Structured schema parsing, hybrid semantic similarity matching, and pipeline telemetry built for modern technical hiring.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-center gap-4 pt-2 flex-wrap"
          >
            <Link
              href="/login"
              className="px-6 py-3.5 rounded-xl bg-[#C6FF3D] text-[#0B0B0A] text-xs font-bold hover:bg-[#D4FF66] transition-all shadow-lg shadow-[#C6FF3D]/10 flex items-center gap-2"
            >
              <span>Explore Live Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#interactive-demo"
              className="px-6 py-3.5 rounded-xl bg-[var(--surface-2)] text-foreground text-xs font-semibold hover:bg-[var(--surface-3)] hairline-border transition-colors flex items-center gap-2"
            >
              <span>Interactive Telemetry Demo</span>
            </a>
          </motion.div>
        </div>

        {/* Live Animated Laser Scanning & Ranking Demo */}
        <div className="relative rounded-3xl bg-[var(--surface-1)] border border-[var(--border-strong)] p-6 sm:p-8 shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#C6FF3D]/5 rounded-full blur-3xl pointer-events-none" />

          {/* Demo Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-xs font-mono text-foreground-muted pl-2 border-l border-[var(--border)]">
                TalentLens Real-Time Neural Matcher
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-[#C6FF3D]">
              <span className="w-2 h-2 rounded-full bg-[#C6FF3D] animate-ping" />
              <span>LIVE SCORING</span>
            </div>
          </div>

          {/* Interactive Visual Canvas */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: The Scanning Resume Card */}
            <div className="lg:col-span-5 relative">
              <div className="p-6 rounded-2xl bg-[var(--surface-2)] hairline-border shadow-xl relative overflow-hidden space-y-4">
                {/* Laser Scanning Line Animation */}
                <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#C6FF3D] to-transparent shadow-[0_0_15px_#C6FF3D] animate-scan z-20 pointer-events-none" />

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[var(--surface-3)] text-foreground-muted">
                    PDF Parsing • 100% Extracted
                  </span>
                  <span className="font-mono text-xs font-bold text-[#C6FF3D]">
                    {demoScore}% Match
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-foreground">Arjun Singhania</h3>
                  <div className="text-xs text-foreground-muted font-mono mt-0.5">
                    Bangalore, India • 4.5 Yrs Exp
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-foreground/80 leading-relaxed bg-[var(--surface-1)] p-3 rounded-xl border border-[var(--border)]">
                  <div className="text-[10px] font-mono uppercase text-foreground-muted">Structured Summary:</div>
                  <p>Senior Full-Stack Engineer with specialization in Next.js App Router, Python FastAPI, and PostgreSQL microservices.</p>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['python', 'fastapi', 'react', 'next.js', 'postgresql', 'docker'].map((s) => (
                    <span
                      key={s}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#C6FF3D]/10 text-[#C6FF3D] border border-[#C6FF3D]/20 font-medium"
                    >
                      ✓ {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Middle: Arrow Progression */}
            <div className="lg:col-span-2 hidden lg:flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--surface-2)] hairline-border flex items-center justify-center text-[#C6FF3D] shadow-md">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-foreground-muted text-center">
                Hybrid Score
              </span>
            </div>

            {/* Right: Real-time Leaderboard Rankings */}
            <div className="lg:col-span-5 space-y-2.5">
              <div className="text-xs font-mono uppercase text-foreground-muted tracking-wider flex items-center justify-between">
                <span>Ranked Candidate Stream</span>
                <span>Auto-Sorted</span>
              </div>

              {[
                { rank: '#1', name: 'Arjun Singhania', role: 'Full-Stack Lead', score: demoScore, status: 'Offer' },
                { rank: '#2', name: 'Sneha Reddy', role: 'Frontend Architect', score: 92, status: 'Interview' },
                { rank: '#3', name: 'Priya Patel', role: 'AI Systems Engineer', score: 89, status: 'Shortlisted' },
                { rank: '#4', name: 'Marcus Vance', role: 'DevOps Specialist', score: 84, status: 'Shortlisted' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between text-xs ${
                    idx === 0
                      ? 'bg-[var(--surface-2)] border-[#C6FF3D]/40 shadow-sm'
                      : 'bg-[var(--surface-2)]/40 border-[var(--border)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-foreground-muted w-6">
                      {item.rank}
                    </span>
                    <div>
                      <div className="font-semibold text-foreground">{item.name}</div>
                      <div className="text-[10px] text-foreground-muted font-mono">{item.role}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-[var(--border)] text-foreground-muted">
                      {item.status}
                    </span>
                    <span className="font-mono font-bold text-sm text-[#C6FF3D]">
                      {item.score}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Marquee Skills Ticker */}
      <section className="py-6 border-y border-[var(--border)] bg-[var(--surface-1)]/40 overflow-hidden relative">
        <div className="flex items-center gap-8 animate-marquee whitespace-nowrap">
          {[...SKILLS_MARQUEE, ...SKILLS_MARQUEE].map((skill, i) => (
            <div key={i} className="flex items-center gap-3 text-xs font-mono text-foreground-muted uppercase tracking-wider">
              <span className="text-[#C6FF3D]">✦</span>
              <span>{skill}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Mini Filter Demo */}
      <section id="interactive-demo" className="py-24 px-8 max-w-7xl mx-auto space-y-12">
        <div className="max-w-2xl space-y-3">
          <div className="text-xs font-mono text-[#C6FF3D] uppercase tracking-wider flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" /> Interactive Sandbox
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold font-display tracking-tight text-foreground">
            Smart Server-Side Query Engine.
          </h2>
          <p className="text-xs sm:text-sm text-foreground-muted leading-relaxed">
            Test the instant response speed of our smart multi-criteria filtering matrix. Zero lag, debounced queries.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-[var(--surface-1)] hairline-border space-y-6">
          {/* Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs border-b border-[var(--border)] pb-6">
            <div className="space-y-2">
              <div className="flex justify-between font-mono">
                <span className="text-foreground-muted uppercase text-[10px]">Min Work Experience:</span>
                <span className="font-bold text-[#C6FF3D]">{minExpFilter} Years</span>
              </div>
              <input
                type="range"
                min="1"
                max="6"
                step="0.5"
                value={minExpFilter}
                onChange={(e) => setMinExpFilter(Number(e.target.value))}
                className="w-full accent-[#C6FF3D] cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <span className="text-foreground-muted uppercase text-[10px] font-mono block">
                Required Core Technology:
              </span>
              <div className="flex flex-wrap gap-2">
                {['all', 'react', 'python', 'kubernetes', 'typescript'].map((sk) => (
                  <button
                    key={sk}
                    onClick={() => setSelectedSkillFilter(sk)}
                    className={`px-3 py-1 rounded-lg font-mono text-xs cursor-pointer transition-colors ${
                      selectedSkillFilter === sk
                        ? 'bg-[#C6FF3D] text-[#0B0B0A] font-bold'
                        : 'bg-[var(--surface-2)] text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    {sk.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Filtered Candidate Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredDemoCandidates.map((cand) => (
              <div
                key={cand.name}
                className="p-4 rounded-2xl bg-[var(--surface-2)]/60 hairline-border space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">{cand.name}</span>
                  <span className="font-mono text-[#C6FF3D] font-bold">{cand.score}%</span>
                </div>
                <div className="text-[11px] text-foreground-muted">{cand.role}</div>
                <div className="font-mono text-[11px] text-foreground-muted">{cand.exp} yrs experience</div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {cand.skills.map((s) => (
                    <span key={s} className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--surface-3)] text-foreground-muted">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Clean Call to Action */}
      <section className="py-24 px-8 max-w-5xl mx-auto text-center space-y-6">
        <h2 className="text-4xl sm:text-6xl font-bold font-display tracking-tight text-foreground">
          Transform Your Technical Recruitment.
        </h2>
        <p className="text-xs sm:text-sm text-foreground-muted max-w-lg mx-auto">
          Start reviewing applicants with deterministic parsing and precision hybrid matching today.
        </p>
        <div className="pt-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#C6FF3D] text-[#0B0B0A] text-sm font-bold hover:bg-[#D4FF66] transition-all shadow-xl shadow-[#C6FF3D]/10 cursor-pointer"
          >
            <span>Open TalentLens Platform</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="h-24 px-8 max-w-7xl mx-auto border-t border-[var(--border)] flex items-center justify-between text-xs text-foreground-muted font-mono">
        <div>
          TalentLens AI © 2026. Editorial precision meets mission control.
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="hover:text-foreground">Console</Link>
          <Link href="/login" className="hover:text-foreground">Documentation</Link>
        </div>
      </footer>
    </div>
  );
}
