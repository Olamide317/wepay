import React from 'react';

interface ProgressBarProps {
  value: number; // 0 to 100
  tone?: 'brand' | 'success' | 'warning';
  height?: 'sm' | 'md';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  tone = 'brand',
  height = 'md',
}) => {
  const clamped = Math.min(100, Math.max(0, value));
  const barColor =
    tone === 'success' || clamped >= 100
      ? 'bg-teal-600'
      : tone === 'warning'
      ? 'bg-[#f59e08]'
      : 'bg-teal-600';

  const hClass = height === 'sm' ? 'h-1.5' : 'h-2.5';

  return (
    <div
      className={`w-full ${hClass} rounded-full bg-slate-100 overflow-hidden`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-200 ${barColor}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
};
