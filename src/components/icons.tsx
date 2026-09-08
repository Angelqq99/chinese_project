import React from 'react';

type P = React.SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 20) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
});

export const IconBack = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M15 5l-7 7 7 7" /></svg>
);
export const IconChevron = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M9 5l7 7-7 7" /></svg>
);
export const IconPlay = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M7 4.5l12 7.5-12 7.5z" /></svg>
);
export const IconReplay = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>
);
export const IconUndo = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M8 5L3 10l5 5" /><path d="M3 10h11a6 6 0 0 1 0 12h-4" transform="translate(0,-2)" /></svg>
);
export const IconTrash = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M4 7h16M10 4h4M6.5 7l1 13h9l1-13M10 11v6M14 11v6" /></svg>
);
export const IconBulb = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 1 3.7 10.7c-.6.5-.7 1.3-.7 2.3h-6c0-1-.1-1.8-.7-2.3A6 6 0 0 1 12 3z" /></svg>
);
export const IconSpeaker = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M4 9v6h4l6 5V4L8 9H4z" /><path d="M17.5 8.5a5 5 0 0 1 0 7M20 6a9 9 0 0 1 0 12" /></svg>
);
export const IconSun = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5 5l1.7 1.7M17.3 17.3L19 19M19 5l-1.7 1.7M6.7 17.3L5 19" /></svg>
);
export const IconMoon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M20 13.5A8.5 8.5 0 0 1 10.5 4 8.5 8.5 0 1 0 20 13.5z" /></svg>
);
export const IconWifiOff = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M2 8.5a15 15 0 0 1 6.2-3.4M12.5 5.2A15 15 0 0 1 22 8.5M5.3 12.5a10 10 0 0 1 5-2.3M14.8 10.6a10 10 0 0 1 3.9 1.9M8.5 16.2a5.5 5.5 0 0 1 7 0" /><circle cx="12" cy="19.5" r="1" fill="currentColor" stroke="none" /><path d="M3 3l18 18" /></svg>
);
export const IconEye = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></svg>
);
export const IconBrush = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M20 4c-4 1-9 5-11.5 9.5L6 16l2.5 2.5L11 16C15.5 13.5 19.5 8.5 20 4z" /><path d="M6.5 16.5c-1.8.6-2.4 2-2.5 3.9 2.7 0 4.5-.7 5.3-2.6" /></svg>
);
export const IconCheck = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M4.5 12.5l5 5L19.5 7" /></svg>
);

/* ---------- звёзды ---------- */

export const IconStar = ({ size = 22, filled = false, ...p }: P & { filled?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor" strokeWidth={filled ? 0 : 1.6} strokeLinejoin="round" {...p}>
    <path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5L2.5 9.5l6.6-.9z" />
  </svg>
);
export const IconDice: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8" cy="8" r="1" />
    <circle cx="16" cy="8" r="1" />
    <circle cx="8" cy="16" r="1" />
    <circle cx="16" cy="16" r="1" />
    <circle cx="12" cy="12" r="1" />
  </svg>
);

export function StarRow({ n, size = 30, animate = false }: { n: number; size?: number; animate?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={i < n ? 'text-seal dark:text-ember' : 'text-line dark:text-mist'}
          style={animate && i < n ? { animation: `pop-in .5s cubic-bezier(.34,1.56,.64,1) ${0.25 + i * 0.22}s both` } : undefined}
        >
          <IconStar size={size} filled={i < n} />
        </span>
      ))}
    </div>
  );
}
