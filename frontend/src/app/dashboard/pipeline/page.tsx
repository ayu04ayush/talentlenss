'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { apiRequest } from '@/lib/api';
import { Candidate, PipelineStage } from '@/lib/types';
import CandidateDrawer from '@/components/candidates/CandidateDrawer';
import {
  DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragStartEvent, DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import confetti from 'canvas-confetti';
import {
  Zap, Star, Calendar, MessageSquare, Clock, Trophy, MoreHorizontal, Plus
} from 'lucide-react';
import { motion } from 'framer-motion';

const STAGES: { id: PipelineStage; label: string; color: string; badge: string }[] = [
  { id: 'Applied', label: 'Applied', color: '#8E8E88', badge: 'bg-[#8E8E88]/10 text-[#8E8E88]' },
  { id: 'Shortlisted', label: 'Shortlisted', color: '#38BDF8', badge: 'bg-[#38BDF8]/10 text-[#38BDF8]' },
  { id: 'Interview', label: 'Interview', color: '#FBBF24', badge: 'bg-[#FBBF24]/10 text-[#FBBF24]' },
  { id: 'Offer', label: 'Offer', color: '#4ADE80', badge: 'bg-[#4ADE80]/10 text-[#4ADE80]' },
  { id: 'Rejected', label: 'Rejected', color: '#F87171', badge: 'bg-red-500/10 text-red-400' },
];

function KanbanCard({
  candidate,
  onClick,
}: {
  candidate: Candidate;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: candidate.id.toString(),
    data: { candidate },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const score = candidate.match_score?.total_score ?? 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`p-3.5 rounded-xl bg-[var(--surface-1)] border border-[var(--border)] shadow-sm hover:border-[var(--border-strong)] transition-all cursor-grab active:cursor-grabbing select-none group relative ${
        isDragging ? 'opacity-40 rotate-2 scale-105 shadow-xl' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-xs text-foreground group-hover:text-[#C6FF3D] transition-colors">
          {candidate.name}
        </h4>
        <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-[#C6FF3D] bg-[var(--surface-2)] px-1.5 py-0.5 rounded border border-[var(--border)] shrink-0">
          <Zap className="w-2.5 h-2.5" />
          <span>{score.toFixed(0)}%</span>
        </div>
      </div>

      <div className="text-[11px] text-foreground-muted flex items-center gap-2 mt-1">
        <span>{candidate.total_experience_years} yrs exp</span>
        <span>•</span>
        <span>{candidate.location || 'Remote'}</span>
      </div>

      {/* Skills Pill */}
      {candidate.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {candidate.skills.slice(0, 3).map((s) => (
            <span
              key={s}
              className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--surface-2)] border border-[var(--border)] text-foreground-muted"
            >
              {s}
            </span>
          ))}
          {candidate.skills.length > 3 && (
            <span className="text-[9px] font-mono text-foreground-muted self-center">
              +{candidate.skills.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer Info: Rating & Interview Date */}
      <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[var(--border)] text-[10px] text-foreground-muted font-mono">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((st) => (
            <Star
              key={st}
              className={`w-2.5 h-2.5 ${
                st <= candidate.star_rating ? 'text-amber-400 fill-amber-400' : 'text-[var(--surface-3)]'
              }`}
            />
          ))}
        </div>

        {candidate.interview_date && (
          <span className="flex items-center gap-1 text-[#FBBF24]">
            <Calendar className="w-2.5 h-2.5" />
            <span>{new Date(candidate.interview_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
          </span>
        )}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const { selectedJobId, selectedCandidateId, setSelectedCandidateId } = useAppStore();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [funnelStats, setFunnelStats] = useState<any>(null);
  const [activeDragCand, setActiveDragCand] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const loadPipelineData = async () => {
    setLoading(true);
    try {
      const query = selectedJobId ? `?job_id=${selectedJobId}&per_page=150` : '?per_page=150';
      const [candsRes, funnelRes] = await Promise.all([
        apiRequest(`/candidates${query}`),
        apiRequest('/pipeline/funnel'),
      ]);
      setCandidates(candsRes.items || []);
      setFunnelStats(funnelRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPipelineData();
  }, [selectedJobId]);

  const handleDragStart = (event: DragStartEvent) => {
    const candId = Number(event.active.id);
    const cand = candidates.find((c) => c.id === candId);
    if (cand) setActiveDragCand(cand);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragCand(null);
    if (!over) return;

    const candId = Number(active.id);
    const targetStageOrCard = over.id.toString();

    // Check if target is a column stage or another card
    let targetStage: PipelineStage = 'Applied';
    const stageMatch = STAGES.find((s) => s.id === targetStageOrCard);
    if (stageMatch) {
      targetStage = stageMatch.id;
    } else {
      const overCand = candidates.find((c) => c.id.toString() === targetStageOrCard);
      if (overCand) targetStage = overCand.current_stage;
    }

    const currentCand = candidates.find((c) => c.id === candId);
    if (!currentCand || currentCand.current_stage === targetStage) return;

    // Optimistic UI update
    setCandidates((prev) =>
      prev.map((c) => (c.id === candId ? { ...c, current_stage: targetStage } : c))
    );

    // Subtle celebration confetti burst if candidate reaches "Offer" stage!
    if (targetStage === 'Offer') {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#C6FF3D', '#4ADE80', '#38BDF8'],
      });
    }

    try {
      await apiRequest('/pipeline/move', {
        method: 'POST',
        body: JSON.stringify({
          candidate_id: candId,
          to_stage: targetStage,
          notes: `Moved to ${targetStage} via Kanban drag-and-drop.`,
        }),
      });
      // Refresh funnel stats
      const fData = await apiRequest('/pipeline/funnel');
      setFunnelStats(fData);
    } catch (err: any) {
      alert(`Stage transition error: ${err.message}`);
      loadPipelineData();
    }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header & Stage Conversion Funnel Bar */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#C6FF3D] uppercase tracking-wider mb-1">
              Interactive Kanban Mission Control
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-display">
              Hiring Pipeline
            </h1>
            <p className="text-xs text-foreground-muted mt-1">
              Drag candidates across columns to advance their stage. Audit timeline recorded automatically.
            </p>
          </div>
        </div>

        {/* Pipeline Funnel Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 rounded-2xl bg-[var(--surface-1)] hairline-border">
          {funnelStats?.funnel?.map((f: any) => (
            <div key={f.stage} className="p-2.5 rounded-xl bg-[var(--surface-2)]/60 text-xs space-y-0.5">
              <div className="text-[11px] font-mono uppercase text-foreground-muted truncate">
                {f.stage}
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-base font-bold font-mono text-foreground">{f.count}</span>
                <span className="text-[10px] font-mono text-[#C6FF3D]">
                  {f.conversion_pct}% yield
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Kanban Board Columns with Drag and Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start min-h-[650px]">
          {STAGES.map((col) => {
            const colCandidates = candidates.filter((c) => c.current_stage === col.id);

            return (
              <div
                key={col.id}
                id={col.id}
                className="flex flex-col rounded-2xl bg-[var(--surface-2)]/30 border border-[var(--border)] overflow-hidden min-h-[550px]"
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-[var(--border)] bg-[var(--surface-1)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: col.color }}
                    />
                    <h3 className="font-semibold text-xs text-foreground">{col.label}</h3>
                  </div>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-[var(--surface-3)] text-foreground-muted font-bold">
                    {colCandidates.length}
                  </span>
                </div>

                {/* Cards Container */}
                <SortableContext
                  id={col.id}
                  items={colCandidates.map((c) => c.id.toString())}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="p-2.5 space-y-2.5 flex-1 overflow-y-auto">
                    {colCandidates.map((cand) => (
                      <KanbanCard
                        key={cand.id}
                        candidate={cand}
                        onClick={() => setSelectedCandidateId(cand.id)}
                      />
                    ))}

                    {colCandidates.length === 0 && (
                      <div className="py-16 text-center text-[11px] text-foreground-muted font-mono border border-dashed border-[var(--border)] rounded-xl m-1">
                        Drop candidate here
                      </div>
                    )}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>

        {/* Drag Overlay with spring tilt effect */}
        <DragOverlay>
          {activeDragCand ? (
            <div className="p-3.5 rounded-xl bg-[var(--surface-1)] border border-[#C6FF3D] shadow-2xl rotate-3 scale-105 pointer-events-none text-foreground w-64">
              <div className="font-semibold text-xs text-foreground flex items-center justify-between">
                <span>{activeDragCand.name}</span>
                <span className="text-[#C6FF3D] font-mono text-[11px]">
                  {activeDragCand.match_score?.total_score?.toFixed(0)}%
                </span>
              </div>
              <div className="text-[11px] text-foreground-muted mt-1 font-mono">
                {activeDragCand.total_experience_years} yrs exp • {activeDragCand.location || 'Remote'}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Candidate Profile Drawer */}
      <CandidateDrawer
        candidateId={selectedCandidateId}
        jobId={selectedJobId}
        onClose={() => setSelectedCandidateId(null)}
        onUpdated={loadPipelineData}
      />
    </div>
  );
}
