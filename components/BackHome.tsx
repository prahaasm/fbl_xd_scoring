import Link from 'next/link';

export default function BackHome() {
  return (
    <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition">
      ← Home
    </Link>
  );
}
