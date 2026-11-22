'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { apiRequest } from '@/lib/api';
import {
  Users, UserCheck, Calendar, Trophy, Zap, Clock,
  ArrowUpRight, BarChart3, TrendingUp, Sparkles, ChevronRight, UploadCloud
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area, Cell
} from 'recharts';
import Link from 'next/link';

export default function DashboardOverviewPage() {
  const { selectedJobId, jobs, setUploadModalOpen } = useAppStore();
  const [analytics, setAnalytics] = useState<any>(null);
  const [skillData, setSkillData] = useState<any[]>([]);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const query = selectedJobId ? `?job_id=${selectedJobId}` : '';
        const [overviewRes, skillsRes, timelineRes] = await Promise.all([
          apiRequest(`/analytics/overview${query}`),
          apiRequest('/analytics/skills-demand-supply'),
          apiRequest('/analytics/uploads-timeline'),
        ]);
        setAnalytics(overviewRes);
        setSkillData(skillsRes || []);
        setTimelineData(timelineRes || []);
      } catch (err) {
        console.error('Error loading analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedJobId]);

  const activeJob = jobs.find((j) => j.id === selectedJobId);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Title & Context bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#C6FF3D] uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-[#C6FF3D] animate-ping" />
            Recruiter Mission Control
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-display">
            Talent Pipeline Overview
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Real-time candidate match telemetry for{' '}
            <span className="text-foreground font-medium font-mono">
              {activeJob ? activeJob.title : 'All Active Openings'}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C6FF3D] text-[#0B0B0A] text-xs font-semibold hover:bg-[#D4FF66] transition-all shadow-sm cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Process New Resumes</span>
          </button>
        </div>
      </div>

      {/* 6 Bento KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          {
            label: 'Total Candidates',
            value: analytics?.total_candidates ?? '--',
            icon: Users,
            color: 'text-foreground',
            sub: 'Across all stages',
          },
          {
            label: 'Shortlisted',
            value: analytics?.shortlisted ?? '--',
            icon: UserCheck,
            color: 'text-[#38BDF8]',
            sub: 'Passed initial scan',
          },
          {
            label: 'In Interview',
            value: analytics?.interviews ?? '--',
            icon: Calendar,
            color: 'text-[#FBBF24]',
            sub: 'Active technical rounds',
          },
          {
            label: 'Offers Extended',
            value: analytics?.offers ?? '--',
            icon: Trophy,
            color: 'text-[#4ADE80]',
            sub: 'Final hiring target',
          },
          {
            label: 'Avg Match Score',
            value: analytics?.avg_match_score ? `${analytics.avg_match_score}%` : '--',
            icon: Zap,
            color: 'text-[#C6FF3D]',
            sub: 'Hybrid AI model',
          },
          {
            label: 'Avg Stage Time',
            value: analytics?.avg_time_in_stage_days ? `${analytics.avg_time_in_stage_days}d` : '--',
            icon: Clock,
            color: 'text-[#FF5B2E]',
            sub: 'Velocity in pipeline',
          },
        ].map((kpi, idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-[var(--surface-1)] hairline-border flex flex-col justify-between hover:border-[var(--border-strong)] transition-all group"
          >
            <div className="flex items-center justify-between text-foreground-muted mb-2">
              <span className="text-[11px] font-medium uppercase tracking-wider">{kpi.label}</span>
              <kpi.icon className={`w-4 h-4 ${kpi.color} opacity-80 group-hover:scale-110 transition-transform`} />
            </div>
            <div>
              <div className={`text-2xl font-bold font-mono tracking-tight ${kpi.color}`}>
                {kpi.value}
              </div>
              <div className="text-[10px] text-foreground-muted mt-0.5 truncate">{kpi.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Funnel Chart & Skills Supply/Demand */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hiring Funnel Card */}
        <div className="p-6 rounded-2xl bg-[var(--surface-1)] hairline-border flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#C6FF3D]" />
                Conversion Pipeline Funnel
              </h3>
              <p className="text-xs text-foreground-muted">Progressive stage yield and volume conversion</p>
            </div>
            <Link
              href="/dashboard/pipeline"
              className="text-xs font-mono text-[#C6FF3D] hover:underline flex items-center gap-1"
            >
              View Kanban <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics?.funnel || []}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <XAxis type="number" stroke="var(--foreground-muted)" fontSize={11} />
                <YAxis dataKey="stage" type="category" stroke="var(--foreground-muted)" fontSize={11} width={85} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-1)',
                    borderColor: 'var(--border)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {analytics?.funnel?.map((entry: any, index: number) => {
                    const colors = ['#8E8E88', '#38BDF8', '#FBBF24', '#4ADE80', '#F87171'];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Skills Demand vs Supply */}
        <div className="p-6 rounded-2xl bg-[var(--surface-1)] hairline-border flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#FF5B2E]" />
                Skills Market: Required vs Candidate Pool
              </h3>
              <p className="text-xs text-foreground-muted">
                Weighted JD demand compared to candidate skills supply
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={skillData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <XAxis dataKey="skill" stroke="var(--foreground-muted)" fontSize={11} angle={-30} textAnchor="end" />
                <YAxis stroke="var(--foreground-muted)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-1)',
                    borderColor: 'var(--border)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="demand_count" name="JD Demand" fill="#FF5B2E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="supply_count" name="Candidate Supply" fill="#C6FF3D" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Second Row: Uploads Velocity Timeline & Top Candidates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Uploads Velocity Timeline */}
        <div className="p-6 rounded-2xl bg-[var(--surface-1)] hairline-border space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#38BDF8]" />
              Resume Ingestion Activity (14 Days)
            </h3>
            <p className="text-xs text-foreground-muted">Daily volume of processed candidate resumes</p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="uploadGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C6FF3D" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#C6FF3D" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="var(--foreground-muted)" fontSize={10} />
                <YAxis stroke="var(--foreground-muted)" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-1)',
                    borderColor: 'var(--border)',
                    borderRadius: '12px',
                    fontSize: '11px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="uploads"
                  stroke="#C6FF3D"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#uploadGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Matched Candidates Leaderboard */}
        <div className="p-6 rounded-2xl bg-[var(--surface-1)] hairline-border space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#C6FF3D]" />
                Top Candidates Leaderboard
              </h3>
              <p className="text-xs text-foreground-muted">
                Ranked by hybrid AI semantic & criteria match score
              </p>
            </div>
            <Link
              href="/dashboard/candidates"
              className="text-xs font-mono text-[#C6FF3D] hover:underline flex items-center gap-1"
            >
              All Candidates <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {analytics?.top_candidates?.map((cand: any, idx: number) => (
              <div
                key={cand.id}
                className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)]/70 hover:bg-[var(--surface-2)] border border-[var(--border)] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[var(--surface-3)] font-mono text-xs font-bold text-foreground-muted flex items-center justify-center">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground group-hover:text-[#C6FF3D] transition-colors">
                      {cand.name}
                    </div>
                    <div className="text-[11px] text-foreground-muted flex items-center gap-2 mt-0.5">
                      <span>{cand.experience} yrs exp</span>
                      <span>•</span>
                      <span className="font-mono">{cand.skills.join(', ')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-[var(--border)] text-foreground-muted">
                    {cand.stage}
                  </span>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-3)] font-mono text-xs font-bold text-[#C6FF3D]">
                    <Zap className="w-3 h-3" />
                    <span>{cand.score}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
