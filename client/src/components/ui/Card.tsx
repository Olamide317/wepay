import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const PAD_CLASSES: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
};

export const Card: React.FC<CardProps> = ({ children, className = '', padding = 'md' }) => {
  return (
    <div
      className={`bg-white border border-slate-200/90 rounded-2xl shadow-[0_20px_56px_-18px_rgba(15,23,42,0.42)] ${PAD_CLASSES[padding]} ${className}`}
    >
      {children}
    </div>
  );
};
