/* ── Nearbuy brand mark (green pin + plant + magnifier) ────── */
export const BrandMark = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
    <path d="M20 4c-6.1 0-11 4.9-11 11 0 7.5 11 21 11 21s11-13.5 11-21c0-6.1-4.9-11-11-11z" fill="currentColor" />
    <circle cx="20" cy="14.5" r="6.6" fill="#fff" />
    <rect x="16.4" y="12.4" width="1.9" height="5" rx=".5" fill="#4f7a5c" />
    <rect x="19.1" y="10.6" width="1.9" height="6.8" rx=".5" fill="#A1BE95" />
    <rect x="21.8" y="13.4" width="1.9" height="4" rx=".5" fill="#4f7a5c" />
    <path d="M24.9 19.3l3.4 3.4" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
  </svg>
);

interface BrandLockupProps {
  /** Context pill next to the wordmark, e.g. "Admin" / "Business". */
  label?: string;
  subtitle?: string;
  chip?: string;
  mark?: string;
}

/* ── Branded logo lockup: mark chip + wordmark + context pill ─── */
export const BrandLockup = ({ label = "Admin", subtitle, chip = "w-8 h-8", mark = "w-5 h-5" }: BrandLockupProps) => (
  <>
    <div className={`${chip} rounded-[10px] bg-white flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(31,58,46,0.18)] ring-1 ring-black/5`}>
      <BrandMark className={`${mark} text-primary`} />
    </div>
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-extrabold text-foreground tracking-tight leading-none">Nearbuy</span>
        <span className="text-[8px] font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-1 py-0.5 rounded leading-none">{label}</span>
      </div>
      {subtitle && <p className="text-[9.5px] text-muted-foreground font-medium mt-1 leading-none">{subtitle}</p>}
    </div>
  </>
);
