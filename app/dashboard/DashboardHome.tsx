'use client';

import Link from 'next/link';

export default function DashboardHome() {
  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <main className="flex-1 mx-auto w-full max-w-md px-4 py-6 pb-10">
      <h1 className="text-2xl font-black text-white mb-6 text-center">Admin Dashboard</h1>
      <div className="grid gap-3">
        <Link href="/dashboard/tournaments" className="btn-primary text-center">
          Tournaments
        </Link>
        <button onClick={logout} className="btn-secondary">
          Logout
        </button>
      </div>
    </main>
  );
}
