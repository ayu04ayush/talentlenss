'use client';

import React, { useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import CommandPalette from '@/components/common/CommandPalette';
import UploadModal from '@/components/upload/UploadModal';
import { useAppStore } from '@/lib/store';
import { apiRequest } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { setUser } = useAppStore();

  useEffect(() => {
    // Check current authenticated recruiter session
    apiRequest('/auth/me')
      .then((u) => setUser(u))
      .catch((err) => {
        // Fallback for seamless demo testing if not logged in
        console.warn('Auth check fallback to demo:', err);
      });
  }, [setUser]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--background)] text-foreground">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-grid bg-noise relative">
          {children}
        </main>
      </div>

      {/* Global Modals */}
      <CommandPalette />
      <UploadModal />
    </div>
  );
}
