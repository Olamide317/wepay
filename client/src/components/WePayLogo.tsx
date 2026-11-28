import React from 'react';

interface WePayLogoProps {
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
}

export const WePayLogo: React.FC<WePayLogoProps> = ({ variant = 'dark', size = 'md' }) => {
  const iconSize = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-9 w-9' : 'h-8 w-8';
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';
  const textColor = variant === 'light' ? 'text-white' : 'text-slate-900';

  return (
    <span className="inline-flex items-center gap-2.5 select-none whitespace-nowrap shrink-0">
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconSize} shrink-0`}
        aria-hidden="true"
      >
        <rect width="36" height="36" rx="9" fill="#0f766e" />
        {/* Interlocking collective nodes symbolizing group pooling and unified flow */}
        <path
          d="M9.5 13L13.5 23L18 14.5L22.5 23L26.5 13"
          stroke="#FFFFFF"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="18" cy="10" r="1.75" fill="#f59e08" />
      </svg>
      <span className={`font-display font-bold tracking-tight ${textSize} ${textColor}`}>
        WePay
      </span>
    </span>
  );
};
