'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiRequest, setAuthToken } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { ArrowRight, Lock, Mail, Sparkles, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAppStore();
  const [email, setEmail] = useState('demo@talentlens.io');
  const [password, setPassword] = useState('talentlens123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setAuthToken(res.access_token);
      setUser(res.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('demo@talentlens.io');
    setPassword('talentlens123');
    setLoading(true);
    setError('');

    try {
      // First ensure demo account exists by hitting seed or direct login
      try {
        await apiRequest('/seed/sample-data', { method: 'POST' });
      } catch {}

      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'demo@talentlens.io', password: 'talentlens123' }),
      });
      setAuthToken(res.access_token);
      setUser(res.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
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
        {/* Brand Header */}
        <div className="space-y-2 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C6FF3D] to-[#8BC34A] flex items-center justify-center text-[#0B0B0A] font-bold text-lg mx-auto shadow-md">
            TL
          </div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">
            Sign In to TalentLens
          </h1>
          <p className="text-xs text-foreground-muted">
            Mission control for technical recruitment and candidate evaluation
          </p>
        </div>

        {/* Demo Fast Login Banner */}
        <button
          onClick={handleDemoLogin}
          type="button"
          className="w-full p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[#C6FF3D]/40 hover:border-[#C6FF3D] text-left flex items-center justify-between group transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#C6FF3D]/10 text-[#C6FF3D]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground group-hover:text-[#C6FF3D] transition-colors">
                1-Click Demo Recruiter Login
              </div>
              <div className="text-[10px] text-foreground-muted font-mono">
                Preloaded with 40 candidates, 2 JDs, & scores
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#C6FF3D] group-hover:translate-x-1 transition-transform" />
        </button>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-mono">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-foreground-muted font-mono uppercase text-[10px]">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
              <input
                type="email"
                required
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
            <span>{loading ? 'Authenticating...' : 'Sign In with Credentials'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-foreground-muted font-mono">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-[#C6FF3D] hover:underline font-semibold">
            Create Recruiter Account
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
