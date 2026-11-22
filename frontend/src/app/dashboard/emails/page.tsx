'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { apiRequest } from '@/lib/api';
import { EmailTemplate, EmailLog, Candidate } from '@/lib/types';
import {
  Mail, Send, Eye, Edit3, Plus, CheckCircle2, AlertCircle, Clock,
  RefreshCw, Check, Info, Users, Briefcase
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function BulkEmailsPage() {
  const { selectedJobId } = useAppStore();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'campaign' | 'editor' | 'logs'>('campaign');

  // Live preview state
  const [previewSubject, setPreviewSubject] = useState('');
  const [previewBody, setPreviewBody] = useState('');
  const [previewCandidateId, setPreviewCandidateId] = useState<number | null>(null);

  // Template editor state
  const [editorTemplate, setEditorTemplate] = useState<{
    id?: number;
    name: string;
    stage_trigger: string;
    subject: string;
    body_template: string;
  }>({
    name: '',
    stage_trigger: 'Shortlisted',
    subject: '',
    body_template: '',
  });

  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<any>(null);

  const fetchEmailData = async () => {
    try {
      const [tpls, logs, cands] = await Promise.all([
        apiRequest('/emails/templates'),
        apiRequest('/emails/logs?limit=50'),
        apiRequest('/candidates?per_page=100'),
      ]);
      setTemplates(tpls || []);
      setEmailLogs(logs || []);
      setCandidates(cands.items || []);

      if (tpls?.length > 0 && selectedTemplateId === null) {
        setSelectedTemplateId(tpls[0].id);
        setEditorTemplate({
          id: tpls[0].id,
          name: tpls[0].name,
          stage_trigger: tpls[0].stage_trigger || 'Shortlisted',
          subject: tpls[0].subject,
          body_template: tpls[0].body_template,
        });
      }
      if (cands.items?.length > 0 && previewCandidateId === null) {
        setPreviewCandidateId(cands.items[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEmailData();
  }, []);

  // Update live preview when selected template or candidate changes
  useEffect(() => {
    if (!selectedTemplateId || !previewCandidateId) return;

    apiRequest('/emails/preview', {
      method: 'POST',
      body: JSON.stringify({
        template_id: selectedTemplateId,
        candidate_id: previewCandidateId,
        job_id: selectedJobId,
      }),
    })
      .then((res) => {
        setPreviewSubject(res.subject);
        setPreviewBody(res.body);
      })
      .catch((err) => console.error('Preview error:', err));
  }, [selectedTemplateId, previewCandidateId, selectedJobId]);

  const handleSelectTemplate = (tpl: EmailTemplate) => {
    setSelectedTemplateId(tpl.id);
    setEditorTemplate({
      id: tpl.id,
      name: tpl.name,
      stage_trigger: tpl.stage_trigger || 'Shortlisted',
      subject: tpl.subject,
      body_template: tpl.body_template,
    });
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editorTemplate.id) {
        await apiRequest(`/emails/templates/${editorTemplate.id}`, {
          method: 'PUT',
          body: JSON.stringify(editorTemplate),
        });
      } else {
        await apiRequest('/emails/templates', {
          method: 'POST',
          body: JSON.stringify(editorTemplate),
        });
      }
      alert('Template saved successfully!');
      fetchEmailData();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    }
  };

  const handleSendCampaign = async (dryRun: boolean) => {
    if (selectedCandidateIds.length === 0) {
      alert('Please select at least one recipient candidate.');
      return;
    }
    if (!selectedTemplateId) {
      alert('Please select an email template.');
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const res = await apiRequest('/emails/send', {
        method: 'POST',
        body: JSON.stringify({
          candidate_ids: selectedCandidateIds,
          template_id: selectedTemplateId,
          job_id: selectedJobId,
          dry_run: dryRun,
        }),
      });
      setSendResult(res);
      fetchEmailData();
    } catch (err: any) {
      alert(`Send failed: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const currentTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#C6FF3D] uppercase tracking-wider mb-1">
            <Mail className="w-3.5 h-3.5" /> Stage-Triggered Outreach Engine
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-display">
            Bulk Candidate Email Campaigns
          </h1>
          <p className="text-xs text-foreground-muted mt-1">
            Personalize stage outreach with template variables. Equipped with high-safety DRY-RUN simulation mode.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--surface-1)] hairline-border text-xs">
          <button
            onClick={() => setActiveTab('campaign')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === 'campaign'
                ? 'bg-[#C6FF3D] text-[#0B0B0A] font-semibold'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            Campaign Dispatch
          </button>
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === 'editor'
                ? 'bg-[#C6FF3D] text-[#0B0B0A] font-semibold'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            Template Editor
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-[#C6FF3D] text-[#0B0B0A] font-semibold'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            Audit Logs ({emailLogs.length})
          </button>
        </div>
      </div>

      {activeTab === 'campaign' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Choose Template & Select Candidates */}
          <div className="space-y-5 lg:col-span-1">
            {/* Step 1: Template Picker */}
            <div className="p-5 rounded-2xl bg-[var(--surface-1)] hairline-border space-y-3">
              <label className="text-xs font-mono uppercase text-foreground-muted font-semibold flex items-center justify-between">
                <span>1. Select Stage Template</span>
                <span className="text-[10px] text-[#C6FF3D]">{templates.length} available</span>
              </label>

              <div className="space-y-1.5">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl)}
                    className={`w-full p-3 rounded-xl text-left border transition-all text-xs cursor-pointer ${
                      selectedTemplateId === tpl.id
                        ? 'border-[#C6FF3D] bg-[var(--surface-2)] shadow-sm'
                        : 'border-[var(--border)] bg-[var(--surface-2)]/40 hover:bg-[var(--surface-2)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{tpl.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--surface-3)] text-foreground-muted">
                        {tpl.stage_trigger || 'General'}
                      </span>
                    </div>
                    <div className="text-[11px] text-foreground-muted truncate mt-1">
                      {tpl.subject}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Recipients Selection */}
            <div className="p-5 rounded-2xl bg-[var(--surface-1)] hairline-border space-y-3">
              <div className="flex items-center justify-between text-xs font-mono uppercase text-foreground-muted">
                <span>2. Select Recipients ({selectedCandidateIds.length})</span>
                <button
                  onClick={() => {
                    if (selectedCandidateIds.length === candidates.length) {
                      setSelectedCandidateIds([]);
                    } else {
                      setSelectedCandidateIds(candidates.map((c) => c.id));
                    }
                  }}
                  className="text-[#C6FF3D] hover:underline"
                >
                  {selectedCandidateIds.length === candidates.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                {candidates.map((cand) => {
                  const isChecked = selectedCandidateIds.includes(cand.id);
                  return (
                    <div
                      key={cand.id}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedCandidateIds(selectedCandidateIds.filter((id) => id !== cand.id));
                        } else {
                          setSelectedCandidateIds([...selectedCandidateIds, cand.id]);
                        }
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors cursor-pointer text-xs ${
                        isChecked
                          ? 'border-[#C6FF3D]/50 bg-[var(--surface-2)] text-foreground'
                          : 'border-[var(--border)] bg-[var(--surface-2)]/30 text-foreground-muted hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-medium text-foreground">{cand.name}</span>
                        <span className="text-[10px] font-mono text-foreground-muted">({cand.current_stage})</span>
                      </div>
                      <span className="text-[10px] font-mono text-foreground-muted">
                        {cand.email || 'No email'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Live Variable Preview & Send Control */}
          <div className="p-6 rounded-2xl bg-[var(--surface-1)] hairline-border space-y-5 lg:col-span-2 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#C6FF3D]" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Live Rendered Preview with Dynamic Variables
                  </h3>
                </div>

                {/* Candidate preview selector */}
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-foreground-muted">Preview for:</span>
                  <select
                    value={previewCandidateId || ''}
                    onChange={(e) => setPreviewCandidateId(Number(e.target.value))}
                    className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2.5 py-1 text-xs text-foreground font-mono focus:outline-none"
                  >
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Rendered Subject */}
              <div className="space-y-1 text-xs">
                <label className="text-[10px] font-mono uppercase text-foreground-muted">
                  Subject Line:
                </label>
                <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] font-semibold text-foreground">
                  {previewSubject || 'Select a template to generate subject preview'}
                </div>
              </div>

              {/* Rendered Body */}
              <div className="space-y-1 text-xs">
                <label className="text-[10px] font-mono uppercase text-foreground-muted">
                  Rendered Email Body:
                </label>
                <pre className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-foreground/90 whitespace-pre-wrap font-sans text-xs leading-relaxed min-h-[220px]">
                  {previewBody || 'Select a template to generate message preview'}
                </pre>
              </div>

              {/* Supported template variables note */}
              <div className="p-3 rounded-xl bg-[var(--surface-2)]/50 border border-[var(--border)] text-[11px] font-mono text-foreground-muted flex items-center justify-between">
                <span>Variables: {'{{name}}'}, {'{{job_title}}'}, {'{{company}}'}, {'{{date}}'}</span>
                <span className="text-[#C6FF3D]">Auto-Replaced</span>
              </div>

              {/* Feedback Alert if campaign sent */}
              {sendResult && (
                <div className="p-3.5 rounded-xl bg-[#C6FF3D]/10 border border-[#C6FF3D]/30 text-xs text-[#C6FF3D] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{sendResult.message}</span>
                </div>
              )}
            </div>

            {/* Bottom Actions: Dry Run vs Live Dispatch */}
            <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between gap-4">
              <div className="text-xs text-foreground-muted font-mono flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                <span>Dry-run logs messages locally without sending real emails.</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  disabled={isSending || selectedCandidateIds.length === 0}
                  onClick={() => handleSendCampaign(true)}
                  className="px-4 py-2 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] hairline-border text-foreground text-xs font-semibold disabled:opacity-40 flex items-center gap-2 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Simulate (DRY RUN)</span>
                </button>

                <button
                  disabled={isSending || selectedCandidateIds.length === 0}
                  onClick={() => handleSendCampaign(false)}
                  className="px-5 py-2 rounded-xl bg-[#C6FF3D] text-[#0B0B0A] text-xs font-semibold hover:bg-[#D4FF66] disabled:opacity-40 flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Campaign ({selectedCandidateIds.length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'editor' && (
        <div className="p-6 rounded-2xl bg-[var(--surface-1)] hairline-border max-w-3xl mx-auto space-y-5">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-[#C6FF3D]" />
              Email Template Editor
            </h3>
            <button
              onClick={() =>
                setEditorTemplate({
                  name: 'New Custom Template',
                  stage_trigger: 'Interview',
                  subject: 'Interview Update: {{job_title}} at {{company}}',
                  body_template: 'Hi {{name}},\n\nWe look forward to speaking with you.\n\nBest regards,\n{{company}}',
                })
              }
              className="text-xs font-mono text-[#C6FF3D] hover:underline"
            >
              + Create Blank Template
            </button>
          </div>

          <form onSubmit={handleSaveTemplate} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-foreground-muted font-mono uppercase text-[10px]">
                  Template Name
                </label>
                <input
                  type="text"
                  required
                  value={editorTemplate.name}
                  onChange={(e) => setEditorTemplate({ ...editorTemplate, name: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-foreground font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-foreground-muted font-mono uppercase text-[10px]">
                  Associated Pipeline Stage
                </label>
                <select
                  value={editorTemplate.stage_trigger}
                  onChange={(e) => setEditorTemplate({ ...editorTemplate, stage_trigger: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-foreground font-mono"
                >
                  <option value="Applied">Applied</option>
                  <option value="Shortlisted">Shortlisted</option>
                  <option value="Interview">Interview</option>
                  <option value="Offer">Offer</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-foreground-muted font-mono uppercase text-[10px]">
                Email Subject Line
              </label>
              <input
                type="text"
                required
                value={editorTemplate.subject}
                onChange={(e) => setEditorTemplate({ ...editorTemplate, subject: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-foreground font-semibold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-foreground-muted font-mono uppercase text-[10px]">
                Email Body Template
              </label>
              <textarea
                rows={10}
                required
                value={editorTemplate.body_template}
                onChange={(e) => setEditorTemplate({ ...editorTemplate, body_template: e.target.value })}
                className="w-full p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-foreground font-mono text-xs leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#C6FF3D] text-[#0B0B0A] font-semibold text-xs hover:bg-[#D4FF66]"
              >
                Save Template
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="rounded-2xl bg-[var(--surface-1)] hairline-border overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase text-foreground-muted font-semibold">
              Recent Email Campaign Dispatches & Audit Log ({emailLogs.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse font-mono">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/60 text-foreground-muted uppercase text-[11px]">
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Template / Subject</th>
                  <th className="py-3 px-4">Mode / Status</th>
                  <th className="py-3 px-4">Sent Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {emailLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-foreground-muted">
                      No emails sent yet. Run a campaign to populate audit logs.
                    </td>
                  </tr>
                ) : (
                  emailLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[var(--surface-2)]/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {log.recipient_email}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-foreground">{log.subject}</div>
                        <div className="text-[10px] text-foreground-muted">{log.template_name || 'Direct'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.status === 'sent'
                              ? 'bg-[#4ADE80]/10 text-[#4ADE80]'
                              : log.status === 'dry_run'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {log.status === 'sent' && <CheckCircle2 className="w-3 h-3" />}
                          {log.status === 'dry_run' && <Clock className="w-3 h-3" />}
                          {log.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-foreground-muted">
                        {new Date(log.sent_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
