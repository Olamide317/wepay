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
      className={`bg-white border border-slate-200 rounded-xl ${PAD_CLASSES[padding]} ${className}`}
    >
      {children}
    </div>
  );
};
