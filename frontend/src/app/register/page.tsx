'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRequest, setAuthToken } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { ArrowRight, Lock, Mail, User as UserIcon, Building } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useAppStore();
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          full_name: fullName,
          company_name: companyName,
          email,
          password,
        }),
      });
      setAuthToken(res.access_token);
      setUser(res.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-grid bg-noise relative text-foreground">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md p-8 rounded-3xl bg-[var(--surface-1)] border border-[var(--border-strong)] shadow-2xl space-y-6 relative z-10"
      >
        <div className="space-y-2 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C6FF3D] to-[#8BC34A] flex items-center justify-center text-[#0B0B0A] font-bold text-lg mx-auto shadow-md">
            TL
          </div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">
            Create Recruiter Workspace
          </h1>
          <p className="text-xs text-foreground-muted">
            Start screening hundreds of resumes in seconds with hybrid AI precision
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-foreground-muted font-mono uppercase text-[10px]">
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
              <input
                type="text"
                required
                placeholder="e.g. Jordan Hayes"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-2.5 pl-9 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-foreground focus:outline-none focus:border-[#C6FF3D]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-foreground-muted font-mono uppercase text-[10px]">
              Company / Team Name
            </label>
            <div className="relative">
              <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
              <input
                type="text"
                placeholder="e.g. Apex Systems"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full p-2.5 pl-9 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-foreground focus:outline-none focus:border-[#C6FF3D]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-foreground-muted font-mono uppercase text-[10px]">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
              <input
                type="email"
                required
                placeholder="jordan@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 pl-9 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-foreground focus:outline-none focus:border-[#C6FF3D]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-foreground-muted font-mono uppercase text-[10px]">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2.5 pl-9 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-foreground focus:outline-none focus:border-[#C6FF3D]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[#C6FF3D] text-[#0B0B0A] font-semibold text-xs hover:bg-[#D4FF66] transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{loading ? 'Creating Workspace...' : 'Launch Workspace'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-foreground-muted font-mono">
          Already have an account?{' '}
          <Link href="/login" className="text-[#C6FF3D] hover:underline font-semibold">
            Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
