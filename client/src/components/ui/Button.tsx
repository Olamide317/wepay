import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'payment' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-[#0f766e] text-white hover:bg-[#0d6962] active:bg-[#115e59] border border-[#0f766e]',
  secondary:
    'bg-slate-700 text-white hover:bg-slate-800 active:bg-slate-900 border border-slate-700',
  payment:
    'bg-[#f59e08] text-[#0f172a] hover:bg-[#d97706] active:bg-[#b45309] border border-[#f59e08]',
  outline:
    'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950 border border-slate-200',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950 border border-transparent',
  danger:
    'bg-red-700 text-white hover:bg-red-800 active:bg-red-900 border border-red-700',
};

const SIZE_CLASSES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-9 px-3.5 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-sm gap-2 rounded-lg',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center font-semibold transition-[transform,background-color,border-color,color] duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 active:scale-[0.97] disabled:scale-100 disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />}
      {children}
    </button>
  );
};
