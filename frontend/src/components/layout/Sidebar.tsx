'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { apiRequest } from '@/lib/api';
import {
  LayoutDashboard, Users, GitPullRequest, Briefcase, Mail, Copy,
  UploadCloud, Sparkles, LogOut, ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Candidates', href: '/dashboard/candidates', icon: Users },
  { name: 'Pipeline', href: '/dashboard/pipeline', icon: GitPullRequest },
  { name: 'Job Descriptions', href: '/dashboard/jobs', icon: Briefcase },
  { name: 'Bulk Emails', href: '/dashboard/emails', icon: Mail },
  { name: 'Duplicate Matrix', href: '/dashboard/duplicates', icon: Copy },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { setUploadModalOpen, user, setUser } = useAppStore();
  const [isSeeding, setIsSeeding] = React.useState(false);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await apiRequest('/seed/sample-data', { method: 'POST' });
      window.location.reload();
    } catch (err: any) {
      alert(`Seeding failed: ${err.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('talentlens_token');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <aside className="w-64 h-screen sticky top-0 flex flex-col justify-between bg-[var(--surface-1)] hairline-border-r select-none z-30 shrink-0">
      {/* Brand logo & wordmark */}
      <div>
        <div className="h-16 px-6 flex items-center justify-between hairline-border-b">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C6FF3D] to-[#8BC34A] flex items-center justify-center text-[#0B0B0A] font-bold text-sm shadow-md group-hover:scale-105 transition-transform">
              TL
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-foreground font-display flex items-center gap-1.5">
                TalentLens
                <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded bg-[var(--surface-3)] text-[#C6FF3D]">
                  PRO
                </span>
              </div>
              <div className="text-[10px] text-foreground-muted font-mono leading-none">
                Precision AI Hiring
              </div>
            </div>
          </Link>
        </div>

        {/* Primary Action Button */}
        <div className="p-4">
          <button
            onClick={() => setUploadModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#C6FF3D] text-[#0B0B0A] text-xs font-semibold hover:bg-[#D4FF66] transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Bulk Upload Resumes</span>
          </button>
        </div>

        {/* Nav Links */}
        <nav className="px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? 'text-foreground bg-[var(--surface-2)] shadow-sm'
                    : 'text-foreground-muted hover:text-foreground hover:bg-[var(--surface-2)]/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-[#C6FF3D]' : 'text-foreground-muted group-hover:text-foreground'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>

                {isActive && (
                  <motion.div
                    layoutId="active-indicator"
                    className="w-1.5 h-1.5 rounded-full bg-[#C6FF3D]"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / Demo Account / Seed button */}
      <div className="p-4 space-y-3 hairline-border-t bg-[var(--surface-1)]">
        {/* Sample data seed button */}
        <button
          onClick={handleSeed}
          disabled={isSeeding}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-foreground-muted hover:text-foreground hairline-border transition-colors group cursor-pointer disabled:opacity-50"
          title="Generates 40 realistic candidates & 2 JDs with full scoring"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#FF5B2E] group-hover:rotate-12 transition-transform" />
            <span className="font-mono text-[11px]">{isSeeding ? 'Seeding Data...' : 'Load Sample Data'}</span>
          </div>
          <span className="text-[10px] text-foreground-muted font-mono bg-[var(--surface-1)] px-1.5 py-0.5 rounded">
            ~40
          </span>
        </button>

        {/* User Card */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--surface-2)]/50 hairline-border">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-7 h-7 rounded-lg bg-[var(--surface-3)] flex items-center justify-center text-xs font-mono font-bold text-[#C6FF3D]">
              {(user?.full_name || 'AM').slice(0, 2).toUpperCase()}
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-foreground truncate">
                {user?.full_name || 'Alex Mercer'}
              </div>
              <div className="text-[10px] text-foreground-muted truncate font-mono">
                {user?.company_name || 'Apex AI Labs'}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1 text-foreground-muted hover:text-red-400 rounded transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
