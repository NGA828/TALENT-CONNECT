export function CompletionRing({ percent, size = 72 }: { percent: number; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Profile ${percent}% complete`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={8} className="stroke-slate-100" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={8} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} className="stroke-accent-600 transition-all" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display font-extrabold text-slate-900" style={{ fontSize: size < 64 ? 13 : 18 }}>{percent}%</span>
    </div>
  );
}
