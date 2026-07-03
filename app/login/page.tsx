'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BackHome from '@/components/BackHome';

const ROLE_REDIRECT: Record<string, string> = {
  admin: '/dashboard',
  court1: '/court/1',
  court2: '/court/2',
  court3: '/court/3',
};

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Login failed');
        return;
      }
      router.push(ROLE_REDIRECT[data.role] ?? '/');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col justify-center mx-auto w-full max-w-sm px-6 py-10">
      <div className="mb-8">
        <BackHome />
      </div>

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 mb-4">
          <span className="text-2xl">🏸</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-1">FBL XD Tournament</h1>
        <p className="text-sm text-slate-400">Sign in to continue</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Username</label>
          <input
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-base text-slate-100 placeholder-slate-600 focus:outline-none focus:border-green-500 transition"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
            autoComplete="username"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
          <input
            type="password"
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-base text-slate-100 placeholder-slate-600 focus:outline-none focus:border-green-500 transition"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2">
            <p className="text-red-400 text-sm font-medium">{error}</p>
          </div>
        )}
        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </main>
  );
}
